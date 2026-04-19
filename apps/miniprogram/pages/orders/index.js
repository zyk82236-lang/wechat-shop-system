const { request } = require("../../utils/request");
const { ensureLogin } = require("../../utils/auth");

function statusText(status) {
  if (status === "pending_payment") return "待支付";
  if (status === "paid_pending_shipment") return "待发货";
  if (status === "shipped") return "待收货";
  if (status === "completed") return "已完成";
  if (status === "cancelled") return "已取消";
  if (status === "refunding") return "退款中";
  if (status === "refunded") return "已退款";
  return status;
}

Page({
  data: { orders: [], loading: false },
  async loadOrders() {
    this.setData({ loading: true });
    try {
      await ensureLogin();
      const orders = await request("/orders");
      this.setData({
        orders: orders.map((item) => ({
          ...item,
          statusText: statusText(item.status),
          amountText: (item.payableAmountCents / 100).toFixed(2),
        })),
      });
    } catch (error) {
      wx.showToast({ title: "订单加载失败", icon: "none" });
    } finally {
      this.setData({ loading: false });
    }
  },
  async onShow() {
    await this.loadOrders();
  },
  goDetail(event) {
    const id = event.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/order-detail/index?id=${id}` });
  },
  async cancelOrder(event) {
    const id = event.currentTarget.dataset.id;
    try {
      await request(`/orders/${id}/cancel`, { method: "POST" });
      wx.showToast({ title: "已取消", icon: "success" });
      await this.loadOrders();
    } catch (error) {
      wx.showToast({ title: "取消失败", icon: "none" });
    }
  },
  async confirmReceived(event) {
    const id = event.currentTarget.dataset.id;
    try {
      await request(`/orders/${id}/confirm-received`, { method: "POST" });
      wx.showToast({ title: "确认收货成功", icon: "success" });
      await this.loadOrders();
    } catch (error) {
      wx.showToast({ title: "操作失败", icon: "none" });
    }
  },
});
