CREATE TABLE corporate_requests (
 owner_id TEXT PRIMARY KEY REFERENCES auth_accounts(id), company TEXT NOT NULL, details_json TEXT NOT NULL,
 people INTEGER NOT NULL CHECK(people BETWEEN 1 AND 500),
 status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','submitted','approved','suspended')),
 version INTEGER NOT NULL DEFAULT 1, delivery TEXT NOT NULL DEFAULT 'pending' CHECK(delivery IN ('pending','accepted','uncertain')),
 submitted_at INTEGER, approved_at INTEGER, approved_by TEXT REFERENCES auth_accounts(id),
 seats INTEGER CHECK(seats BETWEEN 1 AND 500), updated_at INTEGER NOT NULL
);
CREATE INDEX corporate_requests_status ON corporate_requests(status,updated_at);
ALTER TABLE corporate_invites ADD COLUMN mode TEXT NOT NULL DEFAULT 'invite' CHECK(mode IN ('invite','authorization'));
CREATE TABLE corporate_employee_access (
 organisation_id TEXT NOT NULL REFERENCES corporate_organisations(id), account_id TEXT NOT NULL UNIQUE REFERENCES auth_accounts(id),
 authorized_at INTEGER NOT NULL, provisioned_at INTEGER, revoked_at INTEGER,
 PRIMARY KEY(organisation_id,account_id)
);
DROP VIEW corporate_active_organisations;
CREATE VIEW corporate_active_organisations AS
 SELECT o.*,r.seats AS seats,1 AS analytics FROM corporate_organisations o JOIN corporate_requests r ON r.owner_id=o.owner_id AND r.status='approved'
 JOIN auth_accounts a ON a.id=o.owner_id AND a.active=1
 UNION ALL
SELECT o.*,CASE WHEN json_extract(m.terms_json,'$.memberLimit') BETWEEN 1 AND 500 THEN CAST(json_extract(m.terms_json,'$.memberLimit') AS INTEGER) ELSE 25 END AS seats,COALESCE(json_extract(m.terms_json,'$.features.analytics'),1) AS analytics
 FROM corporate_organisations o JOIN auth_accounts a ON a.id=o.owner_id AND a.active=1 JOIN profile_membership_view m ON m.owner_id=o.owner_id
 WHERE m.plan_id NOT IN ('personal','free-30') AND (m.plan_id='corporate' OR json_extract(m.terms_json,'$.corporateEnabled')=1)
 AND json_extract(m.terms_json,'$.id')=m.plan_id AND json_extract(m.terms_json,'$.entitlementVersion')=1 AND json_extract(m.terms_json,'$.links')>0
 AND COALESCE(json_extract(m.terms_json,'$.features.teams'),1)=1
 AND julianday(m.paid_started_at)<=julianday('now') AND julianday(m.paid_expires_at)>julianday(m.paid_started_at)
 AND julianday(m.paid_expires_at)+7>julianday('now') AND NOT EXISTS(SELECT 1 FROM corporate_requests r WHERE r.owner_id=o.owner_id AND r.status IN ('approved','suspended'));
CREATE TRIGGER corporate_managed_leave AFTER UPDATE OF left_at ON corporate_members WHEN NEW.left_at IS NOT NULL
 BEGIN UPDATE corporate_employee_access SET revoked_at=NEW.left_at WHERE organisation_id=NEW.organisation_id AND account_id=NEW.account_id; END;
