import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

// Local operational schema (SQLite via better-sqlite3).
// Mirrors schema.pg.ts logically — change both in the same commit.
// Money: integer kobo. Timestamps: ISO-8601 text. IDs: app UUIDs.
// NOTE (D2 scope cut): no payments table and no invoices.status column in v1.
// Invoice states in v1: isProvisional (DRAFT) / finalized (has number) / isVoid.

export type UserRole = "OWNER" | "STAFF" | "ADMIN_DEV";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  // SQLite has no native enum: plain text + app-level check.
  role: text("role").$type<UserRole>().notNull().default("STAFF"),
  createdAt: text("created_at").notNull(), // ISO-8601
});

export const businessSettings = sqliteTable("business_settings", {
  id: text("id").primaryKey(), // constant "singleton"
  companyName: text("company_name").notNull(),
  tagline: text("tagline"),
  addressLines: text("address_lines"),
  phone: text("phone"),
  logoUrl: text("logo_url"),
  footerNote: text("footer_note"),
  invoiceNumberPrefix: text("invoice_number_prefix").notNull().default("WSNLI-"),
  nextInvoiceNumber: integer("next_invoice_number").notNull(),
  bankName: text("bank_name"),
  bankAccountName: text("bank_account_name"),
  bankAccountNumber: text("bank_account_number"),
  updatedAt: text("updated_at").notNull(), // ISO-8601
});

export const customers = sqliteTable(
  "customers",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    address: text("address"),
    phone: text("phone"),
    email: text("email"),
    notes: text("notes"),
    createdAt: text("created_at").notNull(),
  },
  (t) => [index("customers_name_idx").on(t.name)],
);

export const invoices = sqliteTable(
  "invoices",
  {
    id: text("id").primaryKey(),
    // NULL until finalized by sync (Neon assigns the number).
    invoiceNo: integer("invoice_no").unique(),
    isProvisional: integer("is_provisional", { mode: "boolean" }).notNull().default(true),
    customerId: text("customer_id")
      .notNull()
      .references(() => customers.id),
    date: text("date").notNull(), // ISO-8601
    lpoNumber: text("lpo_number"),
    invoiceDetails: text("invoice_details").notNull(),
    additionalInfo: text("additional_info"),
    taxPercent: integer("tax_percent").notNull().default(0),
    totalKobo: integer("total_kobo").notNull(),
    isVoid: integer("is_void", { mode: "boolean" }).notNull().default(false),
    voidReason: text("void_reason"),
    supersedesInvoiceId: text("supersedes_invoice_id"),
    createdById: text("created_by_id")
      .notNull()
      .references(() => users.id),
    createdAt: text("created_at").notNull(),
  },
  (t) => [
    index("invoices_invoice_no_idx").on(t.invoiceNo),
    index("invoices_customer_id_idx").on(t.customerId),
    index("invoices_date_idx").on(t.date),
  ],
);

export const invoiceItems = sqliteTable("invoice_items", {
  id: text("id").primaryKey(),
  invoiceId: text("invoice_id")
    .notNull()
    .references(() => invoices.id),
  position: integer("position").notNull(),
  qtyLabel: text("qty_label").notNull(),
  description: text("description").notNull(),
  rateKobo: integer("rate_kobo").notNull(),
  amountKobo: integer("amount_kobo").notNull(),
});

// Local-only sync bookkeeping (last sync time, sync-key hash).
// Present in both schemas; rows are node-local except the key hash
// which the Neon side also stores so a new device can verify its key.
export const syncState = sqliteTable("sync_state", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: text("updated_at").notNull(),
});
