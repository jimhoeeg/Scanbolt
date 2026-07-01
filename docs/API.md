# Scanbolt REST API Specification

Base URL: `/api` · All responses JSON · Auth via `Authorization: Bearer <jwt>`.

Error shape (all endpoints):
```json
{ "error": "human readable message" }
```

---

## MODULE 1 — Identity & Roles

| Method | Path | Auth | Body | Success |
|--------|------|------|------|---------|
| POST | `/api/auth/register` | — | `{ email, password, fullName, role?, companyName? }` | `201 { user, token }` |
| POST | `/api/auth/login` | — | `{ email, password }` | `200 { user, token }` |
| GET  | `/api/auth/me` | Bearer | — | `200 { user }` |

`role` is coerced to `standard_buyer` unless `dealer` is explicitly requested.
`user` = `{ id, email, fullName, companyName, roles: RoleName[] }`.

**Gating:** `requireRole('dealer')` → `403 { error, requiredRole, yourRoles }`.

---

## MODULE 2 — Machine DB & My Garage (Track 1)

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| GET | `/api/garage` | Bearer | Returns `{ entries, isDealer }`. Fleet fields (`customerName`, `jobId`) only populated for dealers. |
| POST | `/api/garage` | Bearer | Body `{ machineId, nickname?, customerName?, jobId?, serialNumber? }`. Fleet fields ignored for standard buyers. → `201 { entry }` |
| DELETE | `/api/garage/:id` | Bearer | Deletes only if entry belongs to caller. → `204` |
| GET | `/api/products?machine_id=XYZ` | — | Fitment-filtered parts for one machine. Without `machine_id`, returns paginated catalog (`?category=&limit=&offset=`). |

`GarageEntry` = `{ id, machine, nickname, customerName, jobId, serialNumber, createdAt }`.

---

## MODULE 3 — Dealer Portal (Track 2) — role `dealer` only

| Method | Path | Body | Returns |
|--------|------|------|---------|
| POST | `/api/dealer/quick-order` | `{ lines: [{ sku, quantity }] }` | `{ items: ResolvedLine[], grandTotal }` — validates stock + B2B price per line |
| POST | `/api/dealer/oem-lookup` | `{ oemNumber }` | `{ oemNumber, matched, sku?, title?, manufacturer?, availableStock?, inStock? }` |
| POST | `/api/dealer/upload-csv` | multipart `file` (.csv) | `{ totalRows, validCount, invalidCount, rows: CsvRow[] }` |

CSV accepts `sku,quantity` or `oem_number,quantity` (header optional). Each
returned row carries `resolved` + an `error` string for invalid lines so the
UI can highlight them; OEM rows are resolved to SKUs server-side.

`ResolvedLine` = `{ sku, title, quantity, availableStock, inStock, listPrice, netUnitPrice, discountPct, lineTotal, error? }`.

---

## MODULE 4 — B2B Pricing & Checkout

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| POST | `/api/checkout` | Bearer | Body `{ lines: [{ sku, quantity }], garageId?, poNumber? }`. For dealers, `garageId` copies that garage entry's `jobId` / `customerName` onto the order and triggers ERP sync. |

Pricing precedence (`calculateB2BPrice`):
1. **Contract price** (`contract_prices`) — overrides everything.
2. **Tier base discount** (`pricing_tiers` via `dealer_profiles.pricing_tier`)
   **+ best volume price-break** (`price_breaks`), capped at 60%.

Checkout response: `{ orderId, subtotal, discountTotal, grandTotal, jobId, customerName, erpReference }`.
`erpReference` comes from `simulateErpSync` (Business Central stand-in) and is
persisted on the order for invoicing.
