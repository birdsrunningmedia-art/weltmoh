CREATE TABLE `business_settings` (
	`id` text PRIMARY KEY NOT NULL,
	`company_name` text NOT NULL,
	`tagline` text,
	`address_lines` text,
	`phone` text,
	`logo_url` text,
	`footer_note` text,
	`invoice_number_prefix` text DEFAULT 'WSNLI-' NOT NULL,
	`next_invoice_number` integer NOT NULL,
	`bank_name` text,
	`bank_account_name` text,
	`bank_account_number` text,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `customers` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`address` text,
	`phone` text,
	`email` text,
	`notes` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `customers_name_idx` ON `customers` (`name`);--> statement-breakpoint
CREATE TABLE `invoice_items` (
	`id` text PRIMARY KEY NOT NULL,
	`invoice_id` text NOT NULL,
	`position` integer NOT NULL,
	`qty_label` text NOT NULL,
	`description` text NOT NULL,
	`rate_kobo` integer NOT NULL,
	`amount_kobo` integer NOT NULL,
	FOREIGN KEY (`invoice_id`) REFERENCES `invoices`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `invoices` (
	`id` text PRIMARY KEY NOT NULL,
	`invoice_no` integer,
	`is_provisional` integer DEFAULT true NOT NULL,
	`customer_id` text NOT NULL,
	`date` text NOT NULL,
	`lpo_number` text,
	`invoice_details` text NOT NULL,
	`total_kobo` integer NOT NULL,
	`is_void` integer DEFAULT false NOT NULL,
	`void_reason` text,
	`supersedes_invoice_id` text,
	`created_by_id` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `invoices_invoice_no_unique` ON `invoices` (`invoice_no`);--> statement-breakpoint
CREATE INDEX `invoices_invoice_no_idx` ON `invoices` (`invoice_no`);--> statement-breakpoint
CREATE INDEX `invoices_customer_id_idx` ON `invoices` (`customer_id`);--> statement-breakpoint
CREATE INDEX `invoices_date_idx` ON `invoices` (`date`);--> statement-breakpoint
CREATE TABLE `sync_state` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`password_hash` text NOT NULL,
	`role` text DEFAULT 'STAFF' NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);