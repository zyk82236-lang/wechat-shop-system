const { request } = require("../../utils/request");
const { ensureLogin } = require("../../utils/auth");

Page({
  data: {
    product: null,
    skuId: "",
    quantity: 1,
  },
  async onLoad(query) {
    const product = await request(`/products/${query.id}`);
    const mapped = {
      ...product,
      skus: (product.skus || []).map((sku) => ({
        ...sku,
        priceText: ((sku.priceCents || 0) / 100).toFixed(2),
      })),
    };
    this.setData({ product: mapped, skuId: mapped.skus[0]?.id || "" });
  },
  pickSku(event) {
    this.setData({ skuId: event.currentTarget.dataset.id });
  },
  async addCart() {
    const { product, skuId, quantity } = this.data;
    await ensureLogin();
    await request("/cart", { method: "POST", data: { productId: product.id, skuId, quantity } });
    wx.showToast({ title: "已加入购物车", icon: "success" });
  },
  buyNow() {
    const { product, skuId, quantity } = this.data;
    wx.navigateTo({
      url: `/pages/checkout/index?source=buy_now&productId=${product.id}&skuId=${skuId}&quantity=${quantity}`,
    });
  },
});
