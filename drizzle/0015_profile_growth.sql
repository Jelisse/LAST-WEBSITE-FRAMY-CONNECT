ALTER TABLE sandbox_memberships ADD COLUMN paid_started_at TEXT;
ALTER TABLE sandbox_memberships ADD COLUMN paid_expires_at TEXT;
ALTER TABLE sandbox_memberships ADD COLUMN next_plan_id TEXT;
ALTER TABLE sandbox_memberships ADD COLUMN next_terms_json TEXT;
ALTER TABLE sandbox_memberships ADD COLUMN next_starts_at TEXT;
ALTER TABLE sandbox_memberships ADD COLUMN next_expires_at TEXT;
CREATE TABLE profile_billing_settings(id INTEGER PRIMARY KEY CHECK(id=1), enabled INTEGER NOT NULL DEFAULT 0, instructions TEXT NOT NULL DEFAULT '', opened_at TEXT, version INTEGER NOT NULL DEFAULT 0);
INSERT INTO profile_billing_settings(id) VALUES(1);
CREATE VIEW profile_membership_view AS SELECT m.owner_id,m.version,m.trial_started_at,m.trial_expires_at,
 CASE WHEN m.next_starts_at<=strftime('%Y-%m-%dT%H:%M:%fZ','now') THEN m.next_plan_id ELSE m.plan_id END AS plan_id,
 CASE WHEN m.next_starts_at<=strftime('%Y-%m-%dT%H:%M:%fZ','now') THEN m.next_terms_json ELSE m.terms_json END AS terms_json,
 CASE WHEN m.next_starts_at<=strftime('%Y-%m-%dT%H:%M:%fZ','now') THEN m.next_starts_at ELSE m.paid_started_at END AS paid_started_at,
 CASE WHEN m.next_starts_at<=strftime('%Y-%m-%dT%H:%M:%fZ','now') THEN m.next_expires_at ELSE m.paid_expires_at END AS paid_expires_at,
 m.next_plan_id,m.next_starts_at,m.next_expires_at,s.enabled AS billing_enabled,s.opened_at AS billing_opened_at
 FROM sandbox_memberships m CROSS JOIN profile_billing_settings s WHERE s.id=1;
CREATE TABLE profile_invoices(id TEXT PRIMARY KEY,owner_id TEXT NOT NULL REFERENCES auth_accounts(id),plan_id TEXT NOT NULL,terms_json TEXT NOT NULL,instructions TEXT NOT NULL,amount INTEGER NOT NULL CHECK(amount>0),status TEXT NOT NULL CHECK(status IN ('pending','confirmed','cancelled')),created_at TEXT NOT NULL,expires_at TEXT NOT NULL,confirmed_at TEXT,confirmed_by TEXT,period_start TEXT,period_end TEXT);
CREATE UNIQUE INDEX profile_invoice_pending ON profile_invoices(owner_id) WHERE status='pending';
CREATE INDEX profile_invoice_owner ON profile_invoices(owner_id,created_at);
CREATE TABLE profile_receipts(reference TEXT PRIMARY KEY COLLATE NOCASE,invoice_id TEXT NOT NULL UNIQUE REFERENCES profile_invoices(id),actor TEXT NOT NULL,amount INTEGER NOT NULL,created_at TEXT NOT NULL);
CREATE TABLE profile_notices(id TEXT PRIMARY KEY,owner_id TEXT NOT NULL,subject TEXT NOT NULL,message TEXT NOT NULL,created_at INTEGER NOT NULL,read_at INTEGER,sent_at INTEGER,attempted_at INTEGER);
CREATE INDEX profile_notices_owner ON profile_notices(owner_id,created_at);
CREATE TABLE profile_enquiries(id TEXT PRIMARY KEY,owner_id TEXT NOT NULL,name TEXT NOT NULL,email TEXT NOT NULL,message TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'new' CHECK(status IN ('new','read','closed')),created_at INTEGER NOT NULL);
CREATE INDEX profile_enquiries_owner ON profile_enquiries(owner_id,created_at);
CREATE TABLE profile_teams(id TEXT PRIMARY KEY,owner_id TEXT NOT NULL UNIQUE REFERENCES auth_accounts(id),name TEXT NOT NULL,created_at INTEGER NOT NULL);
CREATE TABLE profile_team_members(team_id TEXT NOT NULL REFERENCES profile_teams(id),account_id TEXT NOT NULL REFERENCES auth_accounts(id),joined_at INTEGER NOT NULL,PRIMARY KEY(team_id,account_id));
CREATE TABLE profile_team_invites(id TEXT PRIMARY KEY,team_id TEXT NOT NULL REFERENCES profile_teams(id),email TEXT NOT NULL,expires_at INTEGER NOT NULL,accepted_at INTEGER,UNIQUE(team_id,email));
CREATE TABLE profile_domains(hostname TEXT PRIMARY KEY,owner_id TEXT NOT NULL UNIQUE REFERENCES auth_accounts(id),token TEXT NOT NULL,provider_id TEXT,status TEXT NOT NULL DEFAULT 'pending',checks_json TEXT NOT NULL DEFAULT '[]',checked_at INTEGER,created_at INTEGER NOT NULL);

CREATE TRIGGER profile_receipt_unique_product BEFORE INSERT ON profile_receipts WHEN EXISTS(SELECT 1 FROM payment_records WHERE kind='capture' AND provider_reference=NEW.reference COLLATE NOCASE) BEGIN SELECT RAISE(ABORT,'payment reference constraint'); END;
CREATE TRIGGER product_receipt_unique_profile BEFORE INSERT ON payment_records WHEN NEW.kind='capture' AND EXISTS(SELECT 1 FROM profile_receipts WHERE reference=NEW.provider_reference COLLATE NOCASE) BEGIN SELECT RAISE(ABORT,'payment reference constraint'); END;
