import { describe, expect, test } from "vitest";
import { StoreService } from "../src/data/store.service";
import { PrismaPersistenceService } from "../src/infra/prisma-persistence.service";
import { PrismaService } from "../src/infra/prisma.service";
import { RedisService } from "../src/infra/redis.service";
import { OrderService } from "../src/order/order.service";
import { PaymentService } from "../src/payment/payment.service";
import { WechatPayV3Service } from "../src/payment/wechat-pay-v3.service";

function setup() {
  const store = new StoreService();
  const redis = new RedisService();
  const prisma = new PrismaService();
  const prismaPersistence = new PrismaPersistenceService(prisma);
  const orderService = new OrderService(store, redis, prisma, prismaPersistence);
  const paymentService = new PaymentService(store, orderService, redis, prisma, prismaPersistence, new WechatPayV3Service());
  const user = store.users[0]!;
  return { store, orderService, paymentService, user };
}

describe("Order & payment flow", () => {
  test("creates order and locks stock", async () => {
    const { store, orderService, user } = setup();
    const beforeStock = store.skus.find((sku) => sku.id === "sku_tea_m")!.stock;
    const order = await orderService.createOrder(user, {
      source: "buy_now",
      addressId: "addr_demo",
      buyNowProductId: "prod_tea",
      buyNowSkuId: "sku_tea_m",
      buyNowQuantity: 2,
    });
    const afterStock = store.skus.find((sku) => sku.id === "sku_tea_m")!.stock;
    expect(order.status).toBe("pending_payment");
    expect(afterStock).toBe(beforeStock - 2);
  });

  test("payment notify is idempotent", async () => {
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
    expect(first.idempotent).toBe(false);
    expect(second.idempotent).toBe(true);
  });

  test("expire unpaid order restores stock", async () => {
    const { store, orderService, user } = setup();
    const beforeStock = store.skus.find((sku) => sku.id === "sku_nuts_7")!.stock;
    const order = await orderService.createOrder(user, {
      source: "buy_now",
      addressId: "addr_demo",
      buyNowProductId: "prod_nuts",
      buyNowSkuId: "sku_nuts_7",
      buyNowQuantity: 3,
    });
    const stored = store.orders.find((candidate) => candidate.id === order.id)!;
    stored.paymentDeadlineAt = new Date(Date.now() - 1000).toISOString();
    const result = await orderService.expireUnpaidOrders();
    const afterStock = store.skus.find((sku) => sku.id === "sku_nuts_7")!.stock;
    expect(result.expiredOrderIds).toContain(order.id);
    expect(afterStock).toBe(beforeStock);
  });
});
