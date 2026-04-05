-- =============================================================================
-- SmallBiz PostgreSQL Schema
-- =============================================================================
-- Drop in reverse dependency order so this file is safe to re-run.

DROP TABLE IF EXISTS audit_log CASCADE;
DROP TABLE IF EXISTS daily_sales_summary CASCADE;
DROP TABLE IF EXISTS reorder_items CASCADE;
DROP TABLE IF EXISTS reorders CASCADE;
DROP TABLE IF EXISTS gps_settings CASCADE;
DROP TABLE IF EXISTS attendance CASCADE;
DROP TABLE IF EXISTS return_items CASCADE;
DROP TABLE IF EXISTS returns CASCADE;
DROP TABLE IF EXISTS sale_items CASCADE;
DROP TABLE IF EXISTS sales CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS inventory_batches CASCADE;
DROP TABLE IF EXISTS price_bands CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS vendors CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS stores CASCADE;

-- -----------------------------------------------------------------------------
-- stores
-- -----------------------------------------------------------------------------
CREATE TABLE stores (
  id               SERIAL PRIMARY KEY,
  name             TEXT NOT NULL,
  address          TEXT NOT NULL,
  logo             TEXT,
  owner_id         INT,                          -- FK added after users table
  billing_mode     TEXT NOT NULL DEFAULT 'structured'
                   CHECK (billing_mode IN ('structured', 'ephemeral')),
  retention_days   INT CHECK (retention_days IS NULL OR retention_days IN (7, 14, 30, 90)),
  gps_latitude     DOUBLE PRECISION NOT NULL DEFAULT 0,
  gps_longitude    DOUBLE PRECISION NOT NULL DEFAULT 0,
  gps_radius_m          INT NOT NULL DEFAULT 200,
  gps_require_clock_in  BOOLEAN NOT NULL DEFAULT FALSE,
  gps_require_clock_out BOOLEAN NOT NULL DEFAULT FALSE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- users
-- -----------------------------------------------------------------------------
CREATE TABLE users (
  id            SERIAL PRIMARY KEY,
  store_id      INT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  phone         TEXT NOT NULL,
  email         TEXT,
  role          TEXT NOT NULL CHECK (role IN ('owner', 'manager', 'staff')),
  password_hash TEXT,
  pin_hash      TEXT,
  avatar        TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(store_id, phone),
  UNIQUE(store_id, email)
);

-- Add FK from stores to users (owner_id) — deferred because users depends on stores
ALTER TABLE stores
  ADD CONSTRAINT fk_stores_owner
  FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE SET NULL;

-- -----------------------------------------------------------------------------
-- categories
-- -----------------------------------------------------------------------------
CREATE TABLE categories (
  id         SERIAL PRIMARY KEY,
  store_id   INT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(store_id, name)
);

-- -----------------------------------------------------------------------------
-- price_bands
-- -----------------------------------------------------------------------------
CREATE TABLE price_bands (
  id          SERIAL PRIMARY KEY,
  store_id    INT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  category_id INT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  price       NUMERIC(10,2) NOT NULL,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(store_id, category_id, price)
);

-- -----------------------------------------------------------------------------
-- vendors
-- -----------------------------------------------------------------------------
CREATE TABLE vendors (
  id         SERIAL PRIMARY KEY,
  store_id   INT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  phone      TEXT,
  email      TEXT,
  city       TEXT,
  notes      TEXT,
  is_active  BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- inventory_batches
-- -----------------------------------------------------------------------------
CREATE TABLE inventory_batches (
  id                  SERIAL PRIMARY KEY,
  store_id            INT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  price_band_id       INT NOT NULL REFERENCES price_bands(id) ON DELETE RESTRICT,
  vendor_id           INT REFERENCES vendors(id) ON DELETE SET NULL,
  quantity_added      INT NOT NULL CHECK (quantity_added > 0),
  quantity_remaining  INT NOT NULL CHECK (quantity_remaining >= 0),
  cost_price          NUMERIC(10,2),
  added_by            INT REFERENCES users(id) ON DELETE SET NULL,
  notes               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- customers
-- -----------------------------------------------------------------------------
CREATE TABLE customers (
  id         SERIAL PRIMARY KEY,
  store_id   INT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  name       TEXT,
  phone      TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(store_id, phone)
);

-- -----------------------------------------------------------------------------
-- sales
-- -----------------------------------------------------------------------------
CREATE TABLE sales (
  id              SERIAL PRIMARY KEY,
  store_id        INT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  customer_id     INT REFERENCES customers(id) ON DELETE SET NULL,
  staff_id        INT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  total_amount    NUMERIC(10,2) NOT NULL,
  discount_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  payment_method  TEXT NOT NULL CHECK (payment_method IN ('cash', 'upi', 'store_credit')),
  is_ephemeral    BOOLEAN NOT NULL DEFAULT FALSE,
  expires_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- sale_items
-- price_band_id and inventory_batch_id are NULLABLE for custom / ephemeral POS items
-- -----------------------------------------------------------------------------
CREATE TABLE sale_items (
  id                  SERIAL PRIMARY KEY,
  sale_id             INT NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  price_band_id       INT REFERENCES price_bands(id) ON DELETE SET NULL,
  inventory_batch_id  INT REFERENCES inventory_batches(id) ON DELETE SET NULL,
  category_name       TEXT NOT NULL,
  price               NUMERIC(10,2) NOT NULL,
  quantity            INT NOT NULL CHECK (quantity > 0),
  subtotal            NUMERIC(10,2) NOT NULL
);

-- -----------------------------------------------------------------------------
-- returns
-- -----------------------------------------------------------------------------
CREATE TABLE returns (
  id         SERIAL PRIMARY KEY,
  store_id   INT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  sale_id    INT NOT NULL REFERENCES sales(id) ON DELETE RESTRICT,
  staff_id   INT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  type       TEXT NOT NULL CHECK (type IN ('return', 'exchange')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- return_items
-- -----------------------------------------------------------------------------
CREATE TABLE return_items (
  id                  SERIAL PRIMARY KEY,
  return_id           INT NOT NULL REFERENCES returns(id) ON DELETE CASCADE,
  sale_item_id        INT NOT NULL REFERENCES sale_items(id) ON DELETE RESTRICT,
  quantity            INT NOT NULL CHECK (quantity > 0),
  inventory_batch_id  INT REFERENCES inventory_batches(id) ON DELETE SET NULL
);

-- -----------------------------------------------------------------------------
-- attendance
-- -----------------------------------------------------------------------------
CREATE TABLE attendance (
  id            SERIAL PRIMARY KEY,
  store_id      INT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  user_id       INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date          DATE NOT NULL,
  check_in_at   TIMESTAMPTZ NOT NULL,
  check_out_at  TIMESTAMPTZ,
  check_in_lat  DOUBLE PRECISION,
  check_in_lng  DOUBLE PRECISION,
  check_out_lat DOUBLE PRECISION,
  check_out_lng DOUBLE PRECISION,
  UNIQUE(store_id, user_id, date)
);

-- -----------------------------------------------------------------------------
-- gps_settings  (per-user GPS enforcement policy)
-- -----------------------------------------------------------------------------
CREATE TABLE gps_settings (
  id                    SERIAL PRIMARY KEY,
  store_id              INT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  user_id               INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  require_on_clock_in   BOOLEAN NOT NULL DEFAULT FALSE,
  require_on_clock_out  BOOLEAN NOT NULL DEFAULT FALSE,
  UNIQUE(store_id, user_id)
);

-- -----------------------------------------------------------------------------
-- reorders
-- -----------------------------------------------------------------------------
CREATE TABLE reorders (
  id           SERIAL PRIMARY KEY,
  store_id     INT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  vendor_id    INT NOT NULL REFERENCES vendors(id) ON DELETE RESTRICT,
  created_by   INT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  status       TEXT NOT NULL DEFAULT 'draft'
               CHECK (status IN ('draft', 'sent', 'acknowledged', 'fulfilled')),
  message_text TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sent_at      TIMESTAMPTZ
);

-- -----------------------------------------------------------------------------
-- reorder_items
-- -----------------------------------------------------------------------------
CREATE TABLE reorder_items (
  id            SERIAL PRIMARY KEY,
  reorder_id    INT NOT NULL REFERENCES reorders(id) ON DELETE CASCADE,
  price_band_id INT NOT NULL REFERENCES price_bands(id) ON DELETE RESTRICT,
  category_name TEXT NOT NULL,
  band_price    NUMERIC(10,2) NOT NULL,
  suggested_qty INT NOT NULL DEFAULT 0,
  final_qty     INT NOT NULL DEFAULT 0
);

-- -----------------------------------------------------------------------------
-- daily_sales_summary  (materialised daily rollup — populated by a cron/trigger)
-- -----------------------------------------------------------------------------
CREATE TABLE daily_sales_summary (
  id             SERIAL PRIMARY KEY,
  store_id       INT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  date           DATE NOT NULL,
  price_band_id  INT NOT NULL REFERENCES price_bands(id) ON DELETE RESTRICT,
  category_name  TEXT NOT NULL,
  band_price     NUMERIC(10,2) NOT NULL,
  total_qty_sold INT NOT NULL DEFAULT 0,
  total_revenue  NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_returns  INT NOT NULL DEFAULT 0,
  total_refunds  NUMERIC(10,2) NOT NULL DEFAULT 0,
  UNIQUE(store_id, date, price_band_id)
);

-- -----------------------------------------------------------------------------
-- audit_log  (records data-retention pruning events)
-- -----------------------------------------------------------------------------
CREATE TABLE audit_log (
  id             SERIAL PRIMARY KEY,
  store_id       INT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  timestamp      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  type           TEXT NOT NULL CHECK (type IN ('auto', 'manual')),
  records_pruned INT NOT NULL DEFAULT 0
);

-- =============================================================================
-- Indexes for common query patterns
-- =============================================================================

-- Active inventory by price band (used heavily in POS and reorder suggestions)
CREATE INDEX idx_inventory_batches_price_band
  ON inventory_batches(store_id, price_band_id)
  WHERE quantity_remaining > 0;

-- Sale items lookup by sale
CREATE INDEX idx_sale_items_sale
  ON sale_items(sale_id);

-- Sales filtered by store + date range (reports, summaries)
CREATE INDEX idx_sales_store_created
  ON sales(store_id, created_at);

-- Attendance filtered by store + date (daily attendance view)
CREATE INDEX idx_attendance_store_date
  ON attendance(store_id, date);

-- Daily summary filtered by store + date range (dashboard charts)
CREATE INDEX idx_daily_summary_store_date
  ON daily_sales_summary(store_id, date);

-- Active users per store (auth lookups)
CREATE INDEX idx_users_store
  ON users(store_id)
  WHERE is_active = TRUE;
