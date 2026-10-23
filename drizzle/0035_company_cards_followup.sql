CREATE TABLE corporate_templates (
 organisation_id TEXT PRIMARY KEY REFERENCES corporate_organisations(id),
 template_json TEXT NOT NULL CHECK(json_valid(template_json)),
 version INTEGER NOT NULL DEFAULT 1 CHECK(version>0),
 updated_by TEXT NOT NULL REFERENCES auth_accounts(id), updated_at INTEGER NOT NULL
);
CREATE TABLE corporate_cards (
 id TEXT PRIMARY KEY, organisation_id TEXT NOT NULL, account_id TEXT NOT NULL,
 draft_json TEXT NOT NULL CHECK(json_valid(draft_json)),
 published_json TEXT CHECK(published_json IS NULL OR json_valid(published_json)),
 version INTEGER NOT NULL DEFAULT 1 CHECK(version>0), template_version INTEGER NOT NULL DEFAULT 0,
 updated_at INTEGER NOT NULL, published_at INTEGER,
 UNIQUE(organisation_id,account_id),
 FOREIGN KEY(organisation_id,account_id) REFERENCES corporate_members(organisation_id,account_id)
);
CREATE INDEX corporate_cards_organisation ON corporate_cards(organisation_id,published_at);
CREATE TABLE corporate_followups (
 lead_id TEXT PRIMARY KEY REFERENCES corporate_leads(id),
 status TEXT NOT NULL DEFAULT 'new' CHECK(status IN ('new','progress','waiting','done','archived')),
 note TEXT NOT NULL DEFAULT '' CHECK(length(note)<=1000), due_date TEXT NOT NULL DEFAULT '',
 version INTEGER NOT NULL DEFAULT 1 CHECK(version>0),
 updated_by TEXT NOT NULL REFERENCES auth_accounts(id), updated_at INTEGER NOT NULL
);
CREATE INDEX corporate_followups_due ON corporate_followups(status,due_date);
