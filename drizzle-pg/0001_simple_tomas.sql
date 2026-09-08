ALTER TABLE "invoices" ADD COLUMN "additional_info" text;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "tax_percent" integer DEFAULT 0 NOT NULL;