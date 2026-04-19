const { request } = require("../../utils/request");
const { ensureLogin } = require("../../utils/auth");

function emptyForm() {
  return {
    id: "",
    name: "",
    phone: "",
    province: "",
    city: "",
    district: "",
    detail: "",
    isDefault: false,
  };
}

function extractMessage(error, fallback) {
  if (!error) return fallback;
  if (typeof error === "string") return error;
  if (Array.isArray(error.message)) return String(error.message[0] || fallback);
  if (error.message) return String(error.message);
  return fallback;
}

Page({
  data: {
    list: [],
    showForm: false,
    saving: false,
    form: emptyForm(),
  },
  async loadList() {
    await ensureLogin();
    const list = await request("/addresses");
    this.setData({ list });
  },
  async onShow() {
    try {
      await this.loadList();
    } catch (error) {
      wx.showToast({ title: "地址加载失败", icon: "none" });
    }
  },
  openCreate() {
    this.setData({
      showForm: true,
      form: emptyForm(),
    });
  },
  openEdit(event) {
    const id = event.currentTarget.dataset.id;
    const address = this.data.list.find((item) => item.id === id);
    if (!address) return;
    this.setData({
      showForm: true,
      form: { ...address },
    });
  },
  closeForm() {
    this.setData({ showForm: false, form: emptyForm() });
  },
  onInput(event) {
    const key = event.currentTarget.dataset.key;
    const value = event.detail.value;
    this.setData({ form: { ...this.data.form, [key]: value } });
  },
  onDefaultChange(event) {
    this.setData({ form: { ...this.data.form, isDefault: event.detail.value } });
  },
  async saveAddress() {
    const form = this.data.form;
    if (!form.name || !form.phone || !form.province || !form.city || !form.district || !form.detail) {
      wx.showToast({ title: "请完整填写地址信息", icon: "none" });
      return;
    }
    this.setData({ saving: true });
    try {
      const payload = {
        name: form.name,
        phone: form.phone,
        province: form.province,
        city: form.city,
        district: form.district,
        detail: form.detail,
        isDefault: !!form.isDefault,
      };
      if (form.id) {
        await request(`/addresses/${form.id}`, { method: "PATCH", data: payload });
      } else {
        await request("/addresses", { method: "POST", data: payload });
      }
      wx.showToast({ title: "保存成功", icon: "success" });
      this.setData({ showForm: false, form: emptyForm() });
      await this.loadList();
    } catch (error) {
      wx.showToast({ title: extractMessage(error, "保存失败"), icon: "none" });
    } finally {
      this.setData({ saving: false });
    }
  },
  async removeAddress(event) {
    const id = event.currentTarget.dataset.id;
    try {
      await request(`/addresses/${id}`, { method: "DELETE" });
      wx.showToast({ title: "删除成功", icon: "success" });
      await this.loadList();
    } catch (error) {
      wx.showToast({ title: extractMessage(error, "删除失败"), icon: "none" });
    }
  },
  async setDefault(event) {
    const id = event.currentTarget.dataset.id;
    try {
      await request(`/addresses/${id}`, {
        method: "PATCH",
        data: { isDefault: true },
      });
      wx.showToast({ title: "已设为默认地址", icon: "success" });
      await this.loadList();
    } catch (error) {
      wx.showToast({ title: extractMessage(error, "设置失败"), icon: "none" });
    }
  },
});
