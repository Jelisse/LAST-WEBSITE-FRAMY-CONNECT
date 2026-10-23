CREATE TABLE corporate_tool_settings (
  organisation_id TEXT PRIMARY KEY REFERENCES corporate_organisations(id) ON DELETE CASCADE,
  settings_json TEXT NOT NULL CHECK(json_valid(settings_json)),
  version INTEGER NOT NULL DEFAULT 1,
  updated_by TEXT NOT NULL REFERENCES auth_accounts(id),
  updated_at INTEGER NOT NULL
);
CREATE TABLE corporate_crm_connections (
  organisation_id TEXT PRIMARY KEY REFERENCES corporate_organisations(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK(provider='hubspot'),
  token_cipher TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  updated_at INTEGER NOT NULL
);
CREATE TABLE corporate_crm_syncs (
  lead_id TEXT PRIMARY KEY REFERENCES corporate_leads(id) ON DELETE CASCADE,
  organisation_id TEXT NOT NULL REFERENCES corporate_organisations(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK(status IN ('pending','sent','error','uncertain')),
  external_id TEXT NOT NULL DEFAULT '',
  request_id TEXT NOT NULL,
  connection_version INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX corporate_crm_syncs_org ON corporate_crm_syncs(organisation_id,updated_at);
CREATE TRIGGER corporate_lead_crm_retention BEFORE DELETE ON corporate_leads BEGIN
  DELETE FROM corporate_crm_syncs WHERE lead_id=OLD.id;
END;
