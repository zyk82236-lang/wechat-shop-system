# 微信商城上线收口包（Runbook）

本文件用于生产发布前后执行，覆盖配置、部署、验收、风险与回滚。

## 1. 发布前准备

### 1.1 代码与依赖

```bash
cd /Users/yorkzhang/Documents/Codex/2026-04-17-openclaw-agent/wechat-shop-system
npm install
npm --workspace @shop/api run prisma:generate
npm run build:api
npm run test:api
npm run smoke:api
npm run build:admin
```

### 1.2 生产环境变量

- API 模板：`apps/api/.env.production.example`
- Admin 模板：`apps/admin/.env.production.example`

至少确认以下变量已填充：

- `DATABASE_URL`
- `REDIS_URL`
- `WECHAT_APP_ID`
- `WECHAT_MCH_ID`
- `WECHAT_MCH_SERIAL_NO`
- `WECHAT_MCH_PRIVATE_KEY`
- `WECHAT_PAY_PLATFORM_PUBLIC_KEY`
- `WECHAT_PAY_NOTIFY_URL`
- `VITE_API_BASE`

### 1.3 数据库迁移

```bash
cd apps/api
npm run prisma:migrate
```

## 2. 发布步骤（建议顺序）

1. 发布 API（NestJS）到 `https://api.your-domain.com`
2. 验证 API 健康检查：`GET /health`
3. 发布 Admin（Vite 打包产物）到后台域名
4. 在微信开发者工具中将小程序 API 地址设置为 API 正式域名
5. 配置微信支付回调地址为 `WECHAT_PAY_NOTIFY_URL`

可选部署模板：

- PM2: `deploy/ecosystem.api.config.cjs`
- Nginx: `deploy/nginx.api.conf.example`

## 3. 生产验收清单（必须全绿）

### 3.1 API 验收

- `GET /health` 返回 `ok: true`
- `npm run smoke:api` 通过（默认本地 mock 支付链路）
- 管理员登录成功：`POST /admin/auth/login`
- 商品/分类/轮播增删改查成功
- 订单发货成功：`POST /admin/orders/ship`
- 订单物流轨迹追加成功：`POST /admin/orders/:id/tracks`

### 3.2 小程序验收

- 首页、分类、商品详情正常加载
- 地址管理：新增/编辑/删除/设默认成功
- 购物车：勾选、改数量、删除成功
- 结算页金额预览正确
- 下单后支付成功，订单状态流转正确
- 订单详情可见物流轨迹
- 已发货订单可确认收货

### 3.3 支付验收

- 支付回调后订单状态转 `paid_pending_shipment`
- 重复回调不会重复记账（幂等）
- 未支付超时关闭后库存回补

## 4. 风险与应对

### 4.1 高风险项

- 微信支付证书/密钥配置错误导致支付失败
- 回调域名不可达导致已支付订单未入账
- 数据库连接池/慢查询导致下单高峰超时
- Redis 不可用导致幂等与锁能力下降

### 4.2 监控建议

- API 5xx 比例
- 下单成功率
- 支付回调成功率
- 发货操作成功率
- MySQL 连接与慢 SQL
- Redis 延迟与可用性

## 5. 回滚方案

1. 前端回滚：Admin 静态资源回滚到上一个版本
2. 后端回滚：切回上一个 API 镜像/构建
3. 数据回滚：仅执行“向前兼容”迁移，避免直接 destructive 回滚
4. 紧急止血：短期关闭支付入口，保留下单浏览功能

## 6. 交付物清单

- API 服务（NestJS）
- Admin 控制台（React + AntD）
- 小程序端（原生）
- 环境变量模板（API/Admin）
- 本上线 Runbook
