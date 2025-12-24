# API Overview (Work in Progress)

The API is built with NestJS and exposes REST endpoints under `/v1` with Swagger documentation available at `/docs`.

## Implemented domains
- **Health**: `GET /v1/health` returns service and database readiness.
- **Auth**: registration, login, refresh, logout, and OTP mock flows under `/v1/auth/*` with JWT+refresh.
- **Food**: restaurant listing, details, and menus via `/v1/food/restaurants`, `/v1/food/restaurants/:id`, `/v1/food/restaurants/:id/menu`.
- **Shop**: product categories, product listing/detail, and keyword search via `/v1/shop/categories`, `/v1/shop/products`, `/v1/shop/products/:id`, `/v1/shop/search`.
- **Wallet**: `GET /v1/wallet` for balance/entries, `GET /v1/wallet/transactions` for paginated ledger, `POST /v1/wallet/topup` to create a Stripe PaymentIntent and credit wallet, and `POST /v1/wallet/apply-promo` for promo validation (JWT required).
- **Payments**: `POST /v1/payments/webhook/stripe` receives Stripe webhook events with signature verification and updates payment intent and wallet ledger status.
- **Metrics**: `GET /v1/metrics` exposes Prometheus-format counters for service health and HTTP requests.
- **Realtime**: WebSocket namespace `/realtime` authenticates via Bearer token and supports `subscribe_order` and `subscribe_task` events, broadcasting `order_update` and `task_update` messages per room.
- **Admin (Restaurants/Menus)**: RBAC-protected CRUD under `/v1/admin/restaurants` for listing, creating, updating restaurants, plus menu category and item management via `/v1/admin/restaurants/:id/categories`, `/v1/admin/categories/:categoryId`, and `/v1/admin/categories/:categoryId/items` (requires ADMIN or OPS role and JWT bearer auth).
- **Admin (Stores/Catalog)**: RBAC-protected store/catalog management under `/v1/admin/stores` (list/get/create/update). Store categories live at `/v1/admin/stores/:id/categories` (create) and `/v1/admin/categories/:categoryId` (update). Products are managed via `/v1/admin/categories/:categoryId/products` (create) and `/v1/admin/products/:productId` (update). Variants and inventory are handled via `/v1/admin/products/:productId/variants`, `/v1/admin/variants/:variantId`, and `/v1/admin/inventory/:productId`.
- **Courier**: `/v1/courier/online` toggle, `/v1/courier/location` for location updates, `/v1/courier/tasks/:id/accept` and `/v1/courier/tasks/:id/status` for task handling (JWT Bearer with COURIER role).
- **Admin (Tasks/Courier Oversight)**: `/v1/admin/tasks` list/get, `/v1/admin/tasks/:id/assign` to set a courier (by courierId or userId), and `/v1/admin/tasks/:id/status` to advance delivery statuses with audit events (ADMIN/OPS role required).
- **Partner Catalog**: `/v1/partner/catalog` (GET) lists the partner-linked store with categories/products/variants/inventory. Updates: `PUT /v1/partner/products/:id` (price/active), `PUT /v1/partner/products/:id/inventory` (quantity), `PUT /v1/partner/variants/:id` (name/price). Requires PARTNER role JWT and partner-store linkage.

## Box / Courier (in progress)
- **Estimate shipment**: `POST /v1/box/estimate` calculates distance-based delivery fee for a region.
- **Create shipment**: `POST /v1/box/shipments` creates a BOX order with delivery task metadata.
- **Shipment detail**: `GET /v1/box/shipments/:id` returns status, pricing, and delivery task progress.

More domains (Box, Wallet, Orders, Admin, Partner, Courier) will be added iteratively.
