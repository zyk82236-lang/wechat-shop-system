const { request } = require("../../utils/request");
const { ensureLogin } = require("../../utils/auth");

Page({
  data: {
    source: "cart",
    address: null,
    creating: false,
    previewItems: [],
    itemAmountText: "0.00",
    shippingAmountText: "0.00",
    payableAmountText: "0.00",
  },
  async loadPreview() {
    if (this.data.source === "cart") {
      const cartItems = await request("/cart");
      const selected = cartItems.filter((item) => item.checked);
      const itemAmountCents = selected.reduce((sum, item) => sum + item.sku.priceCents * item.quantity, 0);
      const shippingAmountCents = itemAmountCents >= 10000 ? 0 : (selected.length ? 1200 : 0);
      this.setData({
        previewItems: selected.map((item) => ({
          id: item.id,
          title: item.product.title,
          skuName: item.sku.name,
          quantity: item.quantity,
          amountText: ((item.sku.priceCents * item.quantity) / 100).toFixed(2),
        })),
        itemAmountText: (itemAmountCents / 100).toFixed(2),
        shippingAmountText: (shippingAmountCents / 100).toFixed(2),
        payableAmountText: ((itemAmountCents + shippingAmountCents) / 100).toFixed(2),
      });
      return;
    }

    const product = await request(`/products/${this.data.buyNowProductId}`);
    const sku = (product.skus || []).find((candidate) => candidate.id === this.data.buyNowSkuId);
    if (!sku) {
      throw new Error("SKU invalid");
    }
    const itemAmountCents = sku.priceCents * this.data.buyNowQuantity;
    const shippingAmountCents = itemAmountCents >= 10000 ? 0 : 1200;
    this.setData({
      previewItems: [
        {
          id: sku.id,
          title: product.title,
          skuName: sku.name,
          quantity: this.data.buyNowQuantity,
          amountText: (itemAmountCents / 100).toFixed(2),
        },
      ],
      itemAmountText: (itemAmountCents / 100).toFixed(2),
      shippingAmountText: (shippingAmountCents / 100).toFixed(2),
      payableAmountText: ((itemAmountCents + shippingAmountCents) / 100).toFixed(2),
    });
  },
  async onLoad(query) {
    try {
      await ensureLogin();
      const addresses = await request("/addresses");
      const address = addresses.find((item) => item.isDefault) || addresses[0] || null;
      this.setData({
        source: query.source || "cart",
        address,
        buyNowProductId: query.productId || "",
        buyNowSkuId: query.skuId || "",
        buyNowQuantity: Number(query.quantity || 1),
      });
      await this.loadPreview();
    } catch (error) {
      wx.showToast({ title: "结算页加载失败", icon: "none" });
    }
  },
  async triggerMockNotify(orderNo) {
    await request("/payments/wechat/notify", {
      method: "POST",
      data: { orderNo, transactionId: `mock_tx_${Date.now()}` },
    });
  },
  requestWechatPay(payParams) {
    return new Promise((resolve, reject) => {
      wx.requestPayment({
        ...payParams,
        success: resolve,
        fail: reject,
      });
    });
  },
  async submitOrder() {
    if (this.data.creating) return;
    if (!this.data.address) {
      wx.showToast({ title: "请先填写地址", icon: "none" });
      return;
    }
    if (!this.data.previewItems.length) {
      wx.showToast({ title: "没有可结算商品", icon: "none" });
      return;
    }
    this.setData({ creating: true });
    try {
      const order = await request("/orders", {
        method: "POST",
        data: {
          source: this.data.source,
          addressId: this.data.address.id,
          buyNowProductId: this.data.buyNowProductId,
          buyNowSkuId: this.data.buyNowSkuId,
          buyNowQuantity: this.data.buyNowQuantity,
        },
      });
      const payParams = await request("/payments/wechat/params", {
        method: "POST",
        data: { orderId: order.id },
      });
      const isMockMode = payParams.mode === "mock" || String(payParams.package || "").startsWith("prepay_id=mock_");
      if (isMockMode) {
        try {
          await this.requestWechatPay(payParams);
        } catch (error) {
          const msg = String((error && error.errMsg) || error || "");
          if (msg.includes("cancel")) {
            throw error;
          }
        }
        await this.triggerMockNotify(order.orderNo);
      } else {
        await this.requestWechatPay(payParams);
      }
      wx.showToast({ title: "支付成功", icon: "success" });
      wx.redirectTo({ url: "/pages/orders/index" });
    } catch (error) {
      const msg = String((error && error.errMsg) || error || "");
      wx.showToast({ title: msg.includes("cancel") ? "已取消支付" : "下单或支付失败", icon: "none" });
    } finally {
      this.setData({ creating: false });
    }
  },
});
