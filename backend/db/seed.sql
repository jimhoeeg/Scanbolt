-- =====================================================================
-- Seed data — run AFTER all migrations (001 → 007).
-- Passwords below are bcrypt hashes of 'password123' (demo only).
-- =====================================================================

-- --- Users -----------------------------------------------------------
-- Fixed UUIDs so cross-references stay readable.
INSERT INTO users (id, email, password_hash, full_name, company_name) VALUES
  ('11111111-1111-1111-1111-111111111111', 'owner@example.com',
   '$2a$10$abcdefghijklmnopqrstuv0123456789ABCDEFGHIJKLMNOPQRSTU', 'Sam Owner', NULL),
  ('22222222-2222-2222-2222-222222222222', 'dealer@bigworkshop.com',
   '$2a$10$abcdefghijklmnopqrstuv0123456789ABCDEFGHIJKLMNOPQRSTU', 'Dana Dealer', 'Big Workshop Ltd');

INSERT INTO user_roles (user_id, role_id)
SELECT '11111111-1111-1111-1111-111111111111', id FROM roles WHERE name = 'standard_buyer';
INSERT INTO user_roles (user_id, role_id)
SELECT '22222222-2222-2222-2222-222222222222', id FROM roles WHERE name = 'dealer';

INSERT INTO dealer_profiles (user_id, account_number, pricing_tier, credit_limit, erp_customer_id)
VALUES ('22222222-2222-2222-2222-222222222222', 'D-10045', 'gold', 50000, 'BC-CUST-10045');

-- --- Machines --------------------------------------------------------
INSERT INTO machines (id, brand, model, year_from, year_to, category) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'Caterpillar', '320D', 2006, 2012, 'excavator'),
  ('a0000000-0000-0000-0000-000000000002', 'Komatsu',     'PC200-8', 2007, 2015, 'excavator'),
  ('a0000000-0000-0000-0000-000000000003', 'Bobcat',      'E35',  2013, NULL, 'mini_excavator');

-- --- Parts -----------------------------------------------------------
INSERT INTO parts (id, sku, title, oem_number, category, price, stock_qty) VALUES
  ('b0000000-0000-0000-0000-000000000001', 'FD-CAT-320D',  'Final Drive Assembly — Cat 320D', '227-6949', 'final_drive', 3450.00, 8),
  ('b0000000-0000-0000-0000-000000000002', 'RT-400X72.5',  'Rubber Track 400x72.5x74',        '87460579', 'rubber_track', 690.00, 40),
  ('b0000000-0000-0000-0000-000000000003', 'FD-PC200',     'Final Drive — Komatsu PC200-8',   '20Y-27-00432', 'final_drive', 3980.00, 5),
  ('b0000000-0000-0000-0000-000000000004', 'RT-300X52.5',  'Rubber Track 300x52.5x84 (Bobcat E35)', '6689277', 'rubber_track', 520.00, 22),
  ('b0000000-0000-0000-0000-000000000005', 'FILT-HYD-01',  'Hydraulic Filter — universal',    '093-7521', 'filter', 42.50, 300);

-- --- Fitment (machine_parts_compatibility) ---------------------------
INSERT INTO machine_parts_compatibility (machine_id, part_id, position, verified) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'left',  TRUE),
  ('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002', NULL,    TRUE),
  ('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000005', NULL,    TRUE),
  ('a0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000003', 'right', TRUE),
  ('a0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000005', NULL,    TRUE),
  ('a0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000004', NULL,    TRUE);

-- --- OEM cross-references --------------------------------------------
INSERT INTO oem_mappings (oem_number, manufacturer, part_id, is_primary) VALUES
  ('227-6949',     'Caterpillar', 'b0000000-0000-0000-0000-000000000001', TRUE),
  ('2276949',      'Caterpillar', 'b0000000-0000-0000-0000-000000000001', FALSE),
  ('87460579',     'Bridgestone', 'b0000000-0000-0000-0000-000000000002', TRUE),
  ('20Y-27-00432', 'Komatsu',     'b0000000-0000-0000-0000-000000000003', TRUE),
  ('6689277',      'Bobcat',      'b0000000-0000-0000-0000-000000000004', TRUE),
  ('093-7521',     'Caterpillar', 'b0000000-0000-0000-0000-000000000005', TRUE);

-- --- Dealer fleet garage entries -------------------------------------
INSERT INTO user_garages (user_id, machine_id, customer_name, job_id, serial_number) VALUES
  ('22222222-2222-2222-2222-222222222222', 'a0000000-0000-0000-0000-000000000001', 'Acme Excavation', 'JOB-2026-014', 'CAT320D-88213'),
  ('22222222-2222-2222-2222-222222222222', 'a0000000-0000-0000-0000-000000000002', 'Northern Quarry',  'JOB-2026-021', 'PC200-55901');

-- --- Standard buyer garage entry -------------------------------------
INSERT INTO user_garages (user_id, machine_id, nickname) VALUES
  ('11111111-1111-1111-1111-111111111111', 'a0000000-0000-0000-0000-000000000003', 'My mini digger');

-- --- A negotiated contract price for the gold dealer -----------------
INSERT INTO contract_prices (user_id, part_id, unit_price) VALUES
  ('22222222-2222-2222-2222-222222222222', 'b0000000-0000-0000-0000-000000000002', 610.00);

-- --- Service status pr. garage-maskine (Fase 1) ----------------------
-- Varierede timer, så sundhedsscoren viser grøn/gul/rød i demoen.
INSERT INTO machine_service_status (garage_id, current_hours, last_service_hours)
SELECT g.id,
       CASE m.model WHEN '320D' THEN 6120 WHEN 'PC200-8' THEN 9450 ELSE 1780 END,
       CASE m.model WHEN '320D' THEN 5900 WHEN 'PC200-8' THEN 9000 ELSE 1720 END
  FROM user_garages g
  JOIN machines m ON m.id = g.machine_id;
