# Project Execution TODO

## Current Status

Current Bucket: Bucket 1
Status: IMPLEMENTED — awaiting manual verification (do NOT commit yet)

## Decisions Made (locked — do not silently override)

- D1 — Invoice numbering: prefix `WSNLI-`, first invoice `WSNLI-0001`. Numeric counter starts at 1, display zero-padded to 4 digits (`WSNLI-%04d`). Counter authority: Neon `businessSettings.nextInvoiceNumber`. Numbers sequential, permanent, never reused — even after void.
- D2 — V1 scope cut (user, 2026-09-06): NO payments in v1. Removed: payment recording, payment status derivation (unpaid/partial/paid), PAID/PARTIAL stamp, customer payment history. Invoice states in v1: DRAFT (provisional, pending sync) / FINALIZED (has number) / VOID. Customer pages show invoices only.
- D3 — Draft editing: provisional/draft invoices remain editable/deletable by creator roles until finalized. Finalized invoices immutable (line items, total, number). Corrections via new invoice with `supersedesInvoiceId`. (User answered "Keep that" — interpreted as keep supersedes flow + editable drafts; confirm during Bucket 2 verification.)
- D4 — Void rules kept: only Owner voids finalized invoice, reason required, voided stays searchable, number never reused.
- D5 — Business profile: filled later via Settings screen (no real data seeded now). Settings holds name, tagline, address, phone, logo, bank details, footer, prefix. Invoice template reads from settings, never hardcoded.
- D6 — Auth: email + password, 3 roles (owner/staff/admin_dev), no self-signup, Owner creates Staff + manual password reset. Initial Owner created in first-run setup.
- D7 — Environment: Windows office PC, Next.js 14+ App Router run locally (`next build && next start`, localhost browser).
- D8 — Neon: user reports Neon ready. Sync + restore verified against real Neon when credentials provided. Connection string / sync key NEVER committed; env vars only.
- D9 — Share/exports: Download PDF/PNG + Web Share / file share + browser print + screenshot of render is enough for v1. No hosted public links. R2/B2 PDF backup DEFERRED (not v1).
- D10 — Invoice layout: build from written spec (implementation.md §7 + .agents/design.md). Logo placeholder + simple upload; user fine-tunes later. No reference PDF in repo (spec mentions `reference/invoice_redesign_sample.pdf` — absent).
- D11 — Money display (user, 2026-09-06): Rate and Amount entered/displayed in NAIRA (₦, 2 decimals) in all forms, tables, invoice render, PDF/PNG. Stored internally as integer kobo only; conversion at input/output boundaries. No kobo visible in UI.

## Open Questions (deferred to build/verification, non-blocking)

- O1 — Exact initial Owner name/email (deferred to first-run setup screen; no seed needed now).
- O2 — Customer field requirements beyond name (schema: name required, rest optional — keep; confirm in Bucket 2 test).
- O3 — Sync cadence default (manual "Sync now" + interval; propose 5 min, confirm in Bucket 4).
- O4 — Neon credentials + sync-key handoff method (needed before Bucket 4 manual verification).

## Execution Buckets

- [x] Bucket 1 — Foundation (setup, DB, auth, settings, shell, first-run) — IMPLEMENTED, awaiting manual verification
- [ ] Bucket 2 — Customers & Invoices (CRUD, provisional creation, immutability, void, supersedes, search, history)
- [ ] Bucket 3 — Invoice Output (detail render §7, PDF+PNG one source, DRAFT watermark, print/share)
- [ ] Bucket 4 — Offline & Sync (Neon hub, atomic finalization, Sync now + indicator, restore-from-cloud)
- [ ] Bucket 5 — Verification & Finalization (tests, build, RESTORE.md, cleanup)

---

## Bucket 1 — Foundation

Status: IMPLEMENTED — awaiting manual verification

### Completed
- Next.js 16.3.4 (latest) + React 19 + TypeScript scaffold; runs via `next build && next start` on localhost.
- Dual Drizzle schemas: `src/db/schema.sqlite.ts` (better-sqlite3, `data/weltmoh.db`, WAL, FK on) + `src/db/schema.pg.ts` (Neon). Tables: users, businessSettings (singleton, prefix `WSNLI-`), customers, invoices (invoiceNo NULLABLE, isProvisional, isVoid, supersedesInvoiceId — NO status column), invoiceItems, syncState. NO payments table (D2). Migrations generated for both (`drizzle-sqlite/`, `drizzle-pg/`); sqlite migration applied via `npm run db:migrate-sqlite`.
- Auth: email+password (bcryptjs, min 8), HMAC-signed httpOnly cookie sessions (7d, server-validated), server-side role gates (`can()`). No sessions table by design (single-device v1, avoids schema drift).
- First-run wizard `/setup`: Owner account + business profile + starting number (default 1 → WSNLI-0001) + sync key generated (random 32B hex, shown ONCE, only SHA-256 stored in sync_state).
- Login `/login`, sign-out, Settings (Owner-only edit + staff create + Owner password reset).
- App shell: sidebar (Dashboard/Invoices/Customers/Settings), dashboard counts, foundation list pages with empty states, SyncBadge via `/api/sync-status` (reads lastSyncAt; full sync in Bucket 4).
- Money lib: kobo-only math, Naira parse/format (D11) — verified: 12,500.00→1250000 kobo, WSNLI-0001.
- Checks: `tsc --noEmit` clean, `next build` passes, prod smoke test `/setup` 200 + `/api/sync-status` 200 + `/login` 200.
- Fix during build: SyncBadge moved off direct SQLite import to API route (client components cannot bundle better-sqlite3).

### Remaining
- Manual verification by user (see report). No commit until approved.

### Decisions
- D11 added (Naira display). pg.ts uses `drizzle(neon(url))` per drizzle-orm 0.44 API. tsconfig auto-touched by Next build (jsx react-jsx) — harmless.

### Issues
- None open. `data/` and `.env` gitignored; secrets never committed.

### Manual Verification Required
- See Bucket 1 completion report (setup → login → settings → staff → restart offline).

### Resume From
- Bucket 1 done pending approval. Next: Bucket 2 — Customers & Invoices (only after explicit approval + optional commit).

---

## Bucket 2 — Customers & Invoices

Status: PLANNED

### Scope
- Customer CRUD + search by name/phone; no deletes (edit only).
- Invoice creation: select/create-inline customer, date default today, optional LPO, required Invoice Details, line items (qty label text, description, rate kobo, amount kobo manual override), live running total.
- Save → UUID immediately, `invoiceNo=NULL`, `isProvisional=true` ("pending number (draft)").
- Drafts editable/deletable; finalized immutable via server check; correction = new invoice with `supersedesInvoiceId`.
- Owner-only void with reason; voided searchable, clearly marked.
- Invoice list + filters (customer, date range, invoice-no lookup, draft/void states — NO payment-status filter per D2); customer detail = all invoices sorted by date + total billed.
- Validation: exactly one customer, ≥1 item, non-empty details; kobo-only math.

### Manual Verification Required
- Create customer + invoice offline; draft badge; edit draft; void flow as Owner vs Staff blocked.

---

## Bucket 3 — Invoice Output

Status: PLANNED

### Scope
- ONE invoice layout component → both PDF (A4) and PNG.
- Matches §7: green bordered page, logo/placeholder, company block from settings, INVOICE badge (`No. WSNLI-0001` or DRAFT), To/Date/LPO boxes, Invoice Details box, items table (ITEM/QTY/DESCRIPTION/RATE/AMOUNT), total row, bank block (hidden if empty), footer note, amount-in-words (Naira), signature lines.
- Provisional: `DRAFT — NOT YET FINALIZED` watermark, never a fake number.
- Filename `Invoice-WSNLI-0001-{CustomerName}.pdf` (or `Invoice-DRAFT-{Customer}.pdf`).
- Buttons: Download PDF, Download PNG, Share (Web Share API fallback download), Print. Render must be screenshot-clean.

### Manual Verification Required
- Generate PDF/PNG for draft (watermark) + finalized; open on phone; print; settings change reflects on new render.

---

## Bucket 4 — Offline & Sync

Status: PLANNED

### Scope
- Sync job (local → Neon, one-way + finalization): push dirty rows, atomically claim `nextInvoiceNumber` on Neon (transaction + row lock) for each provisional, write number back locally, mark `isProvisional=false`. Idempotent, retryable, never corrupts local on failure; logs attempts.
- Manual "Sync now" + last-successful-sync indicator in UI.
- New-device "Restore from cloud": no local DB → prompt sync key → pull full dataset → rebuild SQLite → operate normally. Key rotatable, server-side only.
- All normal reads/writes stay on SQLite; app fully usable with network cable pulled.
- R2/B2: explicitly deferred (D9).

### Manual Verification Required
- Two offline invoices → sync → sequential numbers, no collision; cable-pull test; fresh device restore via sync key. (Needs Neon creds — O4.)

---

## Bucket 5 — Verification & Finalization

Status: PLANNED

### Scope
- Automated tests: numbering (first number, increment, void reuse ban, provisional null, sync finalization, back-to-back uniqueness, failure safety, retry), kobo totals, immutability, offline creation, restore match.
- `next build` passes; typecheck/lint/tests green; `RESTORE.md` runbook (backup restore + new-device setup); remove placeholders; final cleanup.
- No tax/VAT, multi-currency, online payments, multi-tenancy (scope guard).

### Manual Verification Required
- Full acceptance walkthrough of implementation.md §8 minus payment items.

---

## Next Action

STOP — Bucket 1 implemented, awaiting user manual verification. Do NOT commit. On approval: commit Bucket 1, then begin Bucket 2.
