CREATE TABLE `agent_applications` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`data_json` text NOT NULL,
	`status` text DEFAULT 'DRAFT' NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`review_note` text DEFAULT '' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`owner_id`) REFERENCES `auth_accounts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `agent_applications_owner_id_unique` ON `agent_applications` (`owner_id`);--> statement-breakpoint
CREATE INDEX `applications_status_updated` ON `agent_applications` (`status`,`updated_at`);--> statement-breakpoint
CREATE TABLE `application_files` (
	`id` text PRIMARY KEY NOT NULL,
	`application_id` text NOT NULL,
	`kind` text NOT NULL,
	FOREIGN KEY (`application_id`) REFERENCES `agent_applications`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `application_files_kind` ON `application_files` (`application_id`,`kind`);--> statement-breakpoint
CREATE TABLE `product_visits` (
	`id` text PRIMARY KEY NOT NULL,
	`product_id` text NOT NULL,
	`day` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `product_visits_day_product` ON `product_visits` (`day`,`product_id`);