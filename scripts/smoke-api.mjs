import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

function fail(message) {
  console.error(`❌ ${message}`);
  process.exit(1);
}

function ok(message) {
  console.log(`✅ ${message}`);
}

async function detectBaseUrl() {
  if (process.env.API_BASE?.trim()) {
    return process.env.API_BASE.trim().replace(/\/+$/, "");
  }
  try {
    const portFile = resolve(process.cwd(), ".runtime/api-port.txt");
    const port = (await readFile(portFile, "utf8")).trim();
    if (port) return `http://localhost:${port}`;
  } catch {
    // ignore
  }
  return "http://localhost:3000";
}

async function request(baseUrl, path, options = {}) {
  let response;
  try {
    response = await fetch(`${baseUrl}${path}`, {
      method: options.method ?? "GET",
      headers: {
        "Content-Type": "application/json",
        ...(options.headers ?? {}),
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
  } catch (error) {
    throw new Error(
      `cannot connect ${baseUrl}${path}. Please ensure API is running (try: npm run dev:api).`,
    );
  }

  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!response.ok) {
    throw new Error(`${options.method ?? "GET"} ${path} failed: ${response.status} ${JSON.stringify(data)}`);
  }

  return data;
}

async function main() {
  const baseUrl = await detectBaseUrl();
  console.log(`\n🔍 Smoke testing API: ${baseUrl}\n`);

  const health = await request(baseUrl, "/health");
  if (!health?.ok) fail("/health returned invalid response");
  ok("health check");

  const categories = await request(baseUrl, "/categories");
  if (!Array.isArray(categories)) fail("/categories should return array");
  ok("catalog categories");

  const products = await request(baseUrl, "/products");
  if (!Array.isArray(products) || products.length === 0) fail("no products found");
  ok("catalog products");

  const adminLogin = await request(baseUrl, "/admin/auth/login", {
    method: "POST",
    body: { username: "admin", password: "admin123" },
  });
  const adminToken = `Bearer ${adminLogin.token}`;
  ok("admin login");

  await request(baseUrl, "/admin/dashboard/stats", {
    headers: { Authorization: adminToken },
  });
  await request(baseUrl, "/admin/orders", {
    headers: { Authorization: adminToken },
  });
  await request(baseUrl, "/admin/users", {
    headers: { Authorization: adminToken },
  });
  ok("admin read APIs");

  const wxLogin = await request(baseUrl, "/auth/wx-login", {
    method: "POST",
    body: {
      code: `smoke_${Date.now()}`,
      nickname: "SmokeUser",
    },
  });
  const userToken = `Bearer ${wxLogin.token}`;
  ok("user login");

  let addresses = await request(baseUrl, "/addresses", {
    headers: { Authorization: userToken },
  });
  if (!Array.isArray(addresses)) fail("/addresses should return array");
  if (addresses.length === 0) {
    await request(baseUrl, "/addresses", {
      method: "POST",
      headers: { Authorization: userToken },
      body: {
        name: "测试用户",
        phone: "13800009999",
        province: "上海市",
        city: "上海市",
        district: "浦东新区",
        detail: "世纪大道 1 号",
        isDefault: true,
      },
    });
    addresses = await request(baseUrl, "/addresses", {
      headers: { Authorization: userToken },
    });
  }
  const defaultAddress = addresses.find((item) => item.isDefault) ?? addresses[0];
  if (!defaultAddress?.id) fail("failed to prepare address");
  ok("address ready");

  const firstProduct = products[0];
  const detail = await request(baseUrl, `/products/${firstProduct.id}`);
  const sku = detail?.skus?.[0];
  if (!sku?.id) fail("product has no sku");

  const order = await request(baseUrl, "/orders", {
    method: "POST",
    headers: { Authorization: userToken },
    body: {
      source: "buy_now",
      addressId: defaultAddress.id,
      buyNowProductId: detail.id,
      buyNowSkuId: sku.id,
      buyNowQuantity: 1,
    },
  });
  if (!order?.id || !order?.orderNo) fail("order create failed");
  ok("order create");

  const payParams = await request(baseUrl, "/payments/wechat/params", {
    method: "POST",
    headers: { Authorization: userToken },
    body: { orderId: order.id },
  });
  ok(`pay params (${payParams?.mode ?? "unknown"})`);

  if (payParams?.mode === "mock") {
    await request(baseUrl, "/payments/wechat/notify", {
      method: "POST",
      body: {
        orderNo: order.orderNo,
        transactionId: `smoke_tx_${Date.now()}`,
      },
    });
    const paidOrder = await request(baseUrl, `/orders/${order.id}`, {
      headers: { Authorization: userToken },
    });
    if (paidOrder.status !== "paid_pending_shipment") {
      fail(`expected paid_pending_shipment, got ${paidOrder.status}`);
    }
    ok("payment notify + status transition");
  } else {
    console.log("ℹ️ live pay mode detected; skip fake notify step.");
    await request(baseUrl, `/orders/${order.id}/cancel`, {
      method: "POST",
      headers: { Authorization: userToken },
    });
    ok("live mode safety cancel");
  }

  console.log("\n🎉 API smoke test passed.\n");
}

main().catch((error) => {
  fail(error instanceof Error ? error.message : String(error));
});
