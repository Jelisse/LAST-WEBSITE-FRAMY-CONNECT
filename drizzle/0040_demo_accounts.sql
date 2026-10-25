CREATE TABLE demo_accounts (
 account_id TEXT PRIMARY KEY REFERENCES auth_accounts(id), label TEXT NOT NULL,
 expires_at INTEGER NOT NULL, created_at INTEGER NOT NULL
);
