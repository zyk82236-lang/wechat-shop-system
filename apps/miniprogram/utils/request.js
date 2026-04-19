const DEFAULT_BASE_URL = "http://localhost:3000";

function getBaseUrl() {
  const app = getApp && getApp();
  if (app && app.globalData && app.globalData.apiBase) {
    return String(app.globalData.apiBase).replace(/\/+$/, "");
  }
  const cached = wx.getStorageSync("api_base");
  if (cached) {
    return String(cached).replace(/\/+$/, "");
  }
  return DEFAULT_BASE_URL;
}

function request(path, options = {}) {
  const app = getApp();
  const token = app.globalData.token || "";
  const authHeader = token
    ? (String(token).startsWith("Bearer ") ? String(token) : `Bearer ${token}`)
    : "";
  const baseUrl = getBaseUrl();
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${baseUrl}${path}`,
      method: options.method || "GET",
      data: options.data || undefined,
      header: {
        "Content-Type": "application/json",
        Authorization: authHeader,
      },
      success: (res) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data);
          return;
        }
        reject(res.data || { message: "Request failed" });
      },
      fail: reject,
    });
  });
}

module.exports = { request };
