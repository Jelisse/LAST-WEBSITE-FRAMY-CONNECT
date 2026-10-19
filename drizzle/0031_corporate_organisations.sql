CREATE TABLE corporate_organisations (
 id TEXT PRIMARY KEY, owner_id TEXT NOT NULL UNIQUE REFERENCES auth_accounts(id),
 name TEXT NOT NULL, created_at INTEGER NOT NULL
);
CREATE TABLE corporate_members (
 organisation_id TEXT NOT NULL REFERENCES corporate_organisations(id), account_id TEXT NOT NULL REFERENCES auth_accounts(id),
 role TEXT NOT NULL CHECK(role IN ('leader','member')), active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1)),
 team TEXT NOT NULL DEFAULT '', accepted_at INTEGER NOT NULL, left_at INTEGER, version INTEGER NOT NULL DEFAULT 1,
 PRIMARY KEY(organisation_id,account_id)
);
CREATE TABLE corporate_invites (
 id TEXT PRIMARY KEY, organisation_id TEXT NOT NULL REFERENCES corporate_organisations(id),
 account_id TEXT NOT NULL REFERENCES auth_accounts(id), created_by TEXT NOT NULL REFERENCES auth_accounts(id),
 email TEXT NOT NULL, name TEXT NOT NULL, team TEXT NOT NULL DEFAULT '', role TEXT NOT NULL CHECK(role IN ('leader','member')), account_version INTEGER NOT NULL,
 token_hash TEXT NOT NULL UNIQUE, expires_at INTEGER NOT NULL, used_at INTEGER, revoked_at INTEGER,
 delivery TEXT NOT NULL DEFAULT 'pending' CHECK(delivery IN ('pending','accepted','uncertain')), created_at INTEGER NOT NULL
);
CREATE UNIQUE INDEX corporate_pending_invite ON corporate_invites(organisation_id,account_id) WHERE used_at IS NULL AND revoked_at IS NULL;
CREATE TABLE corporate_campaigns (
 id TEXT PRIMARY KEY, organisation_id TEXT NOT NULL REFERENCES corporate_organisations(id), name TEXT NOT NULL,
 active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1)), created_at INTEGER NOT NULL
);
CREATE TABLE corporate_assignments (
 id TEXT PRIMARY KEY, campaign_id TEXT NOT NULL REFERENCES corporate_campaigns(id), account_id TEXT NOT NULL REFERENCES auth_accounts(id),
 created_at INTEGER NOT NULL, UNIQUE(campaign_id,account_id)
);
CREATE TABLE corporate_metrics (
 assignment_id TEXT NOT NULL REFERENCES corporate_assignments(id), day INTEGER NOT NULL, target TEXT NOT NULL,
 count INTEGER NOT NULL DEFAULT 0 CHECK(count>=0), PRIMARY KEY(assignment_id,day,target)
);
CREATE TABLE corporate_leads (
 id TEXT PRIMARY KEY, assignment_id TEXT NOT NULL REFERENCES corporate_assignments(id),
 name TEXT NOT NULL, email TEXT NOT NULL DEFAULT '', phone TEXT NOT NULL DEFAULT '', interest TEXT NOT NULL DEFAULT '',
 consent_version TEXT NOT NULL, created_at INTEGER NOT NULL
);
CREATE INDEX corporate_leads_created ON corporate_leads(created_at);
CREATE TABLE corporate_audit (
 id TEXT PRIMARY KEY, organisation_id TEXT NOT NULL REFERENCES corporate_organisations(id),
 actor TEXT NOT NULL REFERENCES auth_accounts(id), action TEXT NOT NULL, subject TEXT NOT NULL, created_at INTEGER NOT NULL
);
CREATE VIEW corporate_active_organisations AS SELECT o.*,CASE WHEN json_extract(m.terms_json,'$.memberLimit') BETWEEN 1 AND 500 THEN CAST(json_extract(m.terms_json,'$.memberLimit') AS INTEGER) ELSE 25 END AS seats,COALESCE(json_extract(m.terms_json,'$.features.analytics'),1) AS analytics
 FROM corporate_organisations o JOIN auth_accounts a ON a.id=o.owner_id AND a.active=1 JOIN profile_membership_view m ON m.owner_id=o.owner_id
 WHERE m.plan_id NOT IN ('personal','free-30') AND (m.plan_id='corporate' OR json_extract(m.terms_json,'$.corporateEnabled')=1)
 AND json_extract(m.terms_json,'$.id')=m.plan_id AND json_extract(m.terms_json,'$.entitlementVersion')=1 AND json_extract(m.terms_json,'$.links')>0
 AND COALESCE(json_extract(m.terms_json,'$.features.teams'),1)=1
 AND julianday(m.paid_started_at)<=julianday('now') AND julianday(m.paid_expires_at)>julianday(m.paid_started_at)
 AND julianday(m.paid_expires_at)+7>julianday('now');
CREATE VIEW corporate_effective_members AS SELECT m.* FROM corporate_members m JOIN corporate_active_organisations o ON o.id=m.organisation_id JOIN auth_accounts a ON a.id=m.account_id AND a.active=1
 WHERE m.active=1 AND (m.account_id=o.owner_id OR (SELECT COUNT(*) FROM corporate_members earlier WHERE earlier.organisation_id=o.id AND earlier.active=1 AND earlier.account_id<>o.owner_id AND (earlier.accepted_at<m.accepted_at OR (earlier.accepted_at=m.accepted_at AND earlier.account_id<=m.account_id)))<=o.seats);
CREATE TRIGGER corporate_invite_guard BEFORE INSERT ON corporate_invites WHEN
 EXISTS(SELECT 1 FROM auth_accounts a WHERE a.id=NEW.account_id AND a.password_hash='!corporate-pending' AND (a.active<>0 OR a.version<>1)) OR
 NOT EXISTS(SELECT 1 FROM corporate_active_organisations o JOIN corporate_effective_members m ON m.organisation_id=o.id AND m.account_id=NEW.created_by AND m.active=1 AND m.role='leader' JOIN auth_accounts a ON a.id=m.account_id AND a.active=1 WHERE o.id=NEW.organisation_id AND (NEW.role='member' OR o.owner_id=NEW.created_by)
 AND (SELECT COUNT(*) FROM corporate_members WHERE organisation_id=o.id AND active=1 AND account_id<>o.owner_id)+(SELECT COUNT(*) FROM corporate_invites WHERE organisation_id=o.id AND used_at IS NULL AND revoked_at IS NULL AND expires_at>CAST(strftime('%s','now') AS INTEGER)*1000)<o.seats)
 BEGIN SELECT RAISE(ABORT,'corporate invitation unavailable'); END;
CREATE TRIGGER corporate_member_capacity BEFORE INSERT ON corporate_members WHEN NEW.active=1 AND
 NOT EXISTS(SELECT 1 FROM corporate_active_organisations o WHERE o.id=NEW.organisation_id AND (NEW.account_id=o.owner_id OR (SELECT COUNT(*) FROM corporate_members WHERE organisation_id=o.id AND active=1 AND account_id<>o.owner_id)<o.seats))
 BEGIN SELECT RAISE(ABORT,'corporate capacity exceeded'); END;
CREATE TRIGGER corporate_member_reactivate BEFORE UPDATE OF active ON corporate_members WHEN NEW.active=1 AND OLD.active=0 AND
 (NEW.left_at IS NOT NULL OR NOT EXISTS(SELECT 1 FROM corporate_active_organisations o WHERE o.id=NEW.organisation_id AND (SELECT COUNT(*) FROM corporate_members WHERE organisation_id=o.id AND active=1 AND account_id<>o.owner_id)+(SELECT COUNT(*) FROM corporate_invites WHERE organisation_id=o.id AND used_at IS NULL AND revoked_at IS NULL AND expires_at>CAST(strftime('%s','now') AS INTEGER)*1000)<o.seats))
 BEGIN SELECT RAISE(ABORT,'corporate capacity exceeded'); END;
