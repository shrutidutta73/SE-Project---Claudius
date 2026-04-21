-- =============================================================================
-- Bombay Fashion — Reference Seed (Static Fixture)
-- =============================================================================
--
-- This file mirrors the **static** records created by `npm run db:seed`
-- (scripts/seed.ts). The TypeScript script is the authoritative source —
-- it runs inside a transaction, hashes credentials with bcrypt, and then
-- additionally generates ~90 days of sales, attendance, and reorders
-- programmatically (too bulky to express by hand here).
--
-- Prefer:
--   npm run db:seed     -- preferred, runs scripts/seed.ts
--
-- This SQL file is useful for:
--   * documentation of the reference catalog
--   * manual "smoke seed" when you only need users + inventory and
--     don't care about historical sales data
--
-- !! PASSWORD / PIN HASHES !!
--   Every *_hash below is the sentinel string __REPLACE_WITH_REAL_HASH__.
--   It will NOT authenticate. Use the npm script, or replace each sentinel
--   with a real bcrypt hash, e.g.:
--     node -e "const b=require('bcrypt'); console.log(b.hashSync('Owner@123', 10))"
--
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Store
-- -----------------------------------------------------------------------------
INSERT INTO stores (id, name, address, gps_latitude, gps_longitude, gps_radius_m, billing_mode)
VALUES (
  1,
  'Bombay Fashion',
  'Shop No. 24, Linking Road, Bandra West, Mumbai, Maharashtra 400050',
  19.0608,
  72.8345,
  200,
  'structured'
);

-- -----------------------------------------------------------------------------
-- 2. Users — 1 owner, 2 managers, 10 staff
-- -----------------------------------------------------------------------------

-- Owner
INSERT INTO users (id, store_id, name, phone, email, role, password_hash, is_active)
VALUES (1, 1, 'Ramesh Sharma', '9876500001', 'ramesh@bombayfashion.in', 'owner',
        '__REPLACE_WITH_REAL_HASH__', TRUE); -- bcrypt of 'Owner@123'

-- Managers
INSERT INTO users (id, store_id, name, phone, email, role, password_hash, is_active)
VALUES
  (2, 1, 'Mohit Anand Kumar', '9876500002', 'mohit@bombayfashion.in', 'manager',
   '__REPLACE_WITH_REAL_HASH__', TRUE), -- bcrypt of 'Manager@123'
  (3, 1, 'Anita Verma',       '9876500003', 'anita@bombayfashion.in', 'manager',
   '__REPLACE_WITH_REAL_HASH__', TRUE); -- bcrypt of 'Manager@123'

-- Staff (PIN login)
INSERT INTO users (id, store_id, name, phone, role, pin_hash, is_active)
VALUES
  (4,  1, 'Rahul Kumar',   '9876500010', 'staff', '__REPLACE_WITH_REAL_HASH__', TRUE), -- PIN 1234
  (5,  1, 'Priya Singh',   '9876500011', 'staff', '__REPLACE_WITH_REAL_HASH__', TRUE), -- PIN 5678
  (6,  1, 'Amit Yadav',    '9876500012', 'staff', '__REPLACE_WITH_REAL_HASH__', TRUE), -- PIN 9012
  (7,  1, 'Sneha Gupta',   '9876500013', 'staff', '__REPLACE_WITH_REAL_HASH__', TRUE), -- PIN 1111
  (8,  1, 'Vikram Desai',  '9876500014', 'staff', '__REPLACE_WITH_REAL_HASH__', TRUE), -- PIN 2222
  (9,  1, 'Kavita Sharma', '9876500015', 'staff', '__REPLACE_WITH_REAL_HASH__', TRUE), -- PIN 3333
  (10, 1, 'Rohit Mishra',  '9876500016', 'staff', '__REPLACE_WITH_REAL_HASH__', TRUE), -- PIN 4444
  (11, 1, 'Deepa Tiwari',  '9876500017', 'staff', '__REPLACE_WITH_REAL_HASH__', TRUE), -- PIN 5555
  (12, 1, 'Arjun Patel',   '9876500018', 'staff', '__REPLACE_WITH_REAL_HASH__', TRUE), -- PIN 6666
  (13, 1, 'Meera Nair',    '9876500019', 'staff', '__REPLACE_WITH_REAL_HASH__', TRUE); -- PIN 7777

UPDATE stores SET owner_id = 1 WHERE id = 1;

SELECT setval('users_id_seq',  (SELECT MAX(id) FROM users));
SELECT setval('stores_id_seq', (SELECT MAX(id) FROM stores));

-- -----------------------------------------------------------------------------
-- 3. Categories
-- -----------------------------------------------------------------------------
INSERT INTO categories (id, store_id, name) VALUES
  (1, 1, 'Shirts'),
  (2, 1, 'Trousers'),
  (3, 1, 'Sarees'),
  (4, 1, 'Kurtis'),
  (5, 1, 'Suits'),
  (6, 1, 'Bikini');

SELECT setval('categories_id_seq', (SELECT MAX(id) FROM categories));

-- -----------------------------------------------------------------------------
-- 4. Price Bands
-- -----------------------------------------------------------------------------

-- Shirts (5)
INSERT INTO price_bands (id, store_id, category_id, price, is_active) VALUES
  (1, 1, 1, 299.00, TRUE), (2, 1, 1, 399.00, TRUE), (3, 1, 1, 499.00, TRUE),
  (4, 1, 1, 599.00, TRUE), (5, 1, 1, 799.00, TRUE);
-- Trousers (4)
INSERT INTO price_bands (id, store_id, category_id, price, is_active) VALUES
  (6, 1, 2, 399.00, TRUE), (7, 1, 2, 499.00, TRUE),
  (8, 1, 2, 599.00, TRUE), (9, 1, 2, 799.00, TRUE);
-- Sarees (5)
INSERT INTO price_bands (id, store_id, category_id, price, is_active) VALUES
  (10, 1, 3, 599.00, TRUE), (11, 1, 3, 799.00, TRUE),
  (12, 1, 3, 1099.00, TRUE), (13, 1, 3, 1499.00, TRUE),
  (14, 1, 3, 1999.00, TRUE);
-- Kurtis (4)
INSERT INTO price_bands (id, store_id, category_id, price, is_active) VALUES
  (15, 1, 4, 299.00, TRUE), (16, 1, 4, 399.00, TRUE),
  (17, 1, 4, 499.00, TRUE), (18, 1, 4, 699.00, TRUE);
-- Suits (3)
INSERT INTO price_bands (id, store_id, category_id, price, is_active) VALUES
  (19, 1, 5, 1499.00, TRUE), (20, 1, 5, 1999.00, TRUE),
  (21, 1, 5, 2999.00, TRUE);
-- Bikini (4) — Bandra beachwear
INSERT INTO price_bands (id, store_id, category_id, price, is_active) VALUES
  (22, 1, 6,  799.00, TRUE), (23, 1, 6, 1299.00, TRUE),
  (24, 1, 6, 1799.00, TRUE), (25, 1, 6, 2499.00, TRUE);

SELECT setval('price_bands_id_seq', (SELECT MAX(id) FROM price_bands));

-- -----------------------------------------------------------------------------
-- 5. Vendors
-- -----------------------------------------------------------------------------
INSERT INTO vendors (id, store_id, name, phone, email, city, notes, is_active) VALUES
  (1, 1, 'Krishna Textiles', '9898989898', 'krishna@ktextiles.com',    'Surat',    'Primary saree & suit supplier, 5-day lead time',                    TRUE),
  (2, 1, 'Mehta Fabrics',    '9797979797', 'orders@mehtafabrics.in',   'Mumbai',   'Shirts and trousers wholesale, 3-day lead time',                    TRUE),
  (3, 1, 'Jain Garments',    '9696969696', 'jain.garments@gmail.com',  'Delhi',    'Budget kurtis and casual shirts, 7-day lead time',                  TRUE),
  (4, 1, 'Ramesh Weavers',   '9595959595', 'contact@rameshweavers.in', 'Varanasi', 'Handloom Banarasi sarees and suits, 10-day lead time',              TRUE),
  (5, 1, 'Azure Swim Co.',   '9494949494', 'orders@azureswim.in',      'Goa',      'Beach and resort-wear, bikini & swimsuit specialists, 4-day lead time', TRUE);

SELECT setval('vendors_id_seq', (SELECT MAX(id) FROM vendors));

-- -----------------------------------------------------------------------------
-- 6. Starter Inventory Batches (one per band — 90-day history generated by
--    scripts/seed.ts adds several more per band in real demo runs)
-- -----------------------------------------------------------------------------
INSERT INTO inventory_batches
  (id, store_id, price_band_id, vendor_id, quantity_added, quantity_remaining, cost_price, added_by, notes)
VALUES
  -- Shirts
  (1,  1,  1, 3, 200, 200, 165.00, 2, 'Budget cotton shirts, summer lot'),
  (2,  1,  2, 2, 140, 140, 220.00, 2, 'Formal checks batch'),
  (3,  1,  3, 2, 110, 110, 290.00, 2, NULL),
  (4,  1,  4, 2,  80,  80, 360.00, 2, 'Premium slim fit'),
  (5,  1,  5, 2,  45,  45, 480.00, 2, 'Designer prints'),
  -- Trousers
  (6,  1,  6, 2, 130, 130, 220.00, 2, 'Chinos collection'),
  (7,  1,  7, 2, 110, 110, 280.00, 2, 'Stretch fabric'),
  (8,  1,  8, 2,  75,  75, 350.00, 2, NULL),
  (9,  1,  9, 2,  55,  55, 470.00, 2, 'Formal slim fit'),
  -- Sarees
  (10, 1, 10, 1, 100, 100, 340.00, 2, 'Cotton daily-wear sarees'),
  (11, 1, 11, 1,  80,  80, 460.00, 2, NULL),
  (12, 1, 12, 1,  55,  55, 660.00, 2, 'Chanderi silk'),
  (13, 1, 13, 1,  35,  35, 900.00, 2, NULL),
  (14, 1, 14, 4,  25,  25, 1250.00, 2, 'Banarasi festive collection'),
  -- Kurtis
  (15, 1, 15, 3, 160, 160, 165.00, 2, NULL),
  (16, 1, 16, 3, 120, 120, 230.00, 2, 'Embroidered kurtis'),
  (17, 1, 17, 3,  90,  90, 290.00, 2, NULL),
  (18, 1, 18, 1,  55,  55, 410.00, 2, 'Silk blend kurtis'),
  -- Suits
  (19, 1, 19, 1,  45,  45, 900.00, 2, 'Terylene blend'),
  (20, 1, 20, 1,  30,  30, 1200.00, 2, NULL),
  (21, 1, 21, 4,  18,  18, 1800.00, 2, 'Wedding / occasion suits'),
  -- Bikini
  (22, 1, 22, 5, 110, 110, 420.00, 2, 'Beach resort collection'),
  (23, 1, 23, 5,  75,  75, 650.00, 2, 'Tropical prints'),
  (24, 1, 24, 5,  50,  50, 880.00, 2, NULL),
  (25, 1, 25, 5,  30,  30, 1200.00, 2, 'Goa season stock');

SELECT setval('inventory_batches_id_seq', (SELECT MAX(id) FROM inventory_batches));
