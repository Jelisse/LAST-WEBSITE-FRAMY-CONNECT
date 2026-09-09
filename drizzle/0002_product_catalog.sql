CREATE TABLE IF NOT EXISTS product_catalog (
  id TEXT PRIMARY KEY NOT NULL,
  data_json TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  updated_by TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS catalog_managers (
  user_id TEXT PRIMARY KEY NOT NULL
);
