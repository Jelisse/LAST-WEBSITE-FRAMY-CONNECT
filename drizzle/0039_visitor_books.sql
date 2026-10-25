CREATE TABLE visitor_books (
 id TEXT PRIMARY KEY, organisation_id TEXT NOT NULL REFERENCES corporate_organisations(id), public_id TEXT NOT NULL UNIQUE,
 name TEXT NOT NULL, show_logo INTEGER NOT NULL DEFAULT 0 CHECK(show_logo IN(0,1)), welcome TEXT NOT NULL DEFAULT '', active INTEGER NOT NULL DEFAULT 1 CHECK(active IN(0,1)),
 retention_days INTEGER NOT NULL DEFAULT 90 CHECK(retention_days IN(30,60,90)), purposes_json TEXT NOT NULL DEFAULT '[]' CHECK(json_valid(purposes_json)),
 departments_json TEXT NOT NULL DEFAULT '[]' CHECK(json_valid(departments_json)), version INTEGER NOT NULL DEFAULT 1,
 created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL
);
CREATE INDEX visitor_books_org ON visitor_books(organisation_id,created_at);
CREATE TABLE visitor_book_access (
 book_id TEXT NOT NULL REFERENCES visitor_books(id) ON DELETE CASCADE, account_id TEXT NOT NULL REFERENCES auth_accounts(id),
 PRIMARY KEY(book_id,account_id)
);
CREATE TABLE visitor_entries (
 id TEXT PRIMARY KEY, book_id TEXT NOT NULL REFERENCES visitor_books(id) ON DELETE CASCADE,
 name TEXT NOT NULL, phone TEXT NOT NULL, email TEXT NOT NULL DEFAULT '', company TEXT NOT NULL DEFAULT '', position TEXT NOT NULL DEFAULT '',
 purpose TEXT NOT NULL DEFAULT '', department TEXT NOT NULL DEFAULT '', consent_version TEXT NOT NULL,
 created_at INTEGER NOT NULL, expires_at INTEGER NOT NULL
);
CREATE INDEX visitor_entries_book ON visitor_entries(book_id,created_at,id);
CREATE INDEX visitor_entries_expiry ON visitor_entries(expires_at);
CREATE TRIGGER visitor_entry_active BEFORE INSERT ON visitor_entries WHEN NOT EXISTS(
 SELECT 1 FROM visitor_books b JOIN corporate_active_organisations o ON o.id=b.organisation_id WHERE b.id=NEW.book_id AND b.active=1
) BEGIN SELECT RAISE(ABORT,'visitor book unavailable'); END;
