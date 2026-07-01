-- =====================================================================
-- MODULE 3: Dealer Portal & Quick Order (Track 2)
-- =====================================================================
-- OEM cross-referencing: external manufacturer part numbers -> internal SKU.
-- A single internal SKU may be referenced by many OEM numbers (Cat, Komatsu,
-- Hitachi and aftermarket brands can all name the same physical part).
-- ---------------------------------------------------------------------

CREATE TABLE oem_mappings (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    oem_number    VARCHAR(80) NOT NULL,                 -- external manufacturer number
    manufacturer  VARCHAR(80),                          -- e.g. 'Caterpillar', 'Bridgestone'
    part_id       UUID NOT NULL REFERENCES parts(id) ON DELETE CASCADE,
    is_primary    BOOLEAN NOT NULL DEFAULT FALSE,        -- the canonical OEM ref for the part
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- The same OEM number from the same manufacturer maps to exactly one part.
    UNIQUE (oem_number, manufacturer)
);

-- OEM lookups are the hot path of the Dealer Portal — index on the search key.
-- Normalize to upper-case for case-insensitive matching in the lookup query.
CREATE INDEX idx_oem_mappings_number ON oem_mappings (UPPER(oem_number));
CREATE INDEX idx_oem_mappings_part   ON oem_mappings (part_id);
