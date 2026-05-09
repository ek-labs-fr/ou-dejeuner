CREATE TABLE `banned_browser_ids` (
	`browser_id` text PRIMARY KEY NOT NULL,
	`reason` text,
	`banned_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `closure_reports` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`place_id` text NOT NULL,
	`browser_id` text NOT NULL,
	`display_name` text NOT NULL,
	`note` text,
	`status` text DEFAULT 'open' NOT NULL,
	`reported_at` integer DEFAULT (unixepoch()) NOT NULL,
	`resolved_at` integer,
	FOREIGN KEY (`place_id`) REFERENCES `restaurants`(`place_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `comments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`place_id` text NOT NULL,
	`browser_id` text NOT NULL,
	`display_name` text NOT NULL,
	`body` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer,
	FOREIGN KEY (`place_id`) REFERENCES `restaurants`(`place_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `reactions` (
	`browser_id` text NOT NULL,
	`place_id` text NOT NULL,
	`kind` text NOT NULL,
	`display_name` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	PRIMARY KEY(`browser_id`, `place_id`),
	FOREIGN KEY (`place_id`) REFERENCES `restaurants`(`place_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `restaurants` (
	`place_id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`address` text NOT NULL,
	`latitude` real NOT NULL,
	`longitude` real NOT NULL,
	`google_maps_uri` text NOT NULL,
	`primary_type` text,
	`primary_type_label` text,
	`primary_type_icon` text,
	`types` text DEFAULT '[]' NOT NULL,
	`types_labels` text DEFAULT '[]' NOT NULL,
	`types_icons` text DEFAULT '[]' NOT NULL,
	`price_level` text,
	`opening_hours` text,
	`business_status` text NOT NULL,
	`source` text NOT NULL,
	`approved_at` integer,
	`is_hidden` integer DEFAULT false NOT NULL,
	`new_badge_override` text DEFAULT 'auto' NOT NULL,
	`override_dine_in` text DEFAULT 'auto' NOT NULL,
	`override_takeaway` text DEFAULT 'auto' NOT NULL,
	`override_vegetarian` text DEFAULT 'auto' NOT NULL,
	`override_halal` text DEFAULT 'auto' NOT NULL,
	`first_seen_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `submissions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`browser_id` text NOT NULL,
	`display_name` text NOT NULL,
	`source_url` text,
	`name_input` text,
	`address_input` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`resolved_place_id` text,
	`reject_reason` text,
	`submitted_at` integer DEFAULT (unixepoch()) NOT NULL,
	`decided_at` integer,
	FOREIGN KEY (`resolved_place_id`) REFERENCES `restaurants`(`place_id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `tag_marks` (
	`browser_id` text NOT NULL,
	`place_id` text NOT NULL,
	`attribute` text NOT NULL,
	`display_name` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	PRIMARY KEY(`browser_id`, `place_id`, `attribute`),
	FOREIGN KEY (`place_id`) REFERENCES `restaurants`(`place_id`) ON UPDATE no action ON DELETE cascade
);
