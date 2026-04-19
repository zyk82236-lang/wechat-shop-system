# WeChat Shop System (MVP)

Three-end architecture for a WeChat mini-program shop:

- `apps/api`: NestJS API (core commerce flow)
- `apps/admin`: React + Ant Design admin panel scaffold
- `apps/miniprogram`: Native WeChat mini program scaffold

Release runbook:
- `docs/RELEASE_RUNBOOK.md`

## 1) Run

```bash
npm install --cache .npm-local-cache
npm --workspace @shop/api run prisma:generate
npm run dev:api
```

In another terminal:

```bash
npm run dev:admin
```

## 2) Verify

```bash
npm run build:api
npm run test:api
npm run build:admin
```

## 3) Default seed accounts

Mini-program login:
- API endpoint `POST /auth/wx-login`
- Demo code used in scaffold: `demo_openid`

Admin login:
- Super admin: `admin / admin123`
- Operator: `ops / ops123`

## 4) Implemented domain entities

- `User`
- `Address`
- `Category`
- `Product`
- `ProductSku`
- `CartItem`
- `Order`
- `OrderItem`
- `PaymentRecord`
- `Shipment`
- `Banner`

## 5) Implemented API scope

User/Auth:
- `POST /auth/wx-login`
- `POST /admin/auth/login`
- `GET /users/me`
- `GET|POST|PATCH|DELETE /addresses`

Catalog:
- `GET /banners`
- `GET /categories`
- `GET /products`
- `GET /products/:id`

Cart:
- `GET /cart`
- `POST /cart`
- `PATCH /cart/:id`
- `DELETE /cart/:id`

Order:
- `POST /orders` (supports `source=cart|buy_now`)
- `GET /orders`
- `GET /orders/:id`
- `POST /orders/:id/cancel`
- `POST /orders/:id/confirm-received`
- `POST /internal/orders/expire-unpaid`

Payment:
- `POST /payments/wechat/params`
- `POST /payments/wechat/notify` (idempotent)

Admin:
- `GET /health`
- `GET /admin/dashboard/stats`
- `GET /admin/products`
- `POST /admin/products/upsert`
- `DELETE /admin/products/:id`
- `GET /admin/categories`
- `POST /admin/categories/upsert`
- `DELETE /admin/categories/:id`
- `GET /admin/orders`
- `POST /admin/orders/ship`
- `POST /admin/orders/:id/tracks`
- `GET /admin/banners`
- `POST /admin/banners/upsert`
- `DELETE /admin/banners/:id`
- `GET /admin/users`

## 6) Core business guarantees implemented

- Address required before order create
- Server-side price and stock check on create order
- Stock lock on order create
- Order timeout cancel and stock rollback
- Payment notify idempotency
- Payment result source-of-truth is backend callback
- Shipment data visible in order details

## 7) Notes for production hardening

Current data store is in-memory for fast MVP validation.

To go production:
- configure `DATABASE_URL` and run Prisma migrations for MySQL persistence
- configure `REDIS_URL` to enable distributed locks/idempotency keys
- configure WeChat Pay V3 merchant/env vars for live payment and callback verification
- run order-expire scheduler (e.g. cron/queue worker)
- add image upload to object storage and signed URLs

## 8) New upgrade env vars

Database and cache:
- `DATABASE_URL` e.g. `mysql://user:password@127.0.0.1:3306/wechat_shop`
- `REDIS_URL` e.g. `redis://127.0.0.1:6379`

WeChat Pay V3:
- `WECHAT_APP_ID`
- `WECHAT_MCH_ID`
- `WECHAT_MCH_SERIAL_NO`
- `WECHAT_MCH_PRIVATE_KEY` (PEM content)
- `WECHAT_PAY_PLATFORM_PUBLIC_KEY` (PEM content)
- `WECHAT_PAY_NOTIFY_URL`

When merchant fields are missing, API returns mock pay params so local development still works.
