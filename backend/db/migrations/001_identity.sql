-- =====================================================================
-- MODULE 1: Identity & Role Management (The Core)
-- =====================================================================
-- Authentication + role gating for two roles: 'standard_buyer' and 'dealer'.
-- Uses a users / roles / user_roles triad so the role model can grow
-- (e.g. 'admin', 'fleet_manager') without schema churn.
-- ---------------------------------------------------------------------

CREATE EXTENSION IF NOT EXISTS "pgcrypto"; -- for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "citext";   -- case-insensitive email

-- --- roles -----------------------------------------------------------
CREATE TABLE roles (
    id          SMALLSERIAL PRIMARY KEY,
    name        VARCHAR(32) NOT NULL UNIQUE,          -- 'standard_buyer' | 'dealer'
    description TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed the two core roles the platform gatekeeps on.
INSERT INTO roles (name, description) VALUES
    ('standard_buyer', 'Regular machine owner (B2C) with access to shop + My Garage'),
    ('dealer',         'B2B workshop with access to Dealer Portal, fleet garage and tier pricing');

-- --- users -----------------------------------------------------------
CREATE TABLE users (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email         CITEXT      NOT NULL UNIQUE,          -- case-insensitive (citext extension)
    password_hash TEXT        NOT NULL,                -- bcrypt hash, never the raw password
    full_name     VARCHAR(160) NOT NULL,
    company_name  VARCHAR(160),                        -- populated for dealers
    phone         VARCHAR(40),
    is_active     BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- --- user_roles (many-to-many) ---------------------------------------
-- A user *can* hold multiple roles; the auth layer resolves the highest
-- privilege for gating decisions.
CREATE TABLE user_roles (
    user_id     UUID     NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id     SMALLINT NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, role_id)
);

CREATE INDEX idx_user_roles_user ON user_roles(user_id);

-- --- dealer_profiles -------------------------------------------------
-- Dealer-only attributes used by MODULE 4 pricing. Kept separate from
-- `users` so B2C accounts stay lean and dealer onboarding is explicit.
CREATE TABLE dealer_profiles (
    user_id         UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    account_number  VARCHAR(40) UNIQUE,                -- external ERP account id
    pricing_tier    VARCHAR(16) NOT NULL DEFAULT 'bronze'
                    CHECK (pricing_tier IN ('bronze', 'silver', 'gold', 'platinum')),
    credit_limit    NUMERIC(12,2) DEFAULT 0,
    erp_customer_id VARCHAR(64),                        -- Business Central customer no.
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Keep updated_at fresh on any user mutation.
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
