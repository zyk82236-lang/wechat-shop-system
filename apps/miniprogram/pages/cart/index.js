const { request } = require("../../utils/request");
const { ensureLogin } = require("../../utils/auth");

Page({
  data: { items: [] },
  async loadCart() {
    await ensureLogin();
    const items = await request("/cart");
    this.setData({
      items: (items || []).map((item) => ({
        ...item,
        unitPriceText: ((item?.sku?.priceCents || 0) / 100).toFixed(2),
      })),
    });
  },
  async onShow() {
    try {
      await this.loadCart();
    } catch (error) {
      wx.showToast({ title: "购物车加载失败", icon: "none" });
    }
  },
  async toggleChecked(event) {
    const id = event.currentTarget.dataset.id;
    const item = this.data.items.find((candidate) => candidate.id === id);
    await request(`/cart/${id}`, { method: "PATCH", data: { checked: !item.checked } });
    await this.loadCart();
  },
  async changeQty(event) {
    const id = event.currentTarget.dataset.id;
    const delta = Number(event.currentTarget.dataset.delta || 0);
    const item = this.data.items.find((candidate) => candidate.id === id);
    if (!item) return;
    const quantity = item.quantity + delta;
    if (quantity <= 0) {
      await request(`/cart/${id}`, { method: "DELETE" });
    } else {
      await request(`/cart/${id}`, { method: "PATCH", data: { quantity } });
    }
    await this.loadCart();
  },
  async removeItem(event) {
    const id = event.currentTarget.dataset.id;
    await request(`/cart/${id}`, { method: "DELETE" });
    await this.loadCart();
  },
  goCheckout() {
    wx.navigateTo({ url: "/pages/checkout/index?source=cart" });
  },
});
