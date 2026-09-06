import {
  bigint,
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

// Cloud hub schema (Neon Postgres). Logical mirror of schema.sqlite.ts.
// Money: bigint kobo. Timestamps: timestamp. IDs: app UUIDs.
// NOTE (D2 scope cut): no payments table and no invoices.status column in v1.

export const roleEnum = pgEnum("role", ["OWNER", "STAFF", "ADMIN_DEV"]);

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: roleEnum("role").notNull().default("STAFF"),
  createdAt: timestamp("created_at").notNull(),
});

export const businessSettings = pgTable("business_settings", {
  id: text("id").primaryKey(),
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
  updatedAt: timestamp("updated_at").notNull(),
});

export const customers = pgTable(
  "customers",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    address: text("address"),
    phone: text("phone"),
    email: text("email"),
    notes: text("notes"),
    createdAt: timestamp("created_at").notNull(),
  },
  (t) => [index("customers_name_idx").on(t.name)],
);

export const invoices = pgTable(
  "invoices",
  {
    id: text("id").primaryKey(),
    invoiceNo: integer("invoice_no").unique(),
    isProvisional: boolean("is_provisional").notNull().default(true),
    customerId: text("customer_id")
      .notNull()
      .references(() => customers.id),
    date: timestamp("date").notNull(),
    lpoNumber: text("lpo_number"),
    invoiceDetails: text("invoice_details").notNull(),
    totalKobo: bigint("total_kobo", { mode: "number" }).notNull(),
    isVoid: boolean("is_void").notNull().default(false),
    voidReason: text("void_reason"),
    supersedesInvoiceId: text("supersedes_invoice_id"),
    createdById: text("created_by_id")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at").notNull(),
  },
  (t) => [
    index("invoices_invoice_no_idx").on(t.invoiceNo),
    index("invoices_customer_id_idx").on(t.customerId),
    index("invoices_date_idx").on(t.date),
  ],
);

export const invoiceItems = pgTable("invoice_items", {
  id: text("id").primaryKey(),
  invoiceId: text("invoice_id")
    .notNull()
    .references(() => invoices.id),
  position: integer("position").notNull(),
  qtyLabel: text("qty_label").notNull(),
  description: text("description").notNull(),
  rateKobo: bigint("rate_kobo", { mode: "number" }).notNull(),
  amountKobo: bigint("amount_kobo", { mode: "number" }).notNull(),
});

export const syncState = pgTable("sync_state", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
});
