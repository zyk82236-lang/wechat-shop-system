module.exports = {
  apps: [
    {
      name: "wechat-shop-api",
      cwd: "/opt/wechat-shop-system/apps/api",
      script: "dist/main.js",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
    },
  ],
};
