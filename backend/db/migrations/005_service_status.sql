-- =====================================================================
-- GAMIFICATION Fase 1: Maskin-sundhedsscore + driftstimer
-- =====================================================================
-- Sporer driftstimer og seneste service pr. garage-maskine. Sundhedsscoren
-- beregnes af timer siden sidste service i forhold til maskinkategoriens
-- serviceinterval. Danner samtidig data-rygraden for Fase 2 (slid) og senere
-- prædiktiv vedligehold.
-- ---------------------------------------------------------------------

CREATE TABLE machine_service_status (
    garage_id          UUID PRIMARY KEY REFERENCES user_garages(id) ON DELETE CASCADE,
    current_hours      INTEGER     NOT NULL DEFAULT 0 CHECK (current_hours >= 0),
    last_service_hours INTEGER     NOT NULL DEFAULT 0 CHECK (last_service_hours >= 0),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Anbefalet serviceinterval (driftstimer) pr. maskinkategori.
CREATE TABLE service_intervals (
    category       VARCHAR(40) PRIMARY KEY,
    interval_hours INTEGER NOT NULL CHECK (interval_hours > 0)
);

INSERT INTO service_intervals (category, interval_hours) VALUES
    ('excavator',      500),
    ('mini_excavator', 400),
    ('wheel_loader',   500),
    ('bulldozer',      500),
    ('skid_steer',     400),
    ('other',          500);
