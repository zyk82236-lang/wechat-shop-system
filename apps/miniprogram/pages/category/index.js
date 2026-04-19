const { request } = require("../../utils/request");

Page({
  data: {
    categories: [],
    products: [],
    activeCategoryId: "",
  },
  mapProducts(products) {
    return (products || []).map((item) => ({
      ...item,
      minPriceText: ((item.minPriceCents || 0) / 100).toFixed(2),
    }));
  },
  async onShow() {
    const categories = await request("/categories");
    const activeCategoryId = categories.length ? categories[0].id : "";
    const products = activeCategoryId ? await request(`/products?categoryId=${activeCategoryId}`) : [];
    this.setData({ categories, activeCategoryId, products: this.mapProducts(products) });
  },
  async switchCategory(event) {
    const activeCategoryId = event.currentTarget.dataset.id;
    const products = await request(`/products?categoryId=${activeCategoryId}`);
    this.setData({ activeCategoryId, products: this.mapProducts(products) });
  },
  goProduct(event) {
    wx.navigateTo({ url: `/pages/product/index?id=${event.currentTarget.dataset.id}` });
  },
});
