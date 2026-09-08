CREATE TABLE `profiles` (
	`owner_id` text PRIMARY KEY NOT NULL,
	`username` text NOT NULL,
	`draft_json` text NOT NULL,
	`published_json` text,
	`version` integer DEFAULT 1 NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `profiles_username_unique` ON `profiles` (`username`);--> statement-breakpoint
CREATE TABLE `sandbox_events` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`order_id` text NOT NULL,
	`action` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `events_owner_time` ON `sandbox_events` (`owner_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `sandbox_orders` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`data_json` text NOT NULL,
	`version` integer NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `orders_owner` ON `sandbox_orders` (`owner_id`);