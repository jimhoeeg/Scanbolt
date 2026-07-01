-- =====================================================================
-- GAMIFICATION Fase 3: Forhandler tier-progression
-- =====================================================================
-- Årlig omsætningsgrænse pr. tier, så forhandlere kan se hvor langt der er
-- til næste niveau. Bruges sammen med orders (YTD-forbrug) til progressbaren.
-- ---------------------------------------------------------------------

ALTER TABLE pricing_tiers ADD COLUMN min_annual_spend NUMERIC(12,2) NOT NULL DEFAULT 0;

UPDATE pricing_tiers SET min_annual_spend =      0 WHERE tier = 'bronze';
UPDATE pricing_tiers SET min_annual_spend =  25000 WHERE tier = 'silver';
UPDATE pricing_tiers SET min_annual_spend =  75000 WHERE tier = 'gold';
UPDATE pricing_tiers SET min_annual_spend = 200000 WHERE tier = 'platinum';
