# Agent Rules

## 1. Source of Truth

The implementation brief is the primary product specification.

Do not silently change, reinterpret, or remove decisions made in the specification.

When implementation details conflict with the business rules, preserve the business rules.

If a requirement is genuinely ambiguous, stop and ask rather than inventing behavior.

---

## 2. Correctness Over Speed

This is a financial-record application.

Prioritize:

1. Data integrity
2. Business-rule correctness
3. Offline reliability
4. Synchronization correctness
5. Security
6. Testability
7. Maintainability
8. UI polish

Never sacrifice data correctness for implementation convenience.

---

## 3. Do Not Expand Scope

Do not introduce features that are explicitly out of scope.

Do not add:

- VAT/tax automation
- Multi-currency
- Online payments
- Multi-tenancy
- Tenant IDs
- Mobile native application
- Paid infrastructure
- Additional databases
- Managed services with recurring costs

Only add them when explicitly requested.

---

## 4. Keep the Architecture Boring

Prefer:

- Plain TypeScript
- Plain Drizzle queries
- Small functions
- Explicit data transformations
- Explicit transactions
- Simple React state
- Small modules
- Easily testable business logic

Avoid unnecessary:

- abstraction layers
- generic repositories
- complex dependency injection
- event-bus architectures
- premature design patterns
- over-engineered state management

The system should be understandable by one technically capable maintainer.

---

## 5. Never Guess Business Data

Never invent:

- customer information
- business address
- phone numbers
- bank details
- invoice numbers
- production credentials
- production configuration

Use explicit setup flows or clearly marked development fixtures.

---

## 6. Financial Amounts

Never use floating-point numbers for monetary calculations.

All monetary values must be represented internally as integer kobo.

Conversion to Naira formatting happens only at presentation/export boundaries.

---

## 7. Invoice Immutability

A finalized invoice is historical financial data.

Never edit finalized:

- line items
- totals
- invoice number

Corrections create a new invoice referencing the previous invoice.

---

## 8. Invoice Numbering

Invoice numbering is correctness-critical.

Never:

- generate final invoice numbers from local clocks
- generate final invoice numbers independently on devices
- reuse invoice numbers
- renumber finalized invoices
- resolve collisions by overwriting data

Offline invoices remain provisional until Neon assigns the permanent number.

---

## 9. Offline First

The application must continue functioning when the network disappears.

Normal application reads and writes use local SQLite.

Never make ordinary invoice/customer/payment functionality depend on Neon being reachable.

---

## 10. Sync Safety

Sync must be:

- retryable
- observable
- idempotent where appropriate
- failure-safe
- explicit about local/cloud state

A failed sync must never corrupt local data.

---

## 11. Secrets

Never:

- log sync keys
- commit secrets
- expose secrets to the browser
- place credentials in source code
- put secrets in generated documentation

Treat the sync key as a password.

---

## 12. Test Before Declaring Done

Do not mark a feature complete merely because the UI works.

Critical business behavior requires automated tests.

Especially test:

- invoice numbering
- provisional invoices
- synchronization
- payment status
- totals
- finalized invoice immutability
- restore
- offline operation

---

## 13. Verify Before Moving On

After implementing a feature:

1. Run its tests.
2. Run type checking.
3. Run linting.
4. Verify the database migration.
5. Verify the relevant UI flow.
6. Update TODO/progress documentation.

Do not accumulate known failures.

---

## 14. Small Changes

Implement one coherent feature at a time.

Avoid changing unrelated files.

Do not perform large refactors unless the current implementation genuinely requires one.

---

## 15. Explain Dangerous Changes

Before changing:

- schema
- sync behavior
- invoice numbering
- authentication
- financial calculations
- restore behavior

explain the reason and potential consequences in the implementation notes.

---

## 16. No Fake Completion

Never claim a feature is complete when it has only been:

- visually implemented
- type checked
- mocked
- manually tested once

Completion requires satisfying the relevant acceptance criteria.