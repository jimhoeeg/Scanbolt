-- =====================================================================
-- GAMIFICATION Fase 4: Vedligeholds-logbog & streaks
-- =====================================================================
-- Digital servicehistorik pr. garage-maskine. Bruges til tidslinje,
-- "serviceret N gange" og på-tid-streak (afledt af timetal mellem services).
-- ---------------------------------------------------------------------

CREATE TABLE maintenance_log (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    garage_id  UUID        NOT NULL REFERENCES user_garages(id) ON DELETE CASCADE,
    user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type       VARCHAR(20) NOT NULL
               CHECK (type IN ('service', 'repair', 'inspection', 'part_replaced', 'note')),
    title      VARCHAR(200) NOT NULL,
    hours      INTEGER,                       -- driftstimer på logtidspunktet
    sku        VARCHAR(48),                   -- udskiftet del (valgfrit)
    logged_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_maintenance_log_garage ON maintenance_log(garage_id, logged_at DESC);
CREATE INDEX idx_maintenance_log_user   ON maintenance_log(user_id);
