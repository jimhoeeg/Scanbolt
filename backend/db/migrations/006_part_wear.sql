-- =====================================================================
-- GAMIFICATION Fase 2: Slid-estimat & restlevetid
-- =====================================================================
-- Tilføjer forventet levetid (driftstimer) til sliddele. Bruges til at
-- estimere slid% og restlevetid ud fra maskinens timetal (Fase 1).
-- Kun sliddele (undervogn/bælter/drev) får en levetid; forbrugsvarer som
-- filtre og ikke-slid-komponenter forbliver NULL og indgår ikke i slid-visningen.
-- ---------------------------------------------------------------------

ALTER TABLE parts ADD COLUMN wear_life_hours INTEGER
    CHECK (wear_life_hours IS NULL OR wear_life_hours > 0);

UPDATE parts SET wear_life_hours = 8000 WHERE category = 'final_drive';
UPDATE parts SET wear_life_hours = 3000 WHERE category = 'rubber_track';
UPDATE parts SET wear_life_hours = 6000 WHERE category = 'undercarriage';
-- filter / hydraulics / engine / other bevidst NULL (ikke slid-sporet her).
