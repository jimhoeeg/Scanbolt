-- =====================================================================
-- MODULE 2: Machine Database & "My Garage" (Track 1)
-- =====================================================================
-- Maps machine brand/model/year to internal part SKUs and lets users
-- save machines to a personal (or fleet) garage.
-- Relational integrity here is the heart of the platform: a wrong
-- fitment mapping ships the wrong final drive.
-- ---------------------------------------------------------------------

-- --- machines --------------------------------------------------------
CREATE TABLE machines (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brand       VARCHAR(80)  NOT NULL,                 -- e.g. 'Caterpillar', 'Komatsu'
    model       VARCHAR(80)  NOT NULL,                 -- e.g. '320D', 'PC200-8'
    year_from   SMALLINT     NOT NULL,                 -- production window start
    year_to     SMALLINT,                              -- NULL = still produced
    category    VARCHAR(40)  NOT NULL                  -- e.g. 'excavator', 'wheel_loader'
                CHECK (category IN ('excavator','wheel_loader','bulldozer','skid_steer','mini_excavator','other')),
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    -- A brand+model+year window is unique; guards against duplicate machine records.
    UNIQUE (brand, model, year_from)
);

CREATE INDEX idx_machines_brand_model ON machines(brand, model);
CREATE INDEX idx_machines_category    ON machines(category);

-- --- parts -----------------------------------------------------------
CREATE TABLE parts (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sku           VARCHAR(48)  NOT NULL UNIQUE,         -- internal stock keeping unit
    title         VARCHAR(200) NOT NULL,
    description   TEXT,
    oem_number    VARCHAR(80),                          -- primary OEM ref (cross-refs live in oem_mappings)
    category      VARCHAR(40)  NOT NULL DEFAULT 'other' -- 'final_drive','rubber_track','undercarriage','filter',...
                  CHECK (category IN ('final_drive','rubber_track','undercarriage','hydraulics','engine','filter','other')),
    price         NUMERIC(12,2) NOT NULL CHECK (price >= 0),  -- standard (B2C) price, minor-unit safe
    currency      CHAR(3)      NOT NULL DEFAULT 'USD',
    stock_qty     INTEGER      NOT NULL DEFAULT 0 CHECK (stock_qty >= 0),
    weight_kg     NUMERIC(8,2),
    is_active     BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX idx_parts_oem_number ON parts(oem_number);
CREATE INDEX idx_parts_category   ON parts(category);

-- --- machine_parts_compatibility (many-to-many) ----------------------
-- The fitment matrix: which parts fit which machine model.
CREATE TABLE machine_parts_compatibility (
    machine_id  UUID NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
    part_id     UUID NOT NULL REFERENCES parts(id)    ON DELETE CASCADE,
    position    VARCHAR(40),                            -- e.g. 'left', 'right', 'front' where relevant
    notes       TEXT,
    verified    BOOLEAN NOT NULL DEFAULT FALSE,         -- fitment confirmed by catalog team
    PRIMARY KEY (machine_id, part_id)
);

-- Fast lookup of "all parts for machine X" (the products-by-machine query).
CREATE INDEX idx_mpc_machine ON machine_parts_compatibility(machine_id);
CREATE INDEX idx_mpc_part    ON machine_parts_compatibility(part_id);

-- --- user_garages ----------------------------------------------------
-- Maps a user to a saved machine. Dealers use the optional fleet fields
-- (customer_name / job_id) to manage machines on behalf of their customers.
CREATE TABLE user_garages (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID NOT NULL REFERENCES users(id)    ON DELETE CASCADE,
    machine_id    UUID NOT NULL REFERENCES machines(id) ON DELETE RESTRICT,
    nickname      VARCHAR(80),                          -- B2C: "My digger"
    -- Fleet / dealer fields (NULL for standard buyers) --------------
    customer_name VARCHAR(160),                         -- end-customer this machine belongs to
    job_id        VARCHAR(80),                          -- dealer internal job / work-order reference
    serial_number VARCHAR(80),
    notes         TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- Dealers may save the same model for different jobs, so uniqueness
    -- includes job_id when present.
    UNIQUE (user_id, machine_id, job_id)
);

CREATE INDEX idx_user_garages_user ON user_garages(user_id);
CREATE INDEX idx_user_garages_job  ON user_garages(job_id) WHERE job_id IS NOT NULL;

-- Postgres treats NULLs as distinct in UNIQUE constraints, so the B2C case
-- (job_id IS NULL) needs a partial unique index to prevent saving the same
-- machine twice without a job reference.
CREATE UNIQUE INDEX uq_user_garages_no_job
    ON user_garages(user_id, machine_id)
    WHERE job_id IS NULL;
