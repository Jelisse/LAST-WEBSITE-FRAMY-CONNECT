ALTER TABLE corporate_followups ADD COLUMN tags TEXT NOT NULL DEFAULT '';
ALTER TABLE corporate_followups ADD COLUMN assignee TEXT NOT NULL DEFAULT '';
CREATE TABLE corporate_followup_history (
 id TEXT PRIMARY KEY, lead_id TEXT NOT NULL REFERENCES corporate_leads(id),
 actor_id TEXT NOT NULL REFERENCES auth_accounts(id), details_json TEXT NOT NULL CHECK(json_valid(details_json)), created_at INTEGER NOT NULL
);
CREATE INDEX corporate_followup_history_lead ON corporate_followup_history(lead_id,created_at);
CREATE TABLE corporate_card_metrics (
 card_id TEXT NOT NULL REFERENCES corporate_cards(id), day INTEGER NOT NULL, target TEXT NOT NULL,
 count INTEGER NOT NULL DEFAULT 0 CHECK(count>=0), PRIMARY KEY(card_id,day,target)
);
CREATE TABLE corporate_prepared_cards (
 organisation_id TEXT NOT NULL REFERENCES corporate_organisations(id), account_id TEXT NOT NULL REFERENCES auth_accounts(id),
 draft_json TEXT NOT NULL CHECK(json_valid(draft_json)), version INTEGER NOT NULL DEFAULT 1,
 PRIMARY KEY(organisation_id,account_id)
);
CREATE TRIGGER corporate_lead_retention BEFORE DELETE ON corporate_leads BEGIN
 DELETE FROM corporate_followup_history WHERE lead_id=OLD.id;
 DELETE FROM corporate_followups WHERE lead_id=OLD.id;
END;
