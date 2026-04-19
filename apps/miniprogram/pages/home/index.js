const { request } = require("../../utils/request");

Page({
  data: {
    banners: [],
    products: [],
  },
  async onShow() {
    const [banners, products] = await Promise.all([
      request("/banners"),
      request("/products?recommended=true"),
    ]);
    this.setData({
      banners,
      products: (products || []).map((item) => ({
        ...item,
        minPriceText: ((item.minPriceCents || 0) / 100).toFixed(2),
      })),
    });
  },
  goProduct(event) {
    const id = event.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/product/index?id=${id}` });
  },
});
