import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { genId, genOrderNo, nowIso } from "../common/id";
import { StoreService } from "../data/store.service";
import { PrismaPersistenceService } from "../infra/prisma-persistence.service";
import { PrismaService } from "../infra/prisma.service";
import { RedisService } from "../infra/redis.service";
import type { Order, OrderItem, User } from "../domain/types";

const PAYMENT_EXPIRE_MINUTES = 30;

export interface CreateOrderInput {
  source: "cart" | "buy_now";
  addressId: string;
  note?: string;
  buyNowSkuId?: string;
  buyNowProductId?: string;
  buyNowQuantity?: number;
}

@Injectable()
export class OrderService {
  constructor(
    private readonly store: StoreService,
    private readonly redis: RedisService,
    private readonly prisma: PrismaService,
    private readonly prismaPersistence: PrismaPersistenceService,
  ) {}

  async listOrders(user: User) {
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

  async getOrder(user: User, orderId: string) {
    if (this.prisma.enabled) {
      const row = await this.prisma.order.findFirst({
        where: { id: orderId, userId: user.id },
        include: { items: true, shipments: true },
      });
      if (!row) {
        throw new NotFoundException("Order not found");
      }
      return this.mapOrderWithRelations(row);
    }

    const order = this.store.orders.find((candidate) => candidate.id === orderId && candidate.userId === user.id);
    if (!order) {
      throw new NotFoundException("Order not found");
    }
    return {
      ...order,
      items: this.store.orderItems.filter((item) => item.orderId === order.id),
      shipment: this.store.shipments.find((shipment) => shipment.orderId === order.id),
    };
  }

  async createOrder(user: User, input: CreateOrderInput) {
    const lockKey = `lock:order:create:${user.id}:${input.source}:${input.addressId}`;
    const acquired = await this.redis.setIfAbsent(lockKey, "1", 8);
    if (!acquired) {
      throw new BadRequestException("Order submit is duplicated, please retry later");
    }

    if (this.prisma.enabled) {
      return this.createOrderByPrisma(user, input);
    }

    const address = this.store.addresses.find((candidate) => candidate.id === input.addressId && candidate.userId === user.id);
    if (!address) {
      throw new BadRequestException("Address invalid");
    }

    const snapshot = this.resolveOrderItems(user, input);
    if (snapshot.items.length === 0) {
      throw new BadRequestException("No items selected");
    }

    snapshot.items.forEach((item) => {
      if (item.sku.stock < item.quantity) {
        throw new BadRequestException(`SKU ${item.sku.id} stock insufficient`);
      }
    });

    const itemAmountCents = snapshot.items.reduce((sum, item) => sum + item.sku.priceCents * item.quantity, 0);
    const shippingAmountCents = itemAmountCents >= 10000 ? 0 : 1200;
    const payableAmountCents = itemAmountCents + shippingAmountCents;
    const now = new Date();
    const order: Order = {
      id: genId("ord"),
      orderNo: genOrderNo(),
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

    const orderItems: OrderItem[] = [];
    snapshot.items.forEach((item) => {
      const orderItem: OrderItem = {
        id: genId("oi"),
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

  async cancelOrder(user: User, orderId: string) {
    if (this.prisma.enabled) {
      const order = await this.prisma.order.findFirst({
        where: { id: orderId, userId: user.id },
      });
      if (!order) {
        throw new NotFoundException("Order not found");
      }
      if (order.status !== "pending_payment") {
        throw new BadRequestException("Only pending order can be cancelled");
      }
      await this.cancelAndReleaseStockPrisma(order.id);
      return this.getOrder(user, orderId);
    }

    const order = this.store.orders.find((candidate) => candidate.id === orderId && candidate.userId === user.id);
    if (!order) {
      throw new NotFoundException("Order not found");
    }
    if (order.status !== "pending_payment") {
      throw new BadRequestException("Only pending order can be cancelled");
    }
    this.cancelAndReleaseStock(order.id);
    void this.prismaPersistence.persistOrderStatus(order);
    return this.getOrder(user, order.id);
  }

  async confirmReceived(user: User, orderId: string) {
    if (this.prisma.enabled) {
      const order = await this.prisma.order.findFirst({
        where: { id: orderId, userId: user.id },
      });
      if (!order) {
        throw new NotFoundException("Order not found");
      }
      if (order.status !== "shipped") {
        throw new BadRequestException("Order is not shipped");
      }
      await this.prisma.order.update({
        where: { id: order.id },
        data: { status: "completed", completedAt: new Date() },
      });
      return this.getOrder(user, order.id);
    }

    const order = this.store.orders.find((candidate) => candidate.id === orderId && candidate.userId === user.id);
    if (!order) {
      throw new NotFoundException("Order not found");
    }
    if (order.status !== "shipped") {
      throw new BadRequestException("Order is not shipped");
    }
    order.status = "completed";
    order.completedAt = nowIso();
    void this.prismaPersistence.persistOrderStatus(order);
    return this.getOrder(user, order.id);
  }

  async markPaidByOrderNo(params: { orderNo: string; transactionId: string }) {
    if (this.prisma.enabled) {
      const order = await this.prisma.order.findUnique({ where: { orderNo: params.orderNo } });
      if (!order) {
        throw new NotFoundException("Order not found");
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
      if (!latest) throw new NotFoundException("Order not found");
      return this.mapOrder(latest);
    }

    const order = this.store.orders.find((candidate) => candidate.orderNo === params.orderNo);
    if (!order) {
      throw new NotFoundException("Order not found");
    }
    if (order.status !== "pending_payment") {
      return order;
    }
    order.status = "paid_pending_shipment";
    order.paidAt = nowIso();
    const payment = this.store.payments.find((candidate) => candidate.orderId === order.id);
    if (payment) {
      payment.status = "paid";
      payment.transactionId = params.transactionId;
      payment.updatedAt = nowIso();
    }
    void this.prismaPersistence.persistOrderStatus(order);
    if (payment) void this.prismaPersistence.persistPayment(payment);
    return order;
  }

  async expireUnpaidOrders(): Promise<{ expiredOrderIds: string[] }> {
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
    const expired = this.store.orders.filter(
      (order) => order.status === "pending_payment" && new Date(order.paymentDeadlineAt).getTime() <= now,
    );
    expired.forEach((order) => {
      this.cancelAndReleaseStock(order.id);
    });
    return { expiredOrderIds: expired.map((order) => order.id) };
  }

  private async createOrderByPrisma(user: User, input: CreateOrderInput) {
    const address = await this.prisma.address.findFirst({
      where: { id: input.addressId, userId: user.id },
    });
    if (!address) {
      throw new BadRequestException("Address invalid");
    }

    const snapshot = await this.resolveOrderItemsPrisma(user, input);
    if (snapshot.items.length === 0) {
      throw new BadRequestException("No items selected");
    }

    const orderId = genId("ord");
    const orderNo = genOrderNo();
    const now = new Date();
    const deadline = new Date(now.getTime() + PAYMENT_EXPIRE_MINUTES * 60_000);

    await this.prisma.$transaction(async (tx) => {
      let itemAmountCents = 0;
      const orderItems: OrderItem[] = [];

      for (const item of snapshot.items) {
        if (item.quantity <= 0) {
          throw new BadRequestException("Quantity must be positive");
        }
        const product = await tx.product.findFirst({
          where: { id: item.productId, enabled: true },
        });
        const sku = await tx.productSku.findFirst({
          where: { id: item.skuId, productId: item.productId },
        });
        if (!product || !sku) {
          throw new BadRequestException("Product or SKU invalid");
        }
        const stockUpdated = await tx.productSku.updateMany({
          where: { id: sku.id, stock: { gte: item.quantity } },
          data: { stock: { decrement: item.quantity } },
        });
        if (stockUpdated.count !== 1) {
          throw new BadRequestException(`SKU ${sku.id} stock insufficient`);
        }
        await tx.product.update({
          where: { id: product.id },
          data: { sales: { increment: item.quantity } },
        });

        const amount = sku.priceCents * item.quantity;
        itemAmountCents += amount;
        orderItems.push({
          id: genId("oi"),
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

  private cancelAndReleaseStock(orderId: string): void {
    const order = this.store.orders.find((candidate) => candidate.id === orderId);
    if (!order || order.status !== "pending_payment") {
      return;
    }
    order.status = "cancelled";
    order.cancelledAt = nowIso();
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

  private async cancelAndReleaseStockPrisma(orderId: string): Promise<void> {
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

  private resolveOrderItems(user: User, input: CreateOrderInput) {
    if (input.source === "buy_now") {
      if (!input.buyNowProductId || !input.buyNowSkuId || !input.buyNowQuantity || input.buyNowQuantity <= 0) {
        throw new BadRequestException("Buy now params invalid");
      }
      const product = this.store.products.find((candidate) => candidate.id === input.buyNowProductId && candidate.enabled);
      const sku = this.store.skus.find(
        (candidate) => candidate.id === input.buyNowSkuId && candidate.productId === input.buyNowProductId,
      );
      if (!product || !sku) {
        throw new BadRequestException("Product or SKU invalid");
      }
      return { items: [{ product, sku, quantity: input.buyNowQuantity }], fromCartIds: [] as string[] };
    }

    const checked = this.store.cartItems.filter((item) => item.userId === user.id && item.checked);
    const items = checked.map((item) => {
      const product = this.store.products.find((candidate) => candidate.id === item.productId && candidate.enabled);
      const sku = this.store.skus.find((candidate) => candidate.id === item.skuId && candidate.productId === item.productId);
      if (!product || !sku) {
        throw new BadRequestException("Cart has invalid items");
      }
      return { product, sku, quantity: item.quantity, cartId: item.id };
    });
    return { items, fromCartIds: checked.map((item) => item.id) };
  }

  private async resolveOrderItemsPrisma(user: User, input: CreateOrderInput) {
    if (input.source === "buy_now") {
      if (!input.buyNowProductId || !input.buyNowSkuId || !input.buyNowQuantity || input.buyNowQuantity <= 0) {
        throw new BadRequestException("Buy now params invalid");
      }
      return {
        items: [
          {
            productId: input.buyNowProductId,
            skuId: input.buyNowSkuId,
            quantity: input.buyNowQuantity,
          },
        ],
        fromCartIds: [] as string[],
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

  private mapOrder(row: {
    id: string;
    orderNo: string;
    userId: string;
    addressId: string;
    status: string;
    itemAmountCents: number;
    shippingAmountCents: number;
    payableAmountCents: number;
    note: string | null;
    createdAt: Date;
    paidAt: Date | null;
    cancelledAt: Date | null;
    completedAt: Date | null;
    source: string;
    paymentDeadlineAt: Date;
  }): Order {
    return {
      id: row.id,
      orderNo: row.orderNo,
      userId: row.userId,
      addressId: row.addressId,
      status: row.status as Order["status"],
      itemAmountCents: row.itemAmountCents,
      shippingAmountCents: row.shippingAmountCents,
      payableAmountCents: row.payableAmountCents,
      note: row.note ?? undefined,
      createdAt: row.createdAt.toISOString(),
      paidAt: row.paidAt?.toISOString(),
      cancelledAt: row.cancelledAt?.toISOString(),
      completedAt: row.completedAt?.toISOString(),
      source: row.source as Order["source"],
      paymentDeadlineAt: row.paymentDeadlineAt.toISOString(),
    };
  }

  private mapOrderWithRelations(row: {
    id: string;
    orderNo: string;
    userId: string;
    addressId: string;
    status: string;
    itemAmountCents: number;
    shippingAmountCents: number;
    payableAmountCents: number;
    note: string | null;
    createdAt: Date;
    paidAt: Date | null;
    cancelledAt: Date | null;
    completedAt: Date | null;
    source: string;
    paymentDeadlineAt: Date;
    items: Array<{
      id: string;
      orderId: string;
      productId: string;
      skuId: string;
      title: string;
      skuName: string;
      quantity: number;
      priceCents: number;
      amountCents: number;
    }>;
    shipments: Array<{
      id: string;
      orderId: string;
      company: string;
      companyCode: string | null;
      trackingNo: string;
      status: string | null;
      tracksJson: string | null;
      shippedAt: Date;
      expectedDeliveryAt: Date | null;
    }>;
  }) {
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
          status: (shipment.status as "pending_pickup" | "in_transit" | "signed" | "exception" | undefined) ?? undefined,
          tracks: shipment.tracksJson ? (JSON.parse(shipment.tracksJson) as Array<{ time: string; content: string; location?: string }>) : undefined,
          shippedAt: shipment.shippedAt.toISOString(),
          expectedDeliveryAt: shipment.expectedDeliveryAt?.toISOString(),
        }))[0],
    };
  }
}
