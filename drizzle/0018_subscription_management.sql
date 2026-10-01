-- Additive management configuration and auditable external-accounting records.
CREATE TABLE manager_preferences (
 id TEXT PRIMARY KEY,
 data_json TEXT NOT NULL,
 version INTEGER NOT NULL DEFAULT 0,
 updated_at TEXT NOT NULL,
 updated_by TEXT NOT NULL REFERENCES auth_accounts(id)
);
CREATE TABLE finance_documents (
 operation_id TEXT PRIMARY KEY,
 document_type TEXT NOT NULL,
 reference TEXT NOT NULL,
 issued_on TEXT NOT NULL,
 notes TEXT NOT NULL DEFAULT '',
 version INTEGER NOT NULL DEFAULT 1,
 updated_by TEXT NOT NULL REFERENCES auth_accounts(id),
 updated_at TEXT NOT NULL
);
CREATE TABLE finance_entries (
 id TEXT PRIMARY KEY,
 operation_id TEXT,
 kind TEXT NOT NULL CHECK(kind IN ('fee','refund','settlement','expense','reversal')),
 amount INTEGER NOT NULL CHECK(amount>0),
 reference TEXT NOT NULL COLLATE NOCASE UNIQUE,
 occurred_on TEXT NOT NULL,
 notes TEXT NOT NULL,
 reversal_of TEXT UNIQUE REFERENCES finance_entries(id),
 actor TEXT NOT NULL REFERENCES auth_accounts(id),
 created_at TEXT NOT NULL
);
CREATE INDEX finance_entries_operation ON finance_entries(operation_id);
CREATE TRIGGER finance_entry_immutable BEFORE UPDATE ON finance_entries BEGIN SELECT RAISE(ABORT,'Financial entries are immutable'); END;
CREATE TRIGGER finance_entry_no_delete BEFORE DELETE ON finance_entries BEGIN SELECT RAISE(ABORT,'Use a reversal'); END;
ALTER TABLE paysuite_product_orders ADD COLUMN fulfilled_at TEXT;
CREATE TRIGGER paysuite_fulfilment_date AFTER UPDATE OF status ON paysuite_product_orders
WHEN NEW.status='fulfilled' AND OLD.status<>'fulfilled' AND NEW.fulfilled_at IS NULL
BEGIN UPDATE paysuite_product_orders SET fulfilled_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id=NEW.id; END;
CREATE TABLE plan_revisions (
 plan_id TEXT NOT NULL,
 version INTEGER NOT NULL,
 data_json TEXT NOT NULL,
 actor TEXT NOT NULL REFERENCES auth_accounts(id),
 created_at TEXT NOT NULL,
 PRIMARY KEY(plan_id,version)
);
CREATE TABLE finance_period_locks (
 through_date TEXT PRIMARY KEY,
 actor TEXT NOT NULL REFERENCES auth_accounts(id),
 created_at TEXT NOT NULL
);
CREATE TRIGGER finance_entries_closed BEFORE INSERT ON finance_entries
WHEN EXISTS(SELECT 1 FROM finance_period_locks WHERE through_date>=NEW.occurred_on)
BEGIN SELECT RAISE(ABORT,'closed accounting period'); END;
CREATE TRIGGER finance_documents_closed_insert BEFORE INSERT ON finance_documents
WHEN EXISTS(SELECT 1 FROM finance_period_locks WHERE through_date>=NEW.issued_on)
BEGIN SELECT RAISE(ABORT,'closed accounting period'); END;
CREATE TRIGGER finance_documents_closed_update BEFORE UPDATE ON finance_documents
WHEN EXISTS(SELECT 1 FROM finance_period_locks WHERE through_date>=NEW.issued_on OR through_date>=OLD.issued_on)
BEGIN SELECT RAISE(ABORT,'closed accounting period'); END;
