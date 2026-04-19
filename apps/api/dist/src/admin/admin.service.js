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
exports.AdminService = void 0;
const common_1 = require("@nestjs/common");
const id_1 = require("../common/id");
const store_service_1 = require("../data/store.service");
const prisma_persistence_service_1 = require("../infra/prisma-persistence.service");
const prisma_service_1 = require("../infra/prisma.service");
let AdminService = class AdminService {
    store;
    prisma;
    prismaPersistence;
    constructor(store, prisma, prismaPersistence) {
        this.store = store;
        this.prisma = prisma;
        this.prismaPersistence = prismaPersistence;
    }
    assertRole(admin, allowed) {
        if (!allowed.includes(admin.role)) {
            throw new common_1.ForbiddenException("Role not allowed");
        }
    }
    async dashboardStats() {
        if (this.prisma.enabled) {
            const orders = await this.prisma.order.findMany({
                select: { status: true, payableAmountCents: true },
            });
            const paid = orders.filter((order) => ["paid_pending_shipment", "shipped", "completed"].includes(order.status));
            const products = await this.prisma.product.findMany({
                select: { id: true, title: true, sales: true },
            });
            return {
                totalOrders: orders.length,
                paidOrders: paid.length,
                totalPaidAmountCents: paid.reduce((sum, order) => sum + order.payableAmountCents, 0),
                topProducts: [...products]
                    .sort((a, b) => b.sales - a.sales)
                    .slice(0, 5)
                    .map((product) => ({ id: product.id, title: product.title, sales: product.sales })),
            };
        }
        const paid = this.store.orders.filter((order) => ["paid_pending_shipment", "shipped", "completed"].includes(order.status));
        return {
            totalOrders: this.store.orders.length,
            paidOrders: paid.length,
            totalPaidAmountCents: paid.reduce((sum, order) => sum + order.payableAmountCents, 0),
            topProducts: [...this.store.products]
                .sort((a, b) => b.sales - a.sales)
                .slice(0, 5)
                .map((product) => ({ id: product.id, title: product.title, sales: product.sales })),
        };
    }
    async listProducts() {
        if (this.prisma.enabled) {
            const products = await this.prisma.product.findMany({
                include: { skus: true },
            });
            return products.map((product) => ({
                id: product.id,
                categoryId: product.categoryId,
                title: product.title,
                subtitle: product.subtitle,
                cover: product.cover,
                images: this.parseImages(product.imagesJson),
                detail: product.detail,
                enabled: product.enabled,
                recommended: product.recommended,
                sales: product.sales,
                skus: product.skus.map((sku) => ({
                    id: sku.id,
                    productId: sku.productId,
                    name: sku.name,
                    priceCents: sku.priceCents,
                    stock: sku.stock,
                    code: sku.code,
                })),
            }));
        }
        return this.store.products.map((product) => ({
            ...product,
            skus: this.store.skus.filter((sku) => sku.productId === product.id),
        }));
    }
    async upsertProduct(input) {
        if (this.prisma.enabled) {
            const id = input.id ?? (0, id_1.genId)("prod");
            await this.prisma.$transaction(async (tx) => {
                await tx.product.upsert({
                    where: { id },
                    create: {
                        id,
                        categoryId: input.categoryId,
                        title: input.title,
                        subtitle: input.subtitle,
                        cover: input.cover,
                        imagesJson: JSON.stringify(input.images ?? []),
                        detail: input.detail,
                        enabled: input.enabled,
                        recommended: input.recommended,
                        sales: 0,
                    },
                    update: {
                        categoryId: input.categoryId,
                        title: input.title,
                        subtitle: input.subtitle,
                        cover: input.cover,
                        imagesJson: JSON.stringify(input.images ?? []),
                        detail: input.detail,
                        enabled: input.enabled,
                        recommended: input.recommended,
                    },
                });
                const nextSkuIds = [];
                for (const skuInput of input.skus) {
                    const skuId = skuInput.id ?? (0, id_1.genId)("sku");
                    nextSkuIds.push(skuId);
                    await tx.productSku.upsert({
                        where: { id: skuId },
                        create: {
                            id: skuId,
                            productId: id,
                            name: skuInput.name,
                            priceCents: skuInput.priceCents,
                            stock: skuInput.stock,
                            code: skuInput.code,
                        },
                        update: {
                            productId: id,
                            name: skuInput.name,
                            priceCents: skuInput.priceCents,
                            stock: skuInput.stock,
                            code: skuInput.code,
                        },
                    });
                }
                await tx.productSku.deleteMany({
                    where: {
                        productId: id,
                        id: { notIn: nextSkuIds.length > 0 ? nextSkuIds : ["__none__"] },
                    },
                });
            });
            const products = await this.listProducts();
            return products.find((candidate) => candidate.id === id);
        }
        const id = input.id ?? (0, id_1.genId)("prod");
        let product = this.store.products.find((candidate) => candidate.id === id);
        if (!product) {
            product = {
                id,
                categoryId: input.categoryId,
                title: input.title,
                subtitle: input.subtitle,
                cover: input.cover,
                images: input.images,
                detail: input.detail,
                enabled: input.enabled,
                recommended: input.recommended,
                sales: 0,
            };
            this.store.products.push(product);
        }
        else {
            Object.assign(product, {
                categoryId: input.categoryId,
                title: input.title,
                subtitle: input.subtitle,
                cover: input.cover,
                images: input.images,
                detail: input.detail,
                enabled: input.enabled,
                recommended: input.recommended,
            });
        }
        const existingSkus = this.store.skus.filter((sku) => sku.productId === id);
        const nextSkuIds = new Set();
        input.skus.forEach((skuInput) => {
            const skuId = skuInput.id ?? (0, id_1.genId)("sku");
            nextSkuIds.add(skuId);
            const current = existingSkus.find((sku) => sku.id === skuId);
            if (current) {
                Object.assign(current, { ...skuInput, id: skuId, productId: id });
            }
            else {
                this.store.skus.push({ ...skuInput, id: skuId, productId: id });
            }
        });
        this.store.skus = this.store.skus.filter((sku) => sku.productId !== id || nextSkuIds.has(sku.id));
        const products = await this.listProducts();
        return products.find((candidate) => candidate.id === id);
    }
    async removeProduct(id) {
        if (this.prisma.enabled) {
            const product = await this.prisma.product.findUnique({ where: { id } });
            if (!product) {
                throw new common_1.NotFoundException("Product not found");
            }
            const orderItemCount = await this.prisma.orderItem.count({ where: { productId: id } });
            if (orderItemCount > 0) {
                throw new common_1.ForbiddenException("Product has related orders and cannot be deleted");
            }
            await this.prisma.$transaction(async (tx) => {
                await tx.cartItem.deleteMany({ where: { productId: id } });
                await tx.productSku.deleteMany({ where: { productId: id } });
                await tx.product.delete({ where: { id } });
            });
            return { success: true };
        }
        const product = this.store.products.find((candidate) => candidate.id === id);
        if (!product) {
            throw new common_1.NotFoundException("Product not found");
        }
        const hasOrderItems = this.store.orderItems.some((item) => item.productId === id);
        if (hasOrderItems) {
            throw new common_1.ForbiddenException("Product has related orders and cannot be deleted");
        }
        this.store.products = this.store.products.filter((candidate) => candidate.id !== id);
        this.store.skus = this.store.skus.filter((candidate) => candidate.productId !== id);
        this.store.cartItems = this.store.cartItems.filter((candidate) => candidate.productId !== id);
        return { success: true };
    }
    async listCategories() {
        if (this.prisma.enabled) {
            return this.prisma.category.findMany({
                orderBy: { sort: "asc" },
            });
        }
        return [...this.store.categories].sort((a, b) => a.sort - b.sort);
    }
    async upsertCategory(input) {
        if (this.prisma.enabled) {
            const id = input.id ?? (0, id_1.genId)("cat");
            return this.prisma.category.upsert({
                where: { id },
                create: {
                    id,
                    name: input.name,
                    parentId: input.parentId ?? null,
                    sort: input.sort,
                    enabled: input.enabled,
                },
                update: {
                    name: input.name,
                    parentId: input.parentId ?? null,
                    sort: input.sort,
                    enabled: input.enabled,
                },
            });
        }
        const id = input.id ?? (0, id_1.genId)("cat");
        const existing = this.store.categories.find((category) => category.id === id);
        if (existing) {
            Object.assign(existing, { ...input, id });
            return existing;
        }
        const category = { id, ...input };
        this.store.categories.push(category);
        return category;
    }
    async removeCategory(id) {
        if (this.prisma.enabled) {
            const category = await this.prisma.category.findUnique({ where: { id } });
            if (!category) {
                throw new common_1.NotFoundException("Category not found");
            }
            const productCount = await this.prisma.product.count({ where: { categoryId: id } });
            if (productCount > 0) {
                throw new common_1.ForbiddenException("Category has products and cannot be deleted");
            }
            await this.prisma.category.delete({ where: { id } });
            return { success: true };
        }
        const category = this.store.categories.find((candidate) => candidate.id === id);
        if (!category) {
            throw new common_1.NotFoundException("Category not found");
        }
        const hasProducts = this.store.products.some((product) => product.categoryId === id);
        if (hasProducts) {
            throw new common_1.ForbiddenException("Category has products and cannot be deleted");
        }
        this.store.categories = this.store.categories.filter((candidate) => candidate.id !== id);
        return { success: true };
    }
    async listOrders() {
        if (this.prisma.enabled) {
            const orders = await this.prisma.order.findMany({
                orderBy: { createdAt: "desc" },
                include: {
                    user: true,
                    items: true,
                    shipments: true,
                },
            });
            return orders.map((order) => ({
                id: order.id,
                orderNo: order.orderNo,
                userId: order.userId,
                addressId: order.addressId,
                status: order.status,
                itemAmountCents: order.itemAmountCents,
                shippingAmountCents: order.shippingAmountCents,
                payableAmountCents: order.payableAmountCents,
                note: order.note ?? undefined,
                createdAt: order.createdAt.toISOString(),
                paidAt: order.paidAt?.toISOString(),
                cancelledAt: order.cancelledAt?.toISOString(),
                completedAt: order.completedAt?.toISOString(),
                source: order.source,
                paymentDeadlineAt: order.paymentDeadlineAt.toISOString(),
                user: {
                    id: order.user.id,
                    openId: order.user.openId,
                    nickname: order.user.nickname,
                    phone: order.user.phone ?? undefined,
                    createdAt: order.user.createdAt.toISOString(),
                },
                items: order.items.map((item) => ({
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
                shipment: order.shipments
                    .slice()
                    .sort((a, b) => (a.shippedAt < b.shippedAt ? 1 : -1))
                    .map((shipment) => ({
                    id: shipment.id,
                    orderId: shipment.orderId,
                    company: shipment.company,
                    companyCode: shipment.companyCode ?? undefined,
                    trackingNo: shipment.trackingNo,
                    status: shipment.status ?? undefined,
                    tracks: shipment.tracksJson
                        ? JSON.parse(shipment.tracksJson)
                        : undefined,
                    shippedAt: shipment.shippedAt.toISOString(),
                    expectedDeliveryAt: shipment.expectedDeliveryAt?.toISOString(),
                }))[0],
            }));
        }
        return this.store.orders.map((order) => ({
            ...order,
            user: this.store.users.find((user) => user.id === order.userId),
            items: this.store.orderItems.filter((item) => item.orderId === order.id),
            shipment: this.store.shipments.find((shipment) => shipment.orderId === order.id),
        }));
    }
    async markShipped(input) {
        if (this.prisma.enabled) {
            const shipmentId = (0, id_1.genId)("ship");
            const shippedAt = new Date();
            const tracks = [{ time: shippedAt.toISOString(), content: "商家已发货" }];
            await this.prisma.$transaction(async (tx) => {
                const order = await tx.order.findUnique({ where: { id: input.orderId } });
                if (!order) {
                    throw new common_1.NotFoundException("Order not found");
                }
                if (order.status !== "paid_pending_shipment") {
                    throw new common_1.ForbiddenException("Order is not waiting for shipment");
                }
                await tx.order.update({
                    where: { id: order.id },
                    data: { status: "shipped" },
                });
                await tx.shipment.create({
                    data: {
                        id: shipmentId,
                        orderId: order.id,
                        company: input.company,
                        companyCode: input.companyCode ?? null,
                        trackingNo: input.trackingNo,
                        status: "in_transit",
                        tracksJson: JSON.stringify(tracks),
                        shippedAt,
                        expectedDeliveryAt: input.expectedDeliveryAt ? new Date(input.expectedDeliveryAt) : null,
                    },
                });
            });
            const shipment = await this.prisma.shipment.findUnique({ where: { id: shipmentId } });
            if (!shipment) {
                throw new common_1.NotFoundException("Shipment not found");
            }
            return {
                id: shipment.id,
                orderId: shipment.orderId,
                company: shipment.company,
                companyCode: shipment.companyCode ?? undefined,
                trackingNo: shipment.trackingNo,
                status: shipment.status ?? undefined,
                tracks: shipment.tracksJson
                    ? JSON.parse(shipment.tracksJson)
                    : undefined,
                shippedAt: shipment.shippedAt.toISOString(),
                expectedDeliveryAt: shipment.expectedDeliveryAt?.toISOString(),
            };
        }
        const order = this.store.orders.find((candidate) => candidate.id === input.orderId);
        if (!order) {
            throw new common_1.NotFoundException("Order not found");
        }
        if (order.status !== "paid_pending_shipment") {
            throw new common_1.ForbiddenException("Order is not waiting for shipment");
        }
        order.status = "shipped";
        const shipment = {
            id: (0, id_1.genId)("ship"),
            orderId: input.orderId,
            company: input.company,
            companyCode: input.companyCode,
            trackingNo: input.trackingNo,
            status: "in_transit",
            tracks: [{ time: (0, id_1.nowIso)(), content: "商家已发货" }],
            shippedAt: (0, id_1.nowIso)(),
            expectedDeliveryAt: input.expectedDeliveryAt,
        };
        this.store.shipments.push(shipment);
        void this.prismaPersistence.persistShipment(shipment);
        void this.prismaPersistence.persistOrderStatus(order);
        return shipment;
    }
    async appendShipmentTrack(input) {
        const content = input.content?.trim();
        if (!content) {
            throw new common_1.BadRequestException("Track content is required");
        }
        if (this.prisma.enabled) {
            const shipment = await this.prisma.shipment.findFirst({
                where: { orderId: input.orderId },
                orderBy: { shippedAt: "desc" },
            });
            if (!shipment) {
                throw new common_1.NotFoundException("Shipment not found");
            }
            const tracks = shipment.tracksJson
                ? JSON.parse(shipment.tracksJson)
                : [];
            tracks.push({
                time: (0, id_1.nowIso)(),
                content,
                location: input.location?.trim() || undefined,
            });
            const updated = await this.prisma.shipment.update({
                where: { id: shipment.id },
                data: {
                    status: input.status ?? shipment.status ?? "in_transit",
                    tracksJson: JSON.stringify(tracks),
                },
            });
            return {
                id: updated.id,
                orderId: updated.orderId,
                company: updated.company,
                companyCode: updated.companyCode ?? undefined,
                trackingNo: updated.trackingNo,
                status: updated.status ?? undefined,
                tracks,
                shippedAt: updated.shippedAt.toISOString(),
                expectedDeliveryAt: updated.expectedDeliveryAt?.toISOString(),
            };
        }
        const shipment = this.store.shipments
            .filter((candidate) => candidate.orderId === input.orderId)
            .sort((a, b) => (a.shippedAt < b.shippedAt ? 1 : -1))[0];
        if (!shipment) {
            throw new common_1.NotFoundException("Shipment not found");
        }
        if (!shipment.tracks) {
            shipment.tracks = [];
        }
        shipment.tracks.push({
            time: (0, id_1.nowIso)(),
            content,
            location: input.location?.trim() || undefined,
        });
        if (input.status) {
            shipment.status = input.status;
        }
        void this.prismaPersistence.persistShipment(shipment);
        return shipment;
    }
    async listBanners() {
        if (this.prisma.enabled) {
            return this.prisma.banner.findMany({ orderBy: { sort: "asc" } });
        }
        return [...this.store.banners].sort((a, b) => a.sort - b.sort);
    }
    async upsertBanner(input) {
        if (this.prisma.enabled) {
            const id = input.id ?? (0, id_1.genId)("banner");
            return this.prisma.banner.upsert({
                where: { id },
                create: {
                    id,
                    image: input.image,
                    title: input.title,
                    targetType: input.targetType,
                    targetId: input.targetId,
                    sort: input.sort,
                    enabled: input.enabled,
                },
                update: {
                    image: input.image,
                    title: input.title,
                    targetType: input.targetType,
                    targetId: input.targetId,
                    sort: input.sort,
                    enabled: input.enabled,
                },
            });
        }
        const id = input.id ?? (0, id_1.genId)("banner");
        const existing = this.store.banners.find((banner) => banner.id === id);
        if (existing) {
            Object.assign(existing, { ...input, id });
            return existing;
        }
        const banner = { id, ...input };
        this.store.banners.push(banner);
        return banner;
    }
    async removeBanner(id) {
        if (this.prisma.enabled) {
            const banner = await this.prisma.banner.findUnique({ where: { id } });
            if (!banner) {
                throw new common_1.NotFoundException("Banner not found");
            }
            await this.prisma.banner.delete({ where: { id } });
            return { success: true };
        }
        const index = this.store.banners.findIndex((candidate) => candidate.id === id);
        if (index < 0) {
            throw new common_1.NotFoundException("Banner not found");
        }
        this.store.banners.splice(index, 1);
        return { success: true };
    }
    async listUsers() {
        if (this.prisma.enabled) {
            const users = await this.prisma.user.findMany();
            const orders = await this.prisma.order.findMany({
                select: { userId: true, status: true, payableAmountCents: true },
            });
            return users.map((user) => {
                const userOrders = orders.filter((order) => order.userId === user.id);
                return {
                    id: user.id,
                    openId: user.openId,
                    nickname: user.nickname,
                    phone: user.phone ?? undefined,
                    createdAt: user.createdAt.toISOString(),
                    orderCount: userOrders.length,
                    paidAmountCents: userOrders
                        .filter((order) => ["paid_pending_shipment", "shipped", "completed"].includes(order.status))
                        .reduce((sum, order) => sum + order.payableAmountCents, 0),
                };
            });
        }
        return this.store.users.map((user) => ({
            ...user,
            orderCount: this.store.orders.filter((order) => order.userId === user.id).length,
            paidAmountCents: this.store.orders
                .filter((order) => order.userId === user.id && ["paid_pending_shipment", "shipped", "completed"].includes(order.status))
                .reduce((sum, order) => sum + order.payableAmountCents, 0),
        }));
    }
    parseImages(imagesJson) {
        try {
            const parsed = JSON.parse(imagesJson);
            return Array.isArray(parsed) ? parsed.map((i) => String(i)) : [];
        }
        catch {
            return [];
        }
    }
};
exports.AdminService = AdminService;
exports.AdminService = AdminService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [store_service_1.StoreService,
        prisma_service_1.PrismaService,
        prisma_persistence_service_1.PrismaPersistenceService])
], AdminService);
//# sourceMappingURL=admin.service.js.map