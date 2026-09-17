ALTER TABLE auth_accounts ADD version INTEGER NOT NULL DEFAULT 1;
--> statement-breakpoint

CREATE UNIQUE INDEX `auth_accounts_email_unique` ON `auth_accounts` (`email`);
--> statement-breakpoint

CREATE TABLE `auth_invitations` (
	`token_hash` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`created_by` text NOT NULL,
	`expires_at` integer NOT NULL,
	`used_at` integer,
	`created_at` text NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `auth_accounts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by`) REFERENCES `auth_accounts`(`id`) ON UPDATE no action ON DELETE no action
);

--> statement-breakpoint

CREATE INDEX `invitations_account` ON `auth_invitations` (`account_id`);
--> statement-breakpoint

CREATE TABLE `payment_records` (
	`id` text PRIMARY KEY NOT NULL,
	`order_id` text NOT NULL,
	`kind` text NOT NULL,
	`provider_reference` text NOT NULL,
	`amount` integer NOT NULL,
	`currency` text NOT NULL,
	`verified_by` text NOT NULL,
	`verified_at` text NOT NULL,
	FOREIGN KEY (`order_id`) REFERENCES `sandbox_orders`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`verified_by`) REFERENCES `auth_accounts`(`id`) ON UPDATE no action ON DELETE no action
);

--> statement-breakpoint

CREATE UNIQUE INDEX `payment_reference_unique` ON `payment_records` (`kind`,`provider_reference`);
--> statement-breakpoint

CREATE UNIQUE INDEX `payment_order_kind_unique` ON `payment_records` (`order_id`,`kind`);
--> statement-breakpoint

CREATE TABLE `stored_assets` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`kind` text NOT NULL,
	`bytes` integer NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`owner_id`) REFERENCES `auth_accounts`(`id`) ON UPDATE no action ON DELETE no action
);

--> statement-breakpoint

CREATE INDEX `assets_owner` ON `stored_assets` (`owner_id`);
--> statement-breakpoint
CREATE INDEX orders_status_created ON sandbox_orders(json_extract(data_json,'$.status'),created_at);
--> statement-breakpoint
CREATE INDEX orders_agent ON sandbox_orders(json_extract(data_json,'$.agentId'));
--> statement-breakpoint
CREATE INDEX movements_location ON stock_movements(product_id,agent_id);
--> statement-breakpoint
CREATE TRIGGER profile_owner_insert BEFORE INSERT ON profiles WHEN NOT EXISTS(SELECT 1 FROM auth_accounts WHERE id=NEW.owner_id) BEGIN SELECT RAISE(ABORT,'profile account missing'); END;
--> statement-breakpoint
CREATE TRIGGER membership_owner_insert BEFORE INSERT ON sandbox_memberships WHEN NOT EXISTS(SELECT 1 FROM auth_accounts WHERE id=NEW.owner_id) BEGIN SELECT RAISE(ABORT,'membership account missing'); END;
--> statement-breakpoint
CREATE TRIGGER order_owner_insert BEFORE INSERT ON sandbox_orders WHEN NOT EXISTS(SELECT 1 FROM auth_accounts WHERE id=NEW.owner_id) BEGIN SELECT RAISE(ABORT,'order account missing'); END;
--> statement-breakpoint
CREATE TRIGGER event_order_insert BEFORE INSERT ON sandbox_events WHEN NOT EXISTS(SELECT 1 FROM sandbox_orders WHERE id=NEW.order_id AND owner_id=NEW.owner_id) BEGIN SELECT RAISE(ABORT,'event order missing'); END;
--> statement-breakpoint
CREATE TRIGGER profile_owner_immutable BEFORE UPDATE OF owner_id ON profiles WHEN NEW.owner_id<>OLD.owner_id BEGIN SELECT RAISE(ABORT,'profile owner immutable'); END;
--> statement-breakpoint
CREATE TRIGGER membership_owner_immutable BEFORE UPDATE OF owner_id ON sandbox_memberships WHEN NEW.owner_id<>OLD.owner_id BEGIN SELECT RAISE(ABORT,'membership owner immutable'); END;
--> statement-breakpoint
CREATE TRIGGER order_owner_immutable BEFORE UPDATE OF owner_id ON sandbox_orders WHEN NEW.owner_id<>OLD.owner_id BEGIN SELECT RAISE(ABORT,'order owner immutable'); END;
--> statement-breakpoint
CREATE TRIGGER account_delete_guard BEFORE DELETE ON auth_accounts WHEN EXISTS(SELECT 1 FROM profiles WHERE owner_id=OLD.id) OR EXISTS(SELECT 1 FROM sandbox_orders WHERE owner_id=OLD.id) OR EXISTS(SELECT 1 FROM sandbox_memberships WHERE owner_id=OLD.id) BEGIN SELECT RAISE(ABORT,'account still referenced'); END;
