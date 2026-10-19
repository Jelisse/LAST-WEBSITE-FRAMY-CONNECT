CREATE TABLE profile_publication_alerts (
 owner_id TEXT PRIMARY KEY REFERENCES auth_accounts(id) ON DELETE CASCADE,
 username TEXT NOT NULL, name TEXT NOT NULL, created_at INTEGER NOT NULL,
 status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','sent','review','baseline')),
 first_attempt_at INTEGER, attempted_at INTEGER, sent_at INTEGER
);
CREATE INDEX profile_publication_alerts_pending ON profile_publication_alerts(status,created_at);
-- Existing publications establish a baseline; deployment never emails the old catalogue.
INSERT INTO profile_publication_alerts(owner_id,username,name,created_at,status)
 SELECT p.owner_id,p.username,a.name,CAST(strftime('%s','now') AS INTEGER)*1000,'baseline'
 FROM profiles p JOIN auth_accounts a ON a.id=p.owner_id WHERE p.published_json IS NOT NULL;
CREATE TRIGGER profile_publication_alert_insert AFTER INSERT ON profiles WHEN NEW.published_json IS NOT NULL
 BEGIN INSERT OR IGNORE INTO profile_publication_alerts(owner_id,username,name,created_at)
 SELECT NEW.owner_id,NEW.username,a.name,CAST(strftime('%s','now') AS INTEGER)*1000 FROM auth_accounts a WHERE a.id=NEW.owner_id; END;
CREATE TRIGGER profile_publication_alert_update AFTER UPDATE OF published_json ON profiles WHEN OLD.published_json IS NULL AND NEW.published_json IS NOT NULL
 BEGIN INSERT OR IGNORE INTO profile_publication_alerts(owner_id,username,name,created_at)
 SELECT NEW.owner_id,NEW.username,a.name,CAST(strftime('%s','now') AS INTEGER)*1000 FROM auth_accounts a WHERE a.id=NEW.owner_id; END;
