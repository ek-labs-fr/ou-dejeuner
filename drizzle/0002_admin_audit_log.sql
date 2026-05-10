CREATE TABLE `admin_audit_log` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`action` text NOT NULL,
	`target_type` text,
	`target_id` text,
	`payload` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
