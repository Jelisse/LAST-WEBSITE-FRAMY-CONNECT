CREATE TABLE auth_recovery (
 token_hash TEXT PRIMARY KEY,
 account_id TEXT NOT NULL REFERENCES auth_accounts(id),
 account_version INTEGER NOT NULL,
 email TEXT NOT NULL,
 created_by TEXT NOT NULL REFERENCES auth_accounts(id),
 expires_at INTEGER NOT NULL,
 created_at INTEGER NOT NULL,
 delivered INTEGER NOT NULL DEFAULT 0 CHECK(delivered IN (0,1))
);
CREATE INDEX auth_recovery_account ON auth_recovery(account_id);
CREATE INDEX auth_recovery_expiry ON auth_recovery(expires_at);
