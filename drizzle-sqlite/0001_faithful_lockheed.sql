ALTER TABLE `invoices` ADD `additional_info` text;--> statement-breakpoint
ALTER TABLE `invoices` ADD `tax_percent` integer DEFAULT 0 NOT NULL;