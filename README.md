# Scanbolt — Heavy Machinery Spare Parts Platform

A scalable, modular architecture for a **hybrid B2B/B2C e-commerce platform**
specializing in heavy machinery spare parts (excavators, final drives, rubber
tracks).

The platform is delivered as two interconnected tracks that share a single
identity core and catalog:

| Track | Audience | Key features |
|-------|----------|--------------|
| **Track 1 — "My Garage"** | Machine owners (B2C) + Dealer "Fleet" version | Save machines, machine→part fitment, per-job fleet references |
| **Track 2 — "Dealer Portal"** | High-volume B2B workshops | Quick Order matrix, CSV bulk order, OEM cross-referencing, tier pricing |

---

## Repository layout

```
.
├── backend/                     # Node.js + Express + TypeScript API
│   ├── db/
│   │   ├── migrations/          # PostgreSQL schema, one file per module
│   │   └── seed.sql
│   └── src/
│       ├── db/pool.ts           # pg connection pool + typed query helper
│       ├── types/               # Shared domain types
│       ├── middleware/auth.ts   # MODULE 1 — authentication + role gating
│       └── modules/
│           ├── identity/        # MODULE 1 — auth & role management
│           ├── garage/          # MODULE 2 — machines & My Garage
│           ├── products/        # MODULE 2 — fitment-filtered catalog
│           ├── dealer/          # MODULE 3 — quick order, OEM, CSV
│           ├── pricing/         # MODULE 4 — B2B pricing / ERP sim
│           └── checkout/        # MODULE 4 — job-referenced checkout
│
└── frontend/                    # Next.js (App Router) + Tailwind + TypeScript
    └── src/
        ├── lib/                 # API client + shared types
        ├── context/AuthContext  # MODULE 1 — role-aware global state
        ├── app/garage/          # MODULE 2 — My Garage dashboard
        └── components/dealer/    # MODULE 3 — Quick Order + CSV uploader
```

## How the two tracks interconnect

```
                 ┌─────────────────────────────┐
                 │   MODULE 1: Identity Core     │
                 │  users · roles · user_roles   │
                 │  role ∈ { standard_buyer,     │
                 │           dealer }            │
                 └───────────────┬───────────────┘
                                 │ role decides UI + API access
              ┌──────────────────┴───────────────────┐
              ▼                                        ▼
   ┌────────────────────┐                  ┌──────────────────────────┐
   │ TRACK 1: My Garage │                  │  TRACK 2: Dealer Portal  │
   │ (all users)        │                  │  (role = dealer only)    │
   │                    │  fleet job_id    │                          │
   │ machines           │◄────────────────►│ quick-order / oem-lookup │
   │ garage → fitment   │  attaches to     │ csv-upload → cart        │
   │ filtered products  │  checkout        │ tier pricing (MODULE 4)  │
   └────────────────────┘                  └──────────────────────────┘
```

A dealer's **Fleet Garage** entry (`customer_name` / `job_id`) flows all the way
to checkout metadata (Module 4), so every B2B order is invoiced against the
right customer job.

See each module's source directory for schema, endpoints, and components. This
repository is a reference blueprint: it is fully typed and internally
consistent, and is structured so each module can be developed and deployed
independently.
