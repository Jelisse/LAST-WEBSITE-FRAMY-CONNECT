CREATE TABLE `sandbox_memberships` (
	`owner_id` text PRIMARY KEY NOT NULL,
	`plan_id` text NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`updated_at` text NOT NULL
);
