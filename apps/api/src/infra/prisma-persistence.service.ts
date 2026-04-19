import { Injectable, Logger } from "@nestjs/common";
import type { Order, OrderItem, PaymentRecord, Shipment } from "../domain/types";
import { PrismaService } from "./prisma.service";

@Injectable()
export class PrismaPersistenceService {
  private readonly logger = new Logger(PrismaPersistenceService.name);

  constructor(private readonly prisma: PrismaService) {}

  async persistOrder(order: Order, items: OrderItem[]): Promise<void> {
    if (!this.prisma.enabled) return;
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

  async persistOrderStatus(order: Order): Promise<void> {
    if (!this.prisma.enabled) return;
    await this.prisma.order.update({
      where: { id: order.id },
      data: this.mapOrder(order),
    });
  }

  async persistPayment(payment: PaymentRecord): Promise<void> {
    if (!this.prisma.enabled) return;
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

  async persistShipment(shipment: Shipment): Promise<void> {
    if (!this.prisma.enabled) return;
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

  async persistSkuStock(skuId: string, stock: number): Promise<void> {
    if (!this.prisma.enabled) return;
    await this.prisma.productSku
      .update({
        where: { id: skuId },
        data: { stock },
      })
      .catch((err) => this.logger.warn(`persistSkuStock skipped ${skuId}: ${String(err)}`));
  }

  private mapOrder(order: Order) {
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
}
