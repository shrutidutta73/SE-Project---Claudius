-- =============================================================================
-- SmallBiz Seed Data — Sharma Garments (Demo Store)
-- =============================================================================
--
-- !! WARNING — PASSWORD / PIN HASHES !!
-- The password_hash and pin_hash values below are PLACEHOLDER strings.
-- They are NOT valid bcrypt hashes and WILL NOT authenticate.
--
-- To seed with real hashes use ONE of:
--   a) Preferred: npm run db:seed          (runs backend/scripts/seed.ts)
--   b) Manual node one-liner per user:
--        node -e "const b=require('bcrypt'); console.log(b.hashSync('Owner@123', 10))"
--
-- Then replace every occurrence of the placeholder sentinel
--   __REPLACE_WITH_REAL_HASH__
-- with the output of the above commands before running this file directly.
--
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Store
-- -----------------------------------------------------------------------------
INSERT INTO stores (id, name, address, gps_latitude, gps_longitude, gps_radius_m, billing_mode)
VALUES (
  1,
  'Sharma Garments',
  'Shop No. 12, Nehru Market, Kanpur, UP 208001',
  26.4499,
  80.3319,
  200,
  'structured'
);

-- -----------------------------------------------------------------------------
-- 2. Users
--    owner_id on stores is set at the end of this section.
--    Passwords / PINs — see warning at top of file.
-- -----------------------------------------------------------------------------

-- id=1  owner
INSERT INTO users (id, store_id, name, phone, email, role, password_hash, pin_hash, is_active)
VALUES (
  1, 1,
  'Ramesh Sharma',
  '9876543210',
  'ramesh@sharmagarments.com',
  'owner',
  '__REPLACE_WITH_REAL_HASH__',   -- bcrypt of "Owner@123"
  NULL,
  TRUE
);

-- id=2  manager
INSERT INTO users (id, store_id, name, phone, email, role, password_hash, pin_hash, is_active)
VALUES (
  2, 1,
  'Mohit Anand Kumar',
  '9876543211',
  'mak650650@gmail.com',
  'manager',
  '__REPLACE_WITH_REAL_HASH__',   -- bcrypt of "mak650650@gmail.com"  (password = email)
  NULL,
  TRUE
);

-- id=3  staff — Rahul Kumar (PIN login only)
INSERT INTO users (id, store_id, name, phone, email, role, password_hash, pin_hash, is_active)
VALUES (
  3, 1,
  'Rahul Kumar',
  '9450946772',
  NULL,
  'staff',
  NULL,
  '__REPLACE_WITH_REAL_HASH__',   -- bcrypt of PIN "1234"
  TRUE
);

-- id=4  staff — Priya Singh (PIN login only)
INSERT INTO users (id, store_id, name, phone, email, role, password_hash, pin_hash, is_active)
VALUES (
  4, 1,
  'Priya Singh',
  '9876543213',
  NULL,
  'staff',
  NULL,
  '__REPLACE_WITH_REAL_HASH__',   -- bcrypt of PIN "5678"
  TRUE
);

-- id=5  staff — Amit Yadav (PIN login only)
INSERT INTO users (id, store_id, name, phone, email, role, password_hash, pin_hash, is_active)
VALUES (
  5, 1,
  'Amit Yadav',
  '9876543214',
  NULL,
  'staff',
  NULL,
  '__REPLACE_WITH_REAL_HASH__',   -- bcrypt of PIN "9012"
  TRUE
);

-- Point the store's owner_id at Ramesh Sharma
UPDATE stores SET owner_id = 1 WHERE id = 1;

-- Sync sequences so subsequent INSERTs don't collide
SELECT setval('users_id_seq', (SELECT MAX(id) FROM users));
SELECT setval('stores_id_seq', (SELECT MAX(id) FROM stores));

-- -----------------------------------------------------------------------------
-- 3. Categories
-- -----------------------------------------------------------------------------
INSERT INTO categories (id, store_id, name) VALUES
  (1,  1, 'Shirts'),
  (2,  1, 'Trousers'),
  (3,  1, 'Sarees'),
  (4,  1, 'Kurtis'),
  (5,  1, 'Suits');

SELECT setval('categories_id_seq', (SELECT MAX(id) FROM categories));

-- -----------------------------------------------------------------------------
-- 4. Price Bands
--    (store_id, category_id, price) is UNIQUE — no duplicates
-- -----------------------------------------------------------------------------

-- Shirts: 5 bands
INSERT INTO price_bands (id, store_id, category_id, price, is_active) VALUES
  (1,  1, 1, 299.00, TRUE),
  (2,  1, 1, 399.00, TRUE),
  (3,  1, 1, 499.00, TRUE),
  (4,  1, 1, 599.00, TRUE),
  (5,  1, 1, 799.00, TRUE);

-- Trousers: 4 bands
INSERT INTO price_bands (id, store_id, category_id, price, is_active) VALUES
  (6,  1, 2, 399.00, TRUE),
  (7,  1, 2, 499.00, TRUE),
  (8,  1, 2, 599.00, TRUE),
  (9,  1, 2, 799.00, TRUE);

-- Sarees: 5 bands
INSERT INTO price_bands (id, store_id, category_id, price, is_active) VALUES
  (10, 1, 3,  599.00, TRUE),
  (11, 1, 3,  799.00, TRUE),
  (12, 1, 3, 1099.00, TRUE),
  (13, 1, 3, 1499.00, TRUE),
  (14, 1, 3, 1999.00, TRUE);

-- Kurtis: 4 bands
INSERT INTO price_bands (id, store_id, category_id, price, is_active) VALUES
  (15, 1, 4, 299.00, TRUE),
  (16, 1, 4, 399.00, TRUE),
  (17, 1, 4, 499.00, TRUE),
  (18, 1, 4, 699.00, TRUE);

-- Suits: 3 bands
INSERT INTO price_bands (id, store_id, category_id, price, is_active) VALUES
  (19, 1, 5, 1499.00, TRUE),
  (20, 1, 5, 1999.00, TRUE),
  (21, 1, 5, 2999.00, TRUE);

SELECT setval('price_bands_id_seq', (SELECT MAX(id) FROM price_bands));

-- -----------------------------------------------------------------------------
-- 5. Vendors
-- -----------------------------------------------------------------------------
INSERT INTO vendors (id, store_id, name, phone, email, city, notes, is_active) VALUES
  (1, 1, 'Krishna Textiles',  '9898989898', 'krishna@ktextiles.com',  'Surat',  'Primary saree & suit supplier',    TRUE),
  (2, 1, 'Mehta Fabrics',     '9797979797', 'orders@mehtafabrics.in', 'Mumbai', 'Shirts and trousers wholesale',    TRUE),
  (3, 1, 'Jain Garments',     '9696969696', 'jain.garments@gmail.com','Delhi',  'Budget kurtis and casual shirts',  TRUE);

SELECT setval('vendors_id_seq', (SELECT MAX(id) FROM vendors));

-- -----------------------------------------------------------------------------
-- 6. Inventory Batches
--    (price_band_id → category mapping for reference)
--    Batch cost prices are approximate; added_by = manager (user_id = 2)
-- -----------------------------------------------------------------------------
INSERT INTO inventory_batches
  (id, store_id, price_band_id, vendor_id, quantity_added, quantity_remaining, cost_price, added_by, notes)
VALUES
  -- Shirts @ 299 (pb=1) — budget lot from Jain Garments
  (1,  1,  1, 3, 50, 38, 160.00, 2, 'Budget cotton shirts, summer lot'),
  -- Shirts @ 399 (pb=2)
  (2,  1,  2, 2, 40, 29, 230.00, 2, 'Formal checks batch'),
  -- Shirts @ 499 (pb=3)
  (3,  1,  3, 2, 30, 22, 290.00, 2, NULL),
  -- Shirts @ 599 (pb=4)
  (4,  1,  4, 2, 20, 14, 370.00, 2, 'Premium slim fit'),
  -- Shirts @ 799 (pb=5)
  (5,  1,  5, 2, 15,  9, 500.00, 2, 'Designer prints'),

  -- Trousers @ 399 (pb=6)
  (6,  1,  6, 2, 40, 31, 220.00, 2, NULL),
  -- Trousers @ 499 (pb=7)
  (7,  1,  7, 2, 35, 27, 280.00, 2, 'Stretch fabric'),
  -- Trousers @ 599 (pb=8)
  (8,  1,  8, 2, 25, 18, 350.00, 2, NULL),
  -- Trousers @ 799 (pb=9)
  (9,  1,  9, 2, 20, 12, 470.00, 2, 'Formal slim fit'),

  -- Sarees @ 599 (pb=10)
  (10, 1, 10, 1, 30, 24, 340.00, 2, 'Cotton daily-wear sarees'),
  -- Sarees @ 799 (pb=11)
  (11, 1, 11, 1, 25, 19, 460.00, 2, NULL),
  -- Sarees @ 1099 (pb=12)
  (12, 1, 12, 1, 20, 15, 660.00, 2, 'Chanderi silk'),
  -- Sarees @ 1499 (pb=13)
  (13, 1, 13, 1, 15, 10, 900.00, 2, NULL),
  -- Sarees @ 1999 (pb=14)
  (14, 1, 14, 1, 10,  6,1250.00, 2, 'Banarasi festive collection'),

  -- Kurtis @ 299 (pb=15)
  (15, 1, 15, 3, 45, 35, 165.00, 2, NULL),
  -- Kurtis @ 399 (pb=16)
  (16, 1, 16, 3, 40, 30, 230.00, 2, 'Embroidered kurtis'),
  -- Kurtis @ 499 (pb=17)
  (17, 1, 17, 3, 30, 22, 290.00, 2, NULL),
  -- Kurtis @ 699 (pb=18)
  (18, 1, 18, 1, 20, 14, 410.00, 2, 'Silk blend kurtis'),

  -- Suits @ 1499 (pb=19)
  (19, 1, 19, 1, 15, 11, 900.00, 2, 'Terylene blend'),
  -- Suits @ 1999 (pb=20)
  (20, 1, 20, 1, 10,  7,1200.00, 2, NULL),
  -- Suits @ 2999 (pb=21)
  (21, 1, 21, 1,  8,  5,1800.00, 2, 'Wedding/occasion suits');

SELECT setval('inventory_batches_id_seq', (SELECT MAX(id) FROM inventory_batches));

-- -----------------------------------------------------------------------------
-- 7. Sample daily_sales_summary — last 7 days
--    Covers top-selling bands across all categories.
-- -----------------------------------------------------------------------------
INSERT INTO daily_sales_summary
  (store_id, date, price_band_id, category_name, band_price,
   total_qty_sold, total_revenue, total_returns, total_refunds)
VALUES
  -- Day -7
  (1, CURRENT_DATE - 7,  1, 'Shirts',   299.00,  4, 1196.00, 0,    0.00),
  (1, CURRENT_DATE - 7,  2, 'Shirts',   399.00,  3, 1197.00, 0,    0.00),
  (1, CURRENT_DATE - 7,  6, 'Trousers', 399.00,  2,  798.00, 0,    0.00),
  (1, CURRENT_DATE - 7, 10, 'Sarees',   599.00,  1,  599.00, 0,    0.00),
  (1, CURRENT_DATE - 7, 15, 'Kurtis',   299.00,  3,  897.00, 0,    0.00),

  -- Day -6
  (1, CURRENT_DATE - 6,  2, 'Shirts',   399.00,  5, 1995.00, 1,  399.00),
  (1, CURRENT_DATE - 6,  7, 'Trousers', 499.00,  3, 1497.00, 0,    0.00),
  (1, CURRENT_DATE - 6, 11, 'Sarees',   799.00,  2, 1598.00, 0,    0.00),
  (1, CURRENT_DATE - 6, 16, 'Kurtis',   399.00,  4, 1596.00, 0,    0.00),

  -- Day -5
  (1, CURRENT_DATE - 5,  3, 'Shirts',   499.00,  4, 1996.00, 0,    0.00),
  (1, CURRENT_DATE - 5,  6, 'Trousers', 399.00,  3, 1197.00, 0,    0.00),
  (1, CURRENT_DATE - 5, 10, 'Sarees',   599.00,  2, 1198.00, 1,  599.00),
  (1, CURRENT_DATE - 5, 19, 'Suits',   1499.00,  1, 1499.00, 0,    0.00),

  -- Day -4
  (1, CURRENT_DATE - 4,  1, 'Shirts',   299.00,  6, 1794.00, 0,    0.00),
  (1, CURRENT_DATE - 4,  2, 'Shirts',   399.00,  4, 1596.00, 0,    0.00),
  (1, CURRENT_DATE - 4,  8, 'Trousers', 599.00,  2, 1198.00, 0,    0.00),
  (1, CURRENT_DATE - 4, 15, 'Kurtis',   299.00,  5, 1495.00, 0,    0.00),
  (1, CURRENT_DATE - 4, 17, 'Kurtis',   499.00,  2,  998.00, 0,    0.00),

  -- Day -3
  (1, CURRENT_DATE - 3,  3, 'Shirts',   499.00,  3, 1497.00, 0,    0.00),
  (1, CURRENT_DATE - 3,  5, 'Shirts',   799.00,  2, 1598.00, 0,    0.00),
  (1, CURRENT_DATE - 3,  7, 'Trousers', 499.00,  4, 1996.00, 1,  499.00),
  (1, CURRENT_DATE - 3, 12, 'Sarees',  1099.00,  2, 2198.00, 0,    0.00),
  (1, CURRENT_DATE - 3, 20, 'Suits',   1999.00,  1, 1999.00, 0,    0.00),

  -- Day -2
  (1, CURRENT_DATE - 2,  1, 'Shirts',   299.00,  8, 2392.00, 0,    0.00),
  (1, CURRENT_DATE - 2,  2, 'Shirts',   399.00,  5, 1995.00, 0,    0.00),
  (1, CURRENT_DATE - 2,  6, 'Trousers', 399.00,  6, 2394.00, 0,    0.00),
  (1, CURRENT_DATE - 2, 16, 'Kurtis',   399.00,  3, 1197.00, 0,    0.00),
  (1, CURRENT_DATE - 2, 11, 'Sarees',   799.00,  2, 1598.00, 0,    0.00),

  -- Day -1  (yesterday)
  (1, CURRENT_DATE - 1,  2, 'Shirts',   399.00,  6, 2394.00, 0,    0.00),
  (1, CURRENT_DATE - 1,  3, 'Shirts',   499.00,  4, 1996.00, 0,    0.00),
  (1, CURRENT_DATE - 1,  7, 'Trousers', 499.00,  5, 2495.00, 0,    0.00),
  (1, CURRENT_DATE - 1,  9, 'Trousers', 799.00,  2, 1598.00, 0,    0.00),
  (1, CURRENT_DATE - 1, 13, 'Sarees',  1499.00,  1, 1499.00, 0,    0.00),
  (1, CURRENT_DATE - 1, 15, 'Kurtis',   299.00,  7, 2093.00, 0,    0.00),
  (1, CURRENT_DATE - 1, 19, 'Suits',   1499.00,  2, 2998.00, 1, 1499.00);
