const { request } = require("./request");

async function ensureLogin() {
  const app = getApp();
  if (app.globalData.token) return app.globalData.token;
  const result = await request("/auth/wx-login", {
    method: "POST",
    data: { code: "demo_openid", nickname: "小程序用户" },
  });
  app.globalData.token = result.token;
  return app.globalData.token;
}

module.exports = { ensureLogin };
