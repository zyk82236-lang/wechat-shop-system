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
var PrismaPersistenceService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrismaPersistenceService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("./prisma.service");
let PrismaPersistenceService = PrismaPersistenceService_1 = class PrismaPersistenceService {
    prisma;
    logger = new common_1.Logger(PrismaPersistenceService_1.name);
    constructor(prisma) {
        this.prisma = prisma;
    }
    async persistOrder(order, items) {
        if (!this.prisma.enabled)
            return;
        await this.prisma.order.upsert({
            where: { id: order.id },
            create: {
                ...this.mapOrder(order),
                items: {
                    create: items.map((item) => ({
                        id: item.id,
                        productId: item.productId,
                        skuId: item.skuId,
                        title: item.title,
                        skuName: item.skuName,
                        quantity: item.quantity,
                        priceCents: item.priceCents,
                        amountCents: item.amountCents,
                    })),
                },
            },
            update: this.mapOrder(order),
        });
    }
    async persistOrderStatus(order) {
        if (!this.prisma.enabled)
            return;
        await this.prisma.order.update({
            where: { id: order.id },
            data: this.mapOrder(order),
        });
    }
    async persistPayment(payment) {
        if (!this.prisma.enabled)
            return;
        await this.prisma.paymentRecord.upsert({
            where: { id: payment.id },
            create: {
                id: payment.id,
                orderId: payment.orderId,
                orderNo: payment.orderNo,
                channel: payment.channel,
                amountCents: payment.amountCents,
                transactionId: payment.transactionId,
                status: payment.status,
                rawNotify: payment.rawNotify,
                createdAt: new Date(payment.createdAt),
                updatedAt: new Date(payment.updatedAt),
            },
            update: {
                transactionId: payment.transactionId,
                status: payment.status,
                rawNotify: payment.rawNotify,
                updatedAt: new Date(payment.updatedAt),
            },
        });
    }
    async persistShipment(shipment) {
        if (!this.prisma.enabled)
            return;
        await this.prisma.shipment.upsert({
            where: { id: shipment.id },
            create: {
                id: shipment.id,
                orderId: shipment.orderId,
                company: shipment.company,
                companyCode: shipment.companyCode,
                trackingNo: shipment.trackingNo,
                status: shipment.status,
                tracksJson: shipment.tracks ? JSON.stringify(shipment.tracks) : null,
                shippedAt: new Date(shipment.shippedAt),
                expectedDeliveryAt: shipment.expectedDeliveryAt ? new Date(shipment.expectedDeliveryAt) : null,
            },
            update: {
                company: shipment.company,
                companyCode: shipment.companyCode,
                trackingNo: shipment.trackingNo,
                status: shipment.status,
                tracksJson: shipment.tracks ? JSON.stringify(shipment.tracks) : null,
                shippedAt: new Date(shipment.shippedAt),
                expectedDeliveryAt: shipment.expectedDeliveryAt ? new Date(shipment.expectedDeliveryAt) : null,
            },
        });
    }
    async persistSkuStock(skuId, stock) {
        if (!this.prisma.enabled)
            return;
        await this.prisma.productSku
            .update({
            where: { id: skuId },
            data: { stock },
        })
            .catch((err) => this.logger.warn(`persistSkuStock skipped ${skuId}: ${String(err)}`));
    }
    mapOrder(order) {
        return {
            id: order.id,
            orderNo: order.orderNo,
            userId: order.userId,
            addressId: order.addressId,
            status: order.status,
            itemAmountCents: order.itemAmountCents,
            shippingAmountCents: order.shippingAmountCents,
            payableAmountCents: order.payableAmountCents,
            note: order.note,
            createdAt: new Date(order.createdAt),
            paidAt: order.paidAt ? new Date(order.paidAt) : null,
            cancelledAt: order.cancelledAt ? new Date(order.cancelledAt) : null,
            completedAt: order.completedAt ? new Date(order.completedAt) : null,
            source: order.source,
            paymentDeadlineAt: new Date(order.paymentDeadlineAt),
        };
    }
};
exports.PrismaPersistenceService = PrismaPersistenceService;
exports.PrismaPersistenceService = PrismaPersistenceService = PrismaPersistenceService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], PrismaPersistenceService);
//# sourceMappingURL=prisma-persistence.service.js.map