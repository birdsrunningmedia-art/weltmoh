# Implementation Brief: Weltmoh Invoicing App

**Read this whole file before writing any code.** This is a spec for an AI coding
agent (Antigravity / opencode) building an invoicing app for a real small
business. Prioritize correctness of business logic (invoice numbering, totals,
payment status) over visual polish — the owner will judge this on whether it
can survive a dispute in court/negotiation, not on how flashy it looks.

---

## 0. Decisions log (from stakeholder interview — do not silently override these)

| Decision | Answer | Why it matters |
|---|---|---|
| Where is it used? | Normally one computer/laptop in the office. Must support switching to a different computer if the usual one is unavailable (e.g. broken, replaced). | Not truly multi-device-simultaneous, but must support "device handoff" — see §2. |
| Where should data live? | Cloud-hosted (Neon), for remote access/recovery | Combined with the offline requirement below: Neon is the always-available hub; local SQLite is what the app actually runs against day-to-day. |
| Internet reliability? | Frequently drops/unstable | The app must never be blocked by connectivity for normal use. |
| Behavior on connection drop? | Must keep working fully offline; sync when back online | Local SQLite is the operational source of truth on the active device. Neon is the durable hub that survives device loss. |
| Who maintains this long-term? | Yekini (technically capable, commissioning this) | OK to require some technical setup (env vars, a scheduled task, a one-time sync key). |
| Hosting budget? | Very tight — near-free, under $5/month | Favor free tiers (Neon free tier, Cloudflare R2/Backblaze B2 free tier) over paid managed services. |
| DB/ORM preference? | Drizzle ORM. Local storage should be a **file** (not PGlite's directory-based store), with Neon as the cloud side. | Resolved as: **SQLite** (via `better-sqlite3`) locally, **Neon (Postgres)** in the cloud — see §2 for how the dialect difference is handled. |
| Multi-device support | Must be possible to set up a **new** computer and recover the full business's data if the original device is lost/broken/replaced. | This makes Neon the durable hub the business can always recover from — not just a backup, but the reference copy used to bootstrap any new device. |
| Invoice numbering under multi-device risk | Numbers must never collide or get silently renumbered after being handed to a customer. | Resolved as: invoices are **provisional/draft** (no permanent number) until the creating device is online and Neon has assigned the real next number. No clock-trust, no post-hoc renumbering. See §3 and §5. |
| Multi-tenancy (future sellable product) | **Not for v1.** Build single-business only; do not add tenant abstractions now. | Keeps v1 simple. If this becomes a product for other businesses later, that's a deliberate, separate redesign — don't pay that complexity cost now. |
| Bank/payment details on invoice | **Yes** — add as a configurable field (not hardcoded), shown on the invoice. | Business settings (name, address, logo, bank details, footer text) live in one settings table/screen rather than being hardcoded in the template — see §4 and §7. |
| Password recovery | No email service is assumed (deliberately, to stay fully offline-capable and free). Owner manually resets a Staff member's password. | Acceptable for a 2–3 person team; revisit only if the team grows. |

---

## 1. Product summary

**Product:** Invoicing app for Weltmoh Services Nigeria Ltd — a marine
services company (equipment leasing, procurement, marine services, supply &
general contract). They do NOT sell physical goods off a shelf; every invoice
is for a job/contract.

**Users (3 roles, no self-signup — accounts created manually by Owner):**
- `owner` — full access: create/view/edit customers & invoices, mark payments,
  view all reports, manage staff accounts, edit business settings.
- `staff` — can create customers and invoices, record payments received.
  Cannot delete/void invoices, cannot edit an invoice after it's finalized,
  cannot manage users or business settings.
- `admin_dev` (Yekini) — same as owner, plus access to raw data export,
  backup/restore tooling, and device sync management.

**Primary goal:** replace the paper invoice book with a system that (a)
produces a professional PDF/image that looks like their existing paper
invoice, (b) stores customers so recurring clients don't need re-entry, (c)
makes it possible to search/filter invoice history to resolve future payment
disputes, and (d) survives the loss of the office computer without losing
business data.

**Explicitly out of scope for v1:** multi-currency, tax/VAT calculation
automation, online payment collection, multi-tenant/multi-company support
(§0), mobile native app (responsive web is enough).

---

## 2. Architecture: local-first SQLite + Neon as the durable cloud hub

Because this normally runs on one office machine with unreliable internet,
but must also be recoverable on a **different** machine if needed (§0):

- **Framework:** Next.js 14+ (App Router), TypeScript — run in **production
  mode locally** (`next build && next start`), accessed via `localhost` in a
  browser on the active machine. Do not deploy this to Vercel or any
  serverless host as the primary deployment — a persistent local file is
  central to how this app stays usable offline.
  - Optional later nice-to-have: wrap it in Electron/Tauri for a proper
    desktop-app feel. Not v1.

- **Local database (operational source of truth on the active device):**
  **SQLite**, accessed via `drizzle-orm/better-sqlite3`, stored as a single
  file (e.g. `data/weltmoh.db`). Mature, synchronous, no separate server
  process, trivial to back up (it's literally one file). Every normal
  app read/write goes here — the app must work with zero internet.

- **Cloud database (durable hub, not just a backup):** **Neon** (Postgres),
  accessed via `drizzle-orm/neon-http` only by the sync job — the day-to-day
  app never talks to Neon directly. Neon is what makes device recovery
  possible: it holds the authoritative full history, and any new device
  bootstraps itself from it.

- **Two schema files, small type mapping:** SQLite and Postgres aren't the
  same dialect, so maintain two Drizzle schema definitions describing the
  same logical tables — `schema.sqlite.ts` (`drizzle-orm/sqlite-core`) and
  `schema.pg.ts` (`drizzle-orm/pg-core`). For this app the mapping is small
  and low-risk:
  - **IDs:** plain `text` UUIDs generated in app code (not DB-native
    autoincrement) in both schemas — keeps rows identical across both
    stores, makes sync trivial (no ID remapping).
  - **Money (`*Kobo` fields):** SQLite `integer`, Postgres `bigint` — both
    exact integers, no precision loss.
  - **Timestamps:** ISO-8601 `text` in SQLite, `timestamp` in Postgres —
    simple string↔date conversion in the sync job.
  - **Booleans:** SQLite has no native boolean (0/1 integer) — Drizzle's
    `integer("...", { mode: "boolean" })` handles this; Postgres schema
    uses `boolean` directly.
  - **Enums:** plain `text` with a check constraint in SQLite (Drizzle
    SQLite has no native enum), `pgEnum` in Postgres.
  Keep both schema files together in the repo and change them in the same
  commit — the sync job assumes they describe identical logical tables.

- **Sync job (local → Neon, one-way for normal writes):** a background job
  (scheduled task in the Next.js server, or a script via `node-cron`) that,
  only when a connectivity check to Neon succeeds:
  1. Pushes new/changed local rows to Neon (track via an `updatedAt` column
     or a small "dirty rows" log), applying the type conversions above.
  2. **Claims the next invoice number** for any locally-created invoice that
     doesn't have one yet (see §3/§5 — this is the one place sync is more
     than "just mirror data," it's also "finalize the invoice").
  3. Optionally uploads generated invoice PDFs to a cheap object store
     (Cloudflare R2 or Backblaze B2 free tier) as an extra off-machine copy.
  4. Logs each attempt; the UI shows last successful sync time so
     Yekini/Owner can tell at a glance if syncing has been failing.
  - A **manual "Back up now" / "Sync now" button** should exist too.
  - Do not build bidirectional sync in the general sense (no need to
    reconcile conflicting edits) — this is one active writer at a time,
    pushing up, plus one special "pull everything down" flow described next.

- **New/replacement device setup (device handoff, not simultaneous
  multi-user):** on first run, if no local SQLite file exists, the app
  should offer **"Restore from cloud"**:
  1. User enters a **sync key** (a secret generated when the business was
     first set up — treat it like a password; store it somewhere safe,
     e.g. a password manager, not in a chat or plain text file).
  2. The app authenticates to Neon with that key, pulls the full dataset
     down, and builds a fresh local SQLite file from it.
  3. From then on, this device operates normally (local-first, syncs up).
  4. The sync key should be revocable/regeneratable (even a simple "rotate
     key" action in Neon/env config is enough for v1 — a full device
     management UI is not required, since this business only ever runs one
     active device, but the *capability* to recover matters).
  - This is the actual disaster-recovery plan; test it once manually before
    considering the feature done.

If the agent's environment strongly favors a different stack, it's fine to
adapt — but keep the **local-first-with-durable-cloud-hub principle, the
data model, PDF layout spec, and business rules in §3–§7 as the source of
truth**, not the tech choices in this section.

---

## 3. Non-negotiable business rules

1. **Invoice numbers are sequential, permanent once assigned, and never
   reused** — even if an invoice is later voided.
2. **Invoices created offline are provisional/draft until synced.** A
   locally-created invoice gets a permanent internal UUID immediately (never
   blocked by being offline), but its human-facing **invoice number is left
   unassigned** until the device is online and Neon has issued the real next
   number. A provisional invoice:
   - Displays as "Invoice — pending number (draft)" in the UI.
   - If exported to PDF/image before syncing, is clearly watermarked
     "DRAFT — not yet finalized."
   - Is finalized automatically, with no user action needed, the moment the
     device next syncs successfully — no renumbering after the fact, no
     reliance on device clocks being correct.
3. **Once an invoice is finalized (has a real number), its line items and
   total are immutable.** A correction creates a new invoice referencing the
   old one (`supersedesInvoiceId`) rather than editing history.
4. Every invoice must have exactly one customer, at least one line item, and
   a non-empty **Invoice Details** field (see §7) describing what the job was.
5. Payment status is derived, never manually typed:
   - `unpaid` — no payments recorded.
   - `partial` — sum(payments) < total.
   - `paid` — sum(payments) >= total.
6. Currency is Naira only for v1. Store amounts as integers in **kobo** to
   avoid floating-point rounding errors; format as Naira with 2 decimals in
   the UI/PDF only.
7. Deleting a customer or invoice is disabled in the UI for all roles. Only
   the Owner can "void" a finalized invoice (soft-delete flag + reason);
   voided invoices still show up in search/history, clearly marked VOID, and
   their number is never reused.
8. Continue invoice numbering from the paper book's last used number — ask
   the user for the real starting number during setup, do not hardcode it.

---

## 4. Data model

Maintain two Drizzle schema files describing the same logical tables (see
§2). Shown below in Postgres (`pg-core`) form; mirror the same shape in
`schema.sqlite.ts` per the type-mapping rules in §2.

```typescript
import { pgTable, pgEnum, text, integer, bigint, boolean,
         timestamp, index } from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("role", ["OWNER", "STAFF", "ADMIN_DEV"]);
export const statusEnum = pgEnum("invoice_status", ["unpaid", "partial", "paid"]);

export const users = pgTable("users", {
  id: text("id").primaryKey(),               // app-generated UUID
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: roleEnum("role").notNull().default("STAFF"),
  createdAt: timestamp("created_at").notNull(),
});

// Singleton table — one row, holds the business's own profile.
// NOT a multi-tenant table (§0: single-business scope for v1).
export const businessSettings = pgTable("business_settings", {
  id: text("id").primaryKey(),               // fixed constant, e.g. "singleton"
  companyName: text("company_name").notNull(),
  tagline: text("tagline"),
  addressLines: text("address_lines"),        // newline-separated
  phone: text("phone"),
  logoUrl: text("logo_url"),
  footerNote: text("footer_note"),
  invoiceNumberPrefix: text("invoice_number_prefix"), // e.g. "WCNI-" or blank
  nextInvoiceNumber: integer("next_invoice_number").notNull(), // Neon is authoritative for this counter
  bankName: text("bank_name"),
  bankAccountName: text("bank_account_name"),
  bankAccountNumber: text("bank_account_number"),
  updatedAt: timestamp("updated_at").notNull(),
});

export const customers = pgTable("customers", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  address: text("address"),
  phone: text("phone"),
  email: text("email"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull(),
}, (table) => ({
  nameIdx: index("customers_name_idx").on(table.name),
}));

export const invoices = pgTable("invoices", {
  id: text("id").primaryKey(),                       // permanent, assigned at creation, online or offline
  invoiceNo: integer("invoice_no").unique(),          // NULLABLE — null until finalized by a sync (see §3)
  isProvisional: boolean("is_provisional").notNull().default(true),
  customerId: text("customer_id").notNull().references(() => customers.id),
  date: timestamp("date").notNull(),
  lpoNumber: text("lpo_number"),
  invoiceDetails: text("invoice_details").notNull(),
  status: statusEnum("status").notNull().default("unpaid"),
  totalKobo: bigint("total_kobo", { mode: "bigint" }).notNull(),
  isVoid: boolean("is_void").notNull().default(false),
  voidReason: text("void_reason"),
  supersedesInvoiceId: text("supersedes_invoice_id"),
  createdById: text("created_by_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").notNull(),        // used only for ordering/audit, NOT for numbering conflict resolution
}, (table) => ({
  invoiceNoIdx: index("invoices_invoice_no_idx").on(table.invoiceNo),
  customerIdIdx: index("invoices_customer_id_idx").on(table.customerId),
  dateIdx: index("invoices_date_idx").on(table.date),
  statusIdx: index("invoices_status_idx").on(table.status),
}));

export const invoiceItems = pgTable("invoice_items", {
  id: text("id").primaryKey(),
  invoiceId: text("invoice_id").notNull().references(() => invoices.id),
  position: integer("position").notNull(),
  qtyLabel: text("qty_label").notNull(),              // e.g. "14 days", "1" — text, not just number
  description: text("description").notNull(),          // "Description of Services / Work Done"
  rateKobo: bigint("rate_kobo", { mode: "bigint" }).notNull(),
  amountKobo: bigint("amount_kobo", { mode: "bigint" }).notNull(), // manual override allowed, not forced qty*rate
});

export const payments = pgTable("payments", {
  id: text("id").primaryKey(),
  invoiceId: text("invoice_id").notNull().references(() => invoices.id),
  amountKobo: bigint("amount_kobo", { mode: "bigint" }).notNull(),
  date: timestamp("date").notNull(),
  method: text("method"),
  reference: text("reference"),
  recordedById: text("recorded_by_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").notNull(),
}, (table) => ({
  invoiceIdIdx: index("payments_invoice_id_idx").on(table.invoiceId),
}));
```

Recalculate and cache `invoices.status` and `invoices.totalKobo` on every
payment write and every item write (transactionally), so search/list views
don't need to aggregate on every request.

**Invoice number assignment (critical logic, lives in the sync job):**
when the sync job finds a local invoice with `isProvisional = true`, it must,
in a single Neon transaction: read `businessSettings.nextInvoiceNumber`,
assign that value to the invoice, increment the counter, write both back,
and mark the invoice `isProvisional = false` — then write the assigned
number back to the local SQLite row. This must be atomic on the Neon side
(a transaction with a row lock on `businessSettings`, or a Postgres sequence)
so two provisional invoices synced back-to-back can never receive the same
number.

Run `drizzle-kit generate`/`migrate` for each schema file against its
respective database whenever the schema changes, and change both schema
files in the same commit so they never drift apart structurally.

---

## 5. Core flows (build in this order)

### Phase 1 — foundation
1. First-run setup: create the first Owner/admin_dev user, enter starting
   invoice number, generate the sync key, set up initial business settings
   (name, address, phone, bank details, footer note — see §4/§7).
2. Customer CRUD (create, edit, list with search-by-name/phone).
3. Invoice creation flow:
   - Select existing customer OR create new customer inline.
   - Date (default today), LPO number (optional).
   - Invoice Details textarea (required).
   - Line items: add/remove rows (Qty label, Description, Rate, Amount —
     amount typed directly, not forced as qty×rate).
   - Running total shown live.
   - Save → gets a permanent UUID immediately; invoice number stays
     unassigned (`isProvisional = true`) until the next successful sync.
4. Business settings screen (Owner-only): edit company name, tagline,
   address, phone, logo, bank details, footer note, invoice number prefix.

### Phase 2 — output
5. Invoice detail page: rendered invoice matching §7, pulling company/bank
   details from `businessSettings` (never hardcoded).
6. Shows "DRAFT — pending sync" watermark/badge if still provisional.
7. "Download PDF" and "Download Image (PNG)" buttons.
8. "Share" — shareable link to the PDF, or native Web Share API on mobile.

### Phase 3 — payments, search, and recovery
9. Record payment against an invoice (amount, date, method, reference).
10. Invoice list/dashboard with filters: customer, date range, status
    (unpaid/partial/paid/void/draft), invoice number lookup.
11. Customer detail page: full invoice + payment history for that customer,
    for dispute resolution.
12. **New-device restore flow:** on first run with no local database,
    prompt for the sync key and pull the full dataset from Neon to bootstrap
    a fresh local SQLite file.
13. Manual "Sync now" button + last-successful-sync indicator.

### Phase 4 — polish (explicitly deferred)
- Logo upload/asset management refinements.
- Export a filtered invoice list to Excel/CSV.
- Basic analytics (revenue by month, outstanding total).
- Electron/Tauri desktop wrapper.

---

## 6. PDF / image rendering

- Build ONE source-of-truth invoice layout component, driven by data from
  `businessSettings` + the invoice record — do not hardcode company details
  in the template. Both PDF and PNG export render from this same component.
- Match the visual spec in §7.
- Page size: A4.
- File name pattern: `Invoice-{invoiceNo-or-DRAFT}-{CustomerName}.pdf`.
- If `isProvisional`, render a clear "DRAFT — NOT YET FINALIZED" watermark
  instead of an invoice number.

---

## 7. Invoice visual template spec

Already prototyped and approved as a starting point — replicate this layout
(colors, sections, proportions), pulling all business-specific text from
`businessSettings` rather than hardcoding it.

- **Header:** rounded-corner bordered page (thin green border, ~6mm radius).
  Logo (from `businessSettings.logoUrl`, placeholder circle if none) top-left.
  Company name in bold green, large; tagline below in small bold dark green.
- **Office info block** (left): address + phone lines from settings.
- **INVOICE badge** (right): solid green rounded rectangle, white "INVOICE"
  text, followed by "No. {invoiceNo}" — or "DRAFT" styling if provisional.
- **To / Date / L.P.O. row:** bordered boxes — "To:" with customer info;
  "Date:" and "L.P.O:" on the right.
- **Invoice Details section:** full-width bordered box, solid green header
  bar labeled "INVOICE DETAILS", prose body describing the job/contract.
- **Line items table:** green header row, white text — `ITEM`, `QTY`,
  `DESCRIPTION OF SERVICES / WORK DONE`, `RATE`, `AMOUNT (N)`. Table height
  fits the actual number of items; paginate if it overflows one page, don't
  draw empty rows like the paper version.
- **Total row:** bold, right-aligned, bordered.
- **Payment details block (new):** small bordered section below the total —
  "Please make payment to:" followed by bank name, account name, account
  number, from `businessSettings`. Omit this block entirely if those fields
  are empty (don't show empty labels).
- **Footer note:** small italic line, from `businessSettings.footerNote`
  (default something like "Services rendered as per agreed contract terms.
  Thanks, please call again.").
- **Amount in words:** full line, Naira only.
- **Signature lines:** "Customer's Sign" and "Manager's Sign."
- **Status marker:** diagonal semi-transparent stamp — UNPAID / PARTIAL /
  PAID (red/orange/green) once finalized, or DRAFT (grey) if provisional.
  Always computed, never manually set.

A reference PDF matching this spec (with sample data, pre-bank-details) was
already generated and approved — treat it as visual ground truth for
spacing/typography if available in the repo
(`reference/invoice_redesign_sample.pdf`); add the payment details block per
the written spec above since the reference predates that decision.

---

## 8. Acceptance criteria for v1

- [ ] Owner can log in and create a Staff account.
- [ ] Staff can create a customer and an invoice without Owner involvement.
- [ ] Creating an invoice while offline succeeds immediately, shows as
      "pending number (draft)," and the PDF exported at that point is
      clearly watermarked as a draft.
- [ ] The moment the device is back online and syncs, that invoice is
      automatically assigned a permanent, correct-sequence number with no
      user action required.
- [ ] Two invoices created offline back-to-back (simulating two different
      sessions) never end up with the same final invoice number after sync.
- [ ] Once finalized, an invoice's line items and total cannot be edited
      through the UI.
- [ ] PDF and PNG export both match §7, including the payment details block
      when bank details are set in business settings, and open correctly on
      a phone.
- [ ] Recording a payment updates status correctly and is reflected
      immediately on the invoice view and dashboard list.
- [ ] Searching by invoice number, customer name, or date range returns
      correct results, including voided and draft invoices, clearly marked.
- [ ] Viewing a customer shows every invoice and payment ever recorded for
      them, sorted by date, with running total owed.
- [ ] Pulling the network cable does not break invoice creation, viewing,
      PDF export, or payment recording — everything works fully offline
      against the local SQLite database.
- [ ] A manual "Sync now" works and gives clear success/failure feedback;
      the last-successful-sync time is visible in the UI.
- [ ] Setting up a brand-new device with no local database, entering the
      sync key, successfully restores the full customer/invoice/payment
      history from Neon and lets the user continue working normally.
- [ ] Editing business settings (name, address, bank details, footer text)
      changes what appears on newly generated invoices without any code
      changes.

---

## 9. Notes for the agent

- Ask the user for the real starting invoice number, real business details
  (address, phone, bank info), and any real customer data before seeding —
  don't invent placeholder data into production.
- Do not add tax/VAT, multi-currency, online payments, or multi-tenant
  abstractions unless explicitly requested — these are deliberate v1 scope
  cuts (§0), not oversights. Do not pre-build "tenant_id" columns or
  per-business isolation — keep the schema single-business-simple.
- Favor boring, debuggable code (plain Drizzle queries, plain React state)
  over clever abstractions.
- The invoice-numbering transaction in §4 is the single most
  correctness-sensitive piece of this app — write a test for the
  back-to-back-offline-invoices scenario before considering it done.
- Write a short `RESTORE.md` runbook covering: (a) routine restore from a
  backup after data loss, and (b) full new-device setup using the sync key.
  Test both manually at least once.
- Treat the sync key like a password — never log it, never commit it to the
  repo; store it in an env var / secrets manager.
- Do not introduce a paid managed backend, a second cloud database, or any
  recurring cost beyond Neon's free tier and free-tier object storage
  without checking with Yekini first — budget is explicitly near-$0/month.
