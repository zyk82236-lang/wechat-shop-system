"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const store_service_1 = require("../src/data/store.service");
const prisma_persistence_service_1 = require("../src/infra/prisma-persistence.service");
const prisma_service_1 = require("../src/infra/prisma.service");
const redis_service_1 = require("../src/infra/redis.service");
const order_service_1 = require("../src/order/order.service");
const payment_service_1 = require("../src/payment/payment.service");
const wechat_pay_v3_service_1 = require("../src/payment/wechat-pay-v3.service");
function setup() {
    const store = new store_service_1.StoreService();
    const redis = new redis_service_1.RedisService();
    const prisma = new prisma_service_1.PrismaService();
    const prismaPersistence = new prisma_persistence_service_1.PrismaPersistenceService(prisma);
    const orderService = new order_service_1.OrderService(store, redis, prisma, prismaPersistence);
    const paymentService = new payment_service_1.PaymentService(store, orderService, redis, prisma, prismaPersistence, new wechat_pay_v3_service_1.WechatPayV3Service());
    const user = store.users[0];
    return { store, orderService, paymentService, user };
}
(0, vitest_1.describe)("Order & payment flow", () => {
    (0, vitest_1.test)("creates order and locks stock", async () => {
        const { store, orderService, user } = setup();
        const beforeStock = store.skus.find((sku) => sku.id === "sku_tea_m").stock;
        const order = await orderService.createOrder(user, {
            source: "buy_now",
            addressId: "addr_demo",
            buyNowProductId: "prod_tea",
            buyNowSkuId: "sku_tea_m",
            buyNowQuantity: 2,
        });
        const afterStock = store.skus.find((sku) => sku.id === "sku_tea_m").stock;
        (0, vitest_1.expect)(order.status).toBe("pending_payment");
        (0, vitest_1.expect)(afterStock).toBe(beforeStock - 2);
    });
    (0, vitest_1.test)("payment notify is idempotent", async () => {
        const { orderService, paymentService, user } = setup();
        const order = await orderService.createOrder(user, {
            source: "buy_now",
            addressId: "addr_demo",
            buyNowProductId: "prod_tea",
            buyNowSkuId: "sku_tea_l",
            buyNowQuantity: 1,
        });
        await paymentService.createWechatPayParams(user.id, order.id);
        const first = await paymentService.handleWechatNotify({ orderNo: order.orderNo, transactionId: "tx001" });
        const second = await paymentService.handleWechatNotify({ orderNo: order.orderNo, transactionId: "tx001" });
        (0, vitest_1.expect)(first.idempotent).toBe(false);
        (0, vitest_1.expect)(second.idempotent).toBe(true);
    });
    (0, vitest_1.test)("expire unpaid order restores stock", async () => {
        const { store, orderService, user } = setup();
        const beforeStock = store.skus.find((sku) => sku.id === "sku_nuts_7").stock;
        const order = await orderService.createOrder(user, {
            source: "buy_now",
            addressId: "addr_demo",
            buyNowProductId: "prod_nuts",
            buyNowSkuId: "sku_nuts_7",
            buyNowQuantity: 3,
        });
        const stored = store.orders.find((candidate) => candidate.id === order.id);
        stored.paymentDeadlineAt = new Date(Date.now() - 1000).toISOString();
        const result = await orderService.expireUnpaidOrders();
        const afterStock = store.skus.find((sku) => sku.id === "sku_nuts_7").stock;
        (0, vitest_1.expect)(result.expiredOrderIds).toContain(order.id);
        (0, vitest_1.expect)(afterStock).toBe(beforeStock);
    });
});
//# sourceMappingURL=order-payment.spec.js.map