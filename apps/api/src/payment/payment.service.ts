import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { genId, nowIso } from "../common/id";
import { StoreService } from "../data/store.service";
import { PrismaPersistenceService } from "../infra/prisma-persistence.service";
import { PrismaService } from "../infra/prisma.service";
import { RedisService } from "../infra/redis.service";
import { OrderService } from "../order/order.service";
import { WechatPayV3Service } from "./wechat-pay-v3.service";

@Injectable()
export class PaymentService {
  constructor(
    private readonly store: StoreService,
    private readonly orderService: OrderService,
    private readonly redis: RedisService,
    private readonly prisma: PrismaService,
    private readonly prismaPersistence: PrismaPersistenceService,
    private readonly wechatPay: WechatPayV3Service,
  ) {}

  async createWechatPayParams(userId: string, orderId: string) {
    if (this.prisma.enabled) {
      const order = await this.prisma.order.findFirst({
        where: { id: orderId, userId },
      });
      if (!order) {
        throw new NotFoundException("Order not found");
      }
      if (order.status !== "pending_payment") {
        throw new BadRequestException("Order is not pending payment");
      }
      let payment = await this.prisma.paymentRecord.findFirst({
        where: { orderId: order.id },
      });
      if (!payment) {
        payment = await this.prisma.paymentRecord.create({
          data: {
            id: genId("pay"),
            orderId: order.id,
            orderNo: order.orderNo,
            channel: "wechat_pay",
            amountCents: order.payableAmountCents,
            status: "created",
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        });
      }
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (!user) throw new NotFoundException("User not found");
      const payParams = await this.wechatPay.createMiniProgramPay({
        outTradeNo: order.orderNo,
        description: `商城订单 ${order.orderNo}`,
        notifyUrl: this.wechatPay.getNotifyUrl(),
        amountCents: payment.amountCents,
        payerOpenId: user.openId,
      });
      return { orderNo: order.orderNo, ...payParams };
    }

    const order = this.store.orders.find((candidate) => candidate.id === orderId && candidate.userId === userId);
    if (!order) {
      throw new NotFoundException("Order not found");
    }
    if (order.status !== "pending_payment") {
      throw new BadRequestException("Order is not pending payment");
    }
    let payment = this.store.payments.find((candidate) => candidate.orderId === order.id);
    if (!payment) {
      payment = {
        id: genId("pay"),
        orderId: order.id,
        orderNo: order.orderNo,
        channel: "wechat_pay",
        amountCents: order.payableAmountCents,
        status: "created",
        createdAt: nowIso(),
        updatedAt: nowIso(),
      };
      this.store.payments.push(payment);
      void this.prismaPersistence.persistPayment(payment);
    }
    const user = this.store.users.find((candidate) => candidate.id === userId);
    if (!user) throw new NotFoundException("User not found");
    const payParams = await this.wechatPay.createMiniProgramPay({
      outTradeNo: order.orderNo,
      description: `商城订单 ${order.orderNo}`,
      notifyUrl: this.wechatPay.getNotifyUrl(),
      amountCents: order.payableAmountCents,
      payerOpenId: user.openId,
    });
    return { orderNo: order.orderNo, ...payParams };
  }

  async handleWechatNotify(input: {
    orderNo: string;
    transactionId: string;
    raw?: string;
    signature?: string;
    timestamp?: string;
    nonce?: string;
  }) {
    const verified = this.wechatPay.verifyNotifySignature({
      signature: input.signature,
      timestamp: input.timestamp,
      nonce: input.nonce,
      body: input.raw ?? JSON.stringify(input),
    });
    if (!verified) {
      throw new BadRequestException("Invalid WeChat notify signature");
    }

    const notifyKey = `${input.orderNo}:${input.transactionId}`;
    const idempotencyKey = `idempotent:wechat-notify:${notifyKey}`;
    const accepted = await this.redis.setIfAbsent(idempotencyKey, "1", 24 * 3600);
    if (!accepted) {
      return { success: true, idempotent: true };
    }

    await this.orderService.markPaidByOrderNo({ orderNo: input.orderNo, transactionId: input.transactionId });

    if (this.prisma.enabled) {
      const payment = await this.prisma.paymentRecord.findFirst({
        where: { orderNo: input.orderNo },
      });
      if (payment && input.raw) {
        await this.prisma.paymentRecord.update({
          where: { id: payment.id },
          data: { rawNotify: input.raw, updatedAt: new Date() },
        });
      }
      return { success: true, idempotent: false };
    }

    const payment = this.store.payments.find((candidate) => candidate.orderNo === input.orderNo);
    if (payment && input.raw) {
      payment.rawNotify = input.raw;
      payment.updatedAt = nowIso();
      void this.prismaPersistence.persistPayment(payment);
    }
    return { success: true, idempotent: false };
  }
}
