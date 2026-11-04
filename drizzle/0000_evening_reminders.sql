CREATE TABLE reminder_devices (
  id TEXT PRIMARY KEY NOT NULL,
  owner TEXT NOT NULL,
  token_hash TEXT NOT NULL,
  subscription TEXT NOT NULL,
  days TEXT NOT NULL,
  version INTEGER NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1,
  last_sent_day TEXT,
  last_test_at INTEGER NOT NULL DEFAULT 0
);
--> statement-breakpoint
CREATE INDEX reminder_devices_owner ON reminder_devices (owner);
--> statement-breakpoint
CREATE TABLE reminder_runs (
  id TEXT PRIMARY KEY NOT NULL,
  started_at TEXT NOT NULL,
  day TEXT NOT NULL,
  status TEXT NOT NULL,
  sent INTEGER NOT NULL,
  failed INTEGER NOT NULL,
  skipped INTEGER NOT NULL
);
