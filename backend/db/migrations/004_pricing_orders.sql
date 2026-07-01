-- =====================================================================
-- MODULE 4: B2B Pricing & ERP Sync + job-referenced checkout
-- =====================================================================
-- Dealer discounts by tier, volume price-breaks, and orders whose metadata
-- carries the fleet job_id / customer_name for invoicing.
-- ---------------------------------------------------------------------

-- --- pricing_tiers ---------------------------------------------------
-- Base discount percentage per dealer tier. Mirrors the tier stored on
-- dealer_profiles.pricing_tier. In production this is synced from the ERP.
CREATE TABLE pricing_tiers (
    tier            VARCHAR(16) PRIMARY KEY
                    CHECK (tier IN ('bronze','silver','gold','platinum')),
    base_discount   NUMERIC(5,2) NOT NULL CHECK (base_discount BETWEEN 0 AND 100),
    description     TEXT
);

INSERT INTO pricing_tiers (tier, base_discount, description) VALUES
    ('bronze',    5.00,  'Entry dealer — 5% off list'),
    ('silver',   10.00,  'Established dealer — 10% off list'),
    ('gold',     15.00,  'High-volume workshop — 15% off list'),
    ('platinum', 22.00,  'Strategic partner — 22% off list');

-- --- price_breaks ----------------------------------------------------
-- Volume-based tiered pricing. Extra discount once quantity thresholds are
-- crossed. Can be global (part_id NULL) or part-specific.
CREATE TABLE price_breaks (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    part_id        UUID REFERENCES parts(id) ON DELETE CASCADE,   -- NULL = applies to all parts
    tier           VARCHAR(16) REFERENCES pricing_tiers(tier),    -- NULL = applies to all tiers
    min_quantity   INTEGER NOT NULL CHECK (min_quantity > 1),
    extra_discount NUMERIC(5,2) NOT NULL CHECK (extra_discount BETWEEN 0 AND 100),
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_price_breaks_part ON price_breaks(part_id, min_quantity DESC);

-- Sensible global volume breaks (apply to every part / tier).
INSERT INTO price_breaks (part_id, tier, min_quantity, extra_discount) VALUES
    (NULL, NULL,  5, 2.00),
    (NULL, NULL, 10, 4.00),
    (NULL, NULL, 25, 7.00);

-- --- contract_prices -------------------------------------------------
-- Custom negotiated per-dealer, per-part price that overrides tier logic.
CREATE TABLE contract_prices (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    part_id       UUID NOT NULL REFERENCES parts(id) ON DELETE CASCADE,
    unit_price    NUMERIC(12,2) NOT NULL CHECK (unit_price >= 0),
    valid_until   DATE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, part_id)
);

-- --- orders ----------------------------------------------------------
CREATE TABLE orders (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    status          VARCHAR(20) NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','confirmed','shipped','cancelled')),
    currency        CHAR(3)     NOT NULL DEFAULT 'USD',
    subtotal        NUMERIC(12,2) NOT NULL DEFAULT 0,
    discount_total  NUMERIC(12,2) NOT NULL DEFAULT 0,
    grand_total     NUMERIC(12,2) NOT NULL DEFAULT 0,
    -- Fleet / invoicing metadata carried over from the dealer's garage entry.
    job_id          VARCHAR(80),
    customer_name   VARCHAR(160),
    erp_reference   VARCHAR(64),                         -- id returned by Business Central sim
    metadata        JSONB       NOT NULL DEFAULT '{}',   -- free-form (PO number, notes, ...)
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_orders_user ON orders(user_id);
CREATE INDEX idx_orders_job  ON orders(job_id) WHERE job_id IS NOT NULL;

-- --- order_items -----------------------------------------------------
CREATE TABLE order_items (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id       UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    part_id        UUID NOT NULL REFERENCES parts(id)  ON DELETE RESTRICT,
    sku            VARCHAR(48) NOT NULL,                 -- snapshot at order time
    title          VARCHAR(200) NOT NULL,               -- snapshot at order time
    quantity       INTEGER NOT NULL CHECK (quantity > 0),
    unit_list_price NUMERIC(12,2) NOT NULL,              -- standard price before B2B logic
    unit_net_price  NUMERIC(12,2) NOT NULL,              -- price actually charged (post discount)
    line_total      NUMERIC(12,2) NOT NULL
);

CREATE INDEX idx_order_items_order ON order_items(order_id);
