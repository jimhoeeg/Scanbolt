-- =====================================================================
-- GAMIFICATION Fase 5: XP / niveau-system
-- =====================================================================
-- Let ledger der belønner handlinger (log timer, service, tilføj maskine,
-- læs guide, afgiv ordre). Brugerens niveau/rang afledes af summen af point.
-- ---------------------------------------------------------------------

CREATE TABLE xp_events (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action     VARCHAR(32) NOT NULL,          -- fx 'service_logged', 'guide_read'
    points     INTEGER     NOT NULL,
    ref        VARCHAR(120),                  -- fx artikel-slug eller garage-id
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_xp_events_user ON xp_events(user_id, created_at DESC);

-- Idempotens for engangs-handlinger (fx læs guide én gang pr. artikel).
CREATE UNIQUE INDEX uq_xp_events_once
    ON xp_events(user_id, action, ref)
    WHERE ref IS NOT NULL;
