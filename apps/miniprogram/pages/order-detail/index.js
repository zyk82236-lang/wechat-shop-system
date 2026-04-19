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
  data: {
    id: "",
    loading: false,
    order: null,
  },
  async onLoad(query) {
    this.setData({ id: query.id || "" });
    await ensureLogin();
    await this.loadDetail();
  },
  async loadDetail() {
    if (!this.data.id) {
      wx.showToast({ title: "订单 ID 缺失", icon: "none" });
      return;
    }
    this.setData({ loading: true });
    try {
      const detail = await request(`/orders/${this.data.id}`);
      this.setData({
        order: {
          ...detail,
          statusText: statusText(detail.status),
          amountText: (detail.payableAmountCents / 100).toFixed(2),
          itemAmountText: (detail.itemAmountCents / 100).toFixed(2),
          shippingAmountText: (detail.shippingAmountCents / 100).toFixed(2),
          items: (detail.items || []).map((item) => ({
            ...item,
            amountText: (item.amountCents / 100).toFixed(2),
          })),
          tracks: (detail.shipment && detail.shipment.tracks) || [],
        },
      });
    } catch (error) {
      wx.showToast({ title: "订单详情加载失败", icon: "none" });
    } finally {
      this.setData({ loading: false });
    }
  },
  async cancelOrder() {
    const order = this.data.order;
    if (!order) return;
    try {
      await request(`/orders/${order.id}/cancel`, { method: "POST" });
      wx.showToast({ title: "已取消", icon: "success" });
      await this.loadDetail();
    } catch (error) {
      wx.showToast({ title: "取消失败", icon: "none" });
    }
  },
  async confirmReceived() {
    const order = this.data.order;
    if (!order) return;
    try {
      await request(`/orders/${order.id}/confirm-received`, { method: "POST" });
      wx.showToast({ title: "确认收货成功", icon: "success" });
      await this.loadDetail();
    } catch (error) {
      wx.showToast({ title: "操作失败", icon: "none" });
    }
  },
});
