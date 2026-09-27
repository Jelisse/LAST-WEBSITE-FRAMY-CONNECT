CREATE TABLE site_sessions (
 id TEXT PRIMARY KEY, started_at INTEGER NOT NULL, last_seen INTEGER NOT NULL,
 path TEXT NOT NULL, referrer TEXT NOT NULL, campaign TEXT NOT NULL,
 device TEXT NOT NULL, country TEXT NOT NULL
);
--> statement-breakpoint
CREATE INDEX site_sessions_active ON site_sessions(last_seen);
--> statement-breakpoint
CREATE TABLE site_events (
 id TEXT PRIMARY KEY, session_id TEXT NOT NULL, at INTEGER NOT NULL,
 kind TEXT NOT NULL, path TEXT NOT NULL, step INTEGER NOT NULL DEFAULT -1,
 load_ms REAL, lcp_ms REAL
);
--> statement-breakpoint
CREATE INDEX site_events_time ON site_events(at,kind);
--> statement-breakpoint
CREATE INDEX site_events_session ON site_events(session_id,at);
--> statement-breakpoint
CREATE UNIQUE INDEX site_steps_once ON site_events(session_id,path,step) WHERE kind='step';
--> statement-breakpoint
CREATE TABLE site_analytics_meta (id INTEGER PRIMARY KEY, started_at INTEGER NOT NULL);
--> statement-breakpoint
INSERT INTO site_analytics_meta VALUES(1,unixepoch()*1000);
