const { request } = require("../../utils/request");
const { ensureLogin } = require("../../utils/auth");

Page({
  data: { user: null, apiBaseInput: "" },
  async onShow() {
    try {
      const app = getApp();
      this.setData({ apiBaseInput: app.globalData.apiBase || "http://localhost:3000" });
      await ensureLogin();
      const user = await request("/users/me");
      this.setData({ user });
    } catch (error) {
      wx.showToast({ title: "用户信息加载失败", icon: "none" });
    }
  },
  goAddress() {
    wx.navigateTo({ url: "/pages/address/index" });
  },
  goOrders() {
    wx.navigateTo({ url: "/pages/orders/index" });
  },
  onApiBaseInput(event) {
    this.setData({ apiBaseInput: event.detail.value });
  },
  saveApiBase() {
    const value = String(this.data.apiBaseInput || "").trim().replace(/\/+$/, "");
    if (!/^https?:\/\/.+/.test(value)) {
      wx.showToast({ title: "请输入正确的 http(s) 地址", icon: "none" });
      return;
    }
    const app = getApp();
    app.globalData.apiBase = value;
    wx.setStorageSync("api_base", value);
    app.globalData.token = "";
    wx.showToast({ title: "API 地址已保存", icon: "success" });
  },
});
