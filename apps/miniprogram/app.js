App({
  onLaunch() {
    const savedApiBase = wx.getStorageSync("api_base");
    if (savedApiBase) {
      this.globalData.apiBase = savedApiBase;
    }
  },
  globalData: {
    token: "",
    apiBase: "http://localhost:3000",
  },
});
