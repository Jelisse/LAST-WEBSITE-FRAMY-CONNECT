-- Anonymous daily counters: no visitor identifiers, URLs, IPs or event logs.
CREATE TABLE profile_click_totals (
 owner_id TEXT NOT NULL REFERENCES auth_accounts(id) ON DELETE CASCADE,
 at INTEGER NOT NULL,
 target TEXT NOT NULL,
 label TEXT NOT NULL,
 count INTEGER NOT NULL DEFAULT 0 CHECK(count >= 0),
 PRIMARY KEY(owner_id, at, target)
);
CREATE TABLE profile_click_lifetime (
 owner_id TEXT PRIMARY KEY REFERENCES auth_accounts(id) ON DELETE CASCADE,
 count INTEGER NOT NULL DEFAULT 0 CHECK(count >= 0)
);
