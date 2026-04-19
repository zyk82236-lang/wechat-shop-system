"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrderService = void 0;
const common_1 = require("@nestjs/common");
const id_1 = require("../common/id");
const store_service_1 = require("../data/store.service");
const prisma_persistence_service_1 = require("../infra/prisma-persistence.service");
const prisma_service_1 = require("../infra/prisma.service");
const redis_service_1 = require("../infra/redis.service");
const PAYMENT_EXPIRE_MINUTES = 30;
let OrderService = class OrderService {
    store;
    redis;
    prisma;
    prismaPersistence;
    constructor(store, redis, prisma, prismaPersistence) {
        this.store = store;
        this.redis = redis;
        this.prisma = prisma;
        this.prismaPersistence = prismaPersistence;
    }
    async listOrders(user) {
        if (this.prisma.enabled) {
            const rows = await this.prisma.order.findMany({
                where: { userId: user.id },
                orderBy: { createdAt: "desc" },
                include: { items: true, shipments: true },
            });
            return rows.map((row) => this.mapOrderWithRelations(row));
        }
        return this.store.orders
            .filter((order) => order.userId === user.id)
            .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
            .map((order) => ({
            ...order,
            items: this.store.orderItems.filter((item) => item.orderId === order.id),
            shipment: this.store.shipments.find((shipment) => shipment.orderId === order.id),
        }));
    }
    async getOrder(user, orderId) {
        if (this.prisma.enabled) {
            const row = await this.prisma.order.findFirst({
                where: { id: orderId, userId: user.id },
                include: { items: true, shipments: true },
            });
            if (!row) {
                throw new common_1.NotFoundException("Order not found");
            }
            return this.mapOrderWithRelations(row);
        }
        const order = this.store.orders.find((candidate) => candidate.id === orderId && candidate.userId === user.id);
        if (!order) {
            throw new common_1.NotFoundException("Order not found");
        }
        return {
            ...order,
            items: this.store.orderItems.filter((item) => item.orderId === order.id),
            shipment: this.store.shipments.find((shipment) => shipment.orderId === order.id),
        };
    }
    async createOrder(user, input) {
        const lockKey = `lock:order:create:${user.id}:${input.source}:${input.addressId}`;
        const acquired = await this.redis.setIfAbsent(lockKey, "1", 8);
        if (!acquired) {
            throw new common_1.BadRequestException("Order submit is duplicated, please retry later");
        }
        if (this.prisma.enabled) {
            return this.createOrderByPrisma(user, input);
        }
        const address = this.store.addresses.find((candidate) => candidate.id === input.addressId && candidate.userId === user.id);
        if (!address) {
            throw new common_1.BadRequestException("Address invalid");
        }
        const snapshot = this.resolveOrderItems(user, input);
        if (snapshot.items.length === 0) {
            throw new common_1.BadRequestException("No items selected");
        }
        snapshot.items.forEach((item) => {
            if (item.sku.stock < item.quantity) {
                throw new common_1.BadRequestException(`SKU ${item.sku.id} stock insufficient`);
            }
        });
        const itemAmountCents = snapshot.items.reduce((sum, item) => sum + item.sku.priceCents * item.quantity, 0);
        const shippingAmountCents = itemAmountCents >= 10000 ? 0 : 1200;
        const payableAmountCents = itemAmountCents + shippingAmountCents;
        const now = new Date();
        const order = {
            id: (0, id_1.genId)("ord"),
            orderNo: (0, id_1.genOrderNo)(),
            userId: user.id,
            addressId: address.id,
            status: "pending_payment",
            itemAmountCents,
            shippingAmountCents,
            payableAmountCents,
            note: input.note?.trim(),
            createdAt: now.toISOString(),
            source: input.source,
            paymentDeadlineAt: new Date(now.getTime() + PAYMENT_EXPIRE_MINUTES * 60_000).toISOString(),
        };
        this.store.orders.push(order);
        const orderItems = [];
        snapshot.items.forEach((item) => {
            const orderItem = {
                id: (0, id_1.genId)("oi"),
                orderId: order.id,
                productId: item.product.id,
                skuId: item.sku.id,
                title: item.product.title,
                skuName: item.sku.name,
                quantity: item.quantity,
                priceCents: item.sku.priceCents,
                amountCents: item.sku.priceCents * item.quantity,
            };
            this.store.orderItems.push(orderItem);
            orderItems.push(orderItem);
            item.sku.stock -= item.quantity;
            item.product.sales += item.quantity;
            void this.prismaPersistence.persistSkuStock(item.sku.id, item.sku.stock);
        });
        if (input.source === "cart") {
            const selectedIds = new Set(snapshot.fromCartIds);
            this.store.cartItems = this.store.cartItems.filter((candidate) => !selectedIds.has(candidate.id));
        }
        void this.prismaPersistence.persistOrder(order, orderItems);
        return this.getOrder(user, order.id);
    }
    async cancelOrder(user, orderId) {
        if (this.prisma.enabled) {
            const order = await this.prisma.order.findFirst({
                where: { id: orderId, userId: user.id },
            });
            if (!order) {
                throw new common_1.NotFoundException("Order not found");
            }
            if (order.status !== "pending_payment") {
                throw new common_1.BadRequestException("Only pending order can be cancelled");
            }
            await this.cancelAndReleaseStockPrisma(order.id);
            return this.getOrder(user, orderId);
        }
        const order = this.store.orders.find((candidate) => candidate.id === orderId && candidate.userId === user.id);
        if (!order) {
            throw new common_1.NotFoundException("Order not found");
        }
        if (order.status !== "pending_payment") {
            throw new common_1.BadRequestException("Only pending order can be cancelled");
        }
        this.cancelAndReleaseStock(order.id);
        void this.prismaPersistence.persistOrderStatus(order);
        return this.getOrder(user, order.id);
    }
    async confirmReceived(user, orderId) {
        if (this.prisma.enabled) {
            const order = await this.prisma.order.findFirst({
                where: { id: orderId, userId: user.id },
            });
            if (!order) {
                throw new common_1.NotFoundException("Order not found");
            }
            if (order.status !== "shipped") {
                throw new common_1.BadRequestException("Order is not shipped");
            }
            await this.prisma.order.update({
                where: { id: order.id },
                data: { status: "completed", completedAt: new Date() },
            });
            return this.getOrder(user, order.id);
        }
        const order = this.store.orders.find((candidate) => candidate.id === orderId && candidate.userId === user.id);
        if (!order) {
            throw new common_1.NotFoundException("Order not found");
        }
        if (order.status !== "shipped") {
            throw new common_1.BadRequestException("Order is not shipped");
        }
        order.status = "completed";
        order.completedAt = (0, id_1.nowIso)();
        void this.prismaPersistence.persistOrderStatus(order);
        return this.getOrder(user, order.id);
    }
    async markPaidByOrderNo(params) {
        if (this.prisma.enabled) {
            const order = await this.prisma.order.findUnique({ where: { orderNo: params.orderNo } });
            if (!order) {
                throw new common_1.NotFoundException("Order not found");
            }
            if (order.status !== "pending_payment") {
                return this.mapOrder(order);
            }
            await this.prisma.order.update({
                where: { id: order.id },
                data: { status: "paid_pending_shipment", paidAt: new Date() },
            });
            const payment = await this.prisma.paymentRecord.findFirst({ where: { orderId: order.id } });
            if (payment) {
                await this.prisma.paymentRecord.update({
                    where: { id: payment.id },
                    data: {
                        status: "paid",
                        transactionId: params.transactionId,
                        updatedAt: new Date(),
                    },
                });
            }
            const latest = await this.prisma.order.findUnique({ where: { id: order.id } });
            if (!latest)
                throw new common_1.NotFoundException("Order not found");
            return this.mapOrder(latest);
        }
        const order = this.store.orders.find((candidate) => candidate.orderNo === params.orderNo);
        if (!order) {
            throw new common_1.NotFoundException("Order not found");
        }
        if (order.status !== "pending_payment") {
            return order;
        }
        order.status = "paid_pending_shipment";
        order.paidAt = (0, id_1.nowIso)();
        const payment = this.store.payments.find((candidate) => candidate.orderId === order.id);
        if (payment) {
            payment.status = "paid";
            payment.transactionId = params.transactionId;
            payment.updatedAt = (0, id_1.nowIso)();
        }
        void this.prismaPersistence.persistOrderStatus(order);
        if (payment)
            void this.prismaPersistence.persistPayment(payment);
        return order;
    }
    async expireUnpaidOrders() {
        if (this.prisma.enabled) {
            const expired = await this.prisma.order.findMany({
                where: {
                    status: "pending_payment",
                    paymentDeadlineAt: { lte: new Date() },
                },
                select: { id: true },
            });
            for (const order of expired) {
                await this.cancelAndReleaseStockPrisma(order.id);
            }
            return { expiredOrderIds: expired.map((order) => order.id) };
        }
        const now = Date.now();
        const expired = this.store.orders.filter((order) => order.status === "pending_payment" && new Date(order.paymentDeadlineAt).getTime() <= now);
        expired.forEach((order) => {
            this.cancelAndReleaseStock(order.id);
        });
        return { expiredOrderIds: expired.map((order) => order.id) };
    }
    async createOrderByPrisma(user, input) {
        const address = await this.prisma.address.findFirst({
            where: { id: input.addressId, userId: user.id },
        });
        if (!address) {
            throw new common_1.BadRequestException("Address invalid");
        }
        const snapshot = await this.resolveOrderItemsPrisma(user, input);
        if (snapshot.items.length === 0) {
            throw new common_1.BadRequestException("No items selected");
        }
        const orderId = (0, id_1.genId)("ord");
        const orderNo = (0, id_1.genOrderNo)();
        const now = new Date();
        const deadline = new Date(now.getTime() + PAYMENT_EXPIRE_MINUTES * 60_000);
        await this.prisma.$transaction(async (tx) => {
            let itemAmountCents = 0;
            const orderItems = [];
            for (const item of snapshot.items) {
                if (item.quantity <= 0) {
                    throw new common_1.BadRequestException("Quantity must be positive");
                }
                const product = await tx.product.findFirst({
                    where: { id: item.productId, enabled: true },
                });
                const sku = await tx.productSku.findFirst({
                    where: { id: item.skuId, productId: item.productId },
                });
                if (!product || !sku) {
                    throw new common_1.BadRequestException("Product or SKU invalid");
                }
                const stockUpdated = await tx.productSku.updateMany({
                    where: { id: sku.id, stock: { gte: item.quantity } },
                    data: { stock: { decrement: item.quantity } },
                });
                if (stockUpdated.count !== 1) {
                    throw new common_1.BadRequestException(`SKU ${sku.id} stock insufficient`);
                }
                await tx.product.update({
                    where: { id: product.id },
                    data: { sales: { increment: item.quantity } },
                });
                const amount = sku.priceCents * item.quantity;
                itemAmountCents += amount;
                orderItems.push({
                    id: (0, id_1.genId)("oi"),
                    orderId,
                    productId: product.id,
                    skuId: sku.id,
                    title: product.title,
                    skuName: sku.name,
                    quantity: item.quantity,
                    priceCents: sku.priceCents,
                    amountCents: amount,
                });
            }
            const shippingAmountCents = itemAmountCents >= 10000 ? 0 : 1200;
            const payableAmountCents = itemAmountCents + shippingAmountCents;
            await tx.order.create({
                data: {
                    id: orderId,
                    orderNo,
                    userId: user.id,
                    addressId: address.id,
                    status: "pending_payment",
                    itemAmountCents,
                    shippingAmountCents,
                    payableAmountCents,
                    note: input.note?.trim() || null,
                    createdAt: now,
                    source: input.source,
                    paymentDeadlineAt: deadline,
                },
            });
            await tx.orderItem.createMany({
                data: orderItems.map((orderItem) => ({
                    id: orderItem.id,
                    orderId: orderItem.orderId,
                    productId: orderItem.productId,
                    skuId: orderItem.skuId,
                    title: orderItem.title,
                    skuName: orderItem.skuName,
                    quantity: orderItem.quantity,
                    priceCents: orderItem.priceCents,
                    amountCents: orderItem.amountCents,
                })),
            });
            if (input.source === "cart") {
                await tx.cartItem.deleteMany({
                    where: { id: { in: snapshot.fromCartIds }, userId: user.id },
                });
            }
        });
        return this.getOrder(user, orderId);
    }
    cancelAndReleaseStock(orderId) {
        const order = this.store.orders.find((candidate) => candidate.id === orderId);
        if (!order || order.status !== "pending_payment") {
            return;
        }
        order.status = "cancelled";
        order.cancelledAt = (0, id_1.nowIso)();
        const items = this.store.orderItems.filter((item) => item.orderId === orderId);
        items.forEach((item) => {
            const sku = this.store.skus.find((candidate) => candidate.id === item.skuId);
            const product = this.store.products.find((candidate) => candidate.id === item.productId);
            if (sku) {
                sku.stock += item.quantity;
                void this.prismaPersistence.persistSkuStock(sku.id, sku.stock);
            }
            if (product) {
                product.sales = Math.max(0, product.sales - item.quantity);
            }
        });
        void this.prismaPersistence.persistOrderStatus(order);
    }
    async cancelAndReleaseStockPrisma(orderId) {
        await this.prisma.$transaction(async (tx) => {
            const order = await tx.order.findUnique({
                where: { id: orderId },
            });
            if (!order || order.status !== "pending_payment") {
                return;
            }
            await tx.order.update({
                where: { id: orderId },
                data: {
                    status: "cancelled",
                    cancelledAt: new Date(),
                },
            });
            const items = await tx.orderItem.findMany({ where: { orderId } });
            for (const item of items) {
                await tx.productSku.update({
                    where: { id: item.skuId },
                    data: { stock: { increment: item.quantity } },
                });
                const product = await tx.product.findUnique({
                    where: { id: item.productId },
                    select: { sales: true },
                });
                if (product) {
                    await tx.product.update({
                        where: { id: item.productId },
                        data: { sales: Math.max(0, product.sales - item.quantity) },
                    });
                }
            }
        });
    }
    resolveOrderItems(user, input) {
        if (input.source === "buy_now") {
            if (!input.buyNowProductId || !input.buyNowSkuId || !input.buyNowQuantity || input.buyNowQuantity <= 0) {
                throw new common_1.BadRequestException("Buy now params invalid");
            }
            const product = this.store.products.find((candidate) => candidate.id === input.buyNowProductId && candidate.enabled);
            const sku = this.store.skus.find((candidate) => candidate.id === input.buyNowSkuId && candidate.productId === input.buyNowProductId);
            if (!product || !sku) {
                throw new common_1.BadRequestException("Product or SKU invalid");
            }
            return { items: [{ product, sku, quantity: input.buyNowQuantity }], fromCartIds: [] };
        }
        const checked = this.store.cartItems.filter((item) => item.userId === user.id && item.checked);
        const items = checked.map((item) => {
            const product = this.store.products.find((candidate) => candidate.id === item.productId && candidate.enabled);
            const sku = this.store.skus.find((candidate) => candidate.id === item.skuId && candidate.productId === item.productId);
            if (!product || !sku) {
                throw new common_1.BadRequestException("Cart has invalid items");
            }
            return { product, sku, quantity: item.quantity, cartId: item.id };
        });
        return { items, fromCartIds: checked.map((item) => item.id) };
    }
    async resolveOrderItemsPrisma(user, input) {
        if (input.source === "buy_now") {
            if (!input.buyNowProductId || !input.buyNowSkuId || !input.buyNowQuantity || input.buyNowQuantity <= 0) {
                throw new common_1.BadRequestException("Buy now params invalid");
            }
            return {
                items: [
                    {
                        productId: input.buyNowProductId,
                        skuId: input.buyNowSkuId,
                        quantity: input.buyNowQuantity,
                    },
                ],
                fromCartIds: [],
            };
        }
        const checked = await this.prisma.cartItem.findMany({
            where: { userId: user.id, checked: true },
        });
        return {
            items: checked.map((item) => ({
                productId: item.productId,
                skuId: item.skuId,
                quantity: item.quantity,
            })),
            fromCartIds: checked.map((item) => item.id),
        };
    }
    mapOrder(row) {
        return {
            id: row.id,
            orderNo: row.orderNo,
            userId: row.userId,
            addressId: row.addressId,
            status: row.status,
            itemAmountCents: row.itemAmountCents,
            shippingAmountCents: row.shippingAmountCents,
            payableAmountCents: row.payableAmountCents,
            note: row.note ?? undefined,
            createdAt: row.createdAt.toISOString(),
            paidAt: row.paidAt?.toISOString(),
            cancelledAt: row.cancelledAt?.toISOString(),
            completedAt: row.completedAt?.toISOString(),
            source: row.source,
            paymentDeadlineAt: row.paymentDeadlineAt.toISOString(),
        };
    }
    mapOrderWithRelations(row) {
        const base = this.mapOrder(row);
        return {
            ...base,
            items: row.items.map((item) => ({
                id: item.id,
                orderId: item.orderId,
                productId: item.productId,
                skuId: item.skuId,
                title: item.title,
                skuName: item.skuName,
                quantity: item.quantity,
                priceCents: item.priceCents,
                amountCents: item.amountCents,
            })),
            shipment: row.shipments
                .slice()
                .sort((a, b) => (a.shippedAt < b.shippedAt ? 1 : -1))
                .map((shipment) => ({
                id: shipment.id,
                orderId: shipment.orderId,
                company: shipment.company,
                companyCode: shipment.companyCode ?? undefined,
                trackingNo: shipment.trackingNo,
                status: shipment.status ?? undefined,
                tracks: shipment.tracksJson ? JSON.parse(shipment.tracksJson) : undefined,
                shippedAt: shipment.shippedAt.toISOString(),
                expectedDeliveryAt: shipment.expectedDeliveryAt?.toISOString(),
            }))[0],
        };
    }
};
exports.OrderService = OrderService;
exports.OrderService = OrderService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [store_service_1.StoreService,
        redis_service_1.RedisService,
        prisma_service_1.PrismaService,
        prisma_persistence_service_1.PrismaPersistenceService])
], OrderService);
//# sourceMappingURL=order.service.js.map