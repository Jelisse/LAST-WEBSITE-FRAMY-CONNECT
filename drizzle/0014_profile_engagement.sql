CREATE TABLE profile_engagement (
  id TEXT PRIMARY KEY NOT NULL,
  owner_id TEXT NOT NULL,
  session_hash TEXT NOT NULL,
  at INTEGER NOT NULL,
  kind TEXT NOT NULL CHECK(kind IN ('view','action')),
  target TEXT NOT NULL,
  label TEXT NOT NULL
);
CREATE INDEX profile_engagement_owner_time ON profile_engagement(owner_id,at);
CREATE INDEX profile_engagement_time ON profile_engagement(at);
