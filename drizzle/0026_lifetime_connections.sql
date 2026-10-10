CREATE TABLE profile_connections (
  owner_id TEXT NOT NULL,
  session_hash TEXT NOT NULL,
  PRIMARY KEY(owner_id,session_hash)
);
INSERT OR IGNORE INTO profile_connections(owner_id,session_hash)
SELECT owner_id,session_hash FROM profile_engagement WHERE kind='action' AND (target IN ('contact','whatsapp','directions','email','phone','website') OR target GLOB 'link:[0-9]*' OR target GLOB 'service:[0-5]');
