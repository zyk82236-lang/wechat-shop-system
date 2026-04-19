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
exports.PaymentService = void 0;
const common_1 = require("@nestjs/common");
const id_1 = require("../common/id");
const store_service_1 = require("../data/store.service");
const prisma_persistence_service_1 = require("../infra/prisma-persistence.service");
const prisma_service_1 = require("../infra/prisma.service");
const redis_service_1 = require("../infra/redis.service");
const order_service_1 = require("../order/order.service");
const wechat_pay_v3_service_1 = require("./wechat-pay-v3.service");
let PaymentService = class PaymentService {
    store;
    orderService;
    redis;
    prisma;
    prismaPersistence;
    wechatPay;
    constructor(store, orderService, redis, prisma, prismaPersistence, wechatPay) {
        this.store = store;
        this.orderService = orderService;
        this.redis = redis;
        this.prisma = prisma;
        this.prismaPersistence = prismaPersistence;
        this.wechatPay = wechatPay;
    }
    async createWechatPayParams(userId, orderId) {
        if (this.prisma.enabled) {
            const order = await this.prisma.order.findFirst({
                where: { id: orderId, userId },
            });
            if (!order) {
                throw new common_1.NotFoundException("Order not found");
            }
            if (order.status !== "pending_payment") {
                throw new common_1.BadRequestException("Order is not pending payment");
            }
            let payment = await this.prisma.paymentRecord.findFirst({
                where: { orderId: order.id },
            });
            if (!payment) {
                payment = await this.prisma.paymentRecord.create({
                    data: {
                        id: (0, id_1.genId)("pay"),
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
            if (!user)
                throw new common_1.NotFoundException("User not found");
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
            throw new common_1.NotFoundException("Order not found");
        }
        if (order.status !== "pending_payment") {
            throw new common_1.BadRequestException("Order is not pending payment");
        }
        let payment = this.store.payments.find((candidate) => candidate.orderId === order.id);
        if (!payment) {
            payment = {
                id: (0, id_1.genId)("pay"),
                orderId: order.id,
                orderNo: order.orderNo,
                channel: "wechat_pay",
                amountCents: order.payableAmountCents,
                status: "created",
                createdAt: (0, id_1.nowIso)(),
                updatedAt: (0, id_1.nowIso)(),
            };
            this.store.payments.push(payment);
            void this.prismaPersistence.persistPayment(payment);
        }
        const user = this.store.users.find((candidate) => candidate.id === userId);
        if (!user)
            throw new common_1.NotFoundException("User not found");
        const payParams = await this.wechatPay.createMiniProgramPay({
            outTradeNo: order.orderNo,
            description: `商城订单 ${order.orderNo}`,
            notifyUrl: this.wechatPay.getNotifyUrl(),
            amountCents: order.payableAmountCents,
            payerOpenId: user.openId,
        });
        return { orderNo: order.orderNo, ...payParams };
    }
    async handleWechatNotify(input) {
        const verified = this.wechatPay.verifyNotifySignature({
            signature: input.signature,
            timestamp: input.timestamp,
            nonce: input.nonce,
            body: input.raw ?? JSON.stringify(input),
        });
        if (!verified) {
            throw new common_1.BadRequestException("Invalid WeChat notify signature");
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
            payment.updatedAt = (0, id_1.nowIso)();
            void this.prismaPersistence.persistPayment(payment);
        }
        return { success: true, idempotent: false };
    }
};
exports.PaymentService = PaymentService;
exports.PaymentService = PaymentService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [store_service_1.StoreService,
        order_service_1.OrderService,
        redis_service_1.RedisService,
        prisma_service_1.PrismaService,
        prisma_persistence_service_1.PrismaPersistenceService,
        wechat_pay_v3_service_1.WechatPayV3Service])
], PaymentService);
//# sourceMappingURL=payment.service.js.map