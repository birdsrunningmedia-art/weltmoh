# Synchronization Rules

## Architecture

SQLite is the operational database.

Neon is the durable cloud hub.

Normal application operations use SQLite.

Only synchronization/recovery operations communicate with Neon.

---

## Local Writes

User operations must succeed without internet access.

A local write must not wait for Neon.

Every locally-created record receives its permanent UUID immediately.

---

## Provisional Invoices

Offline-created invoices:

```text
UUID             -> assigned immediately
invoiceNo        -> NULL
isProvisional    -> true