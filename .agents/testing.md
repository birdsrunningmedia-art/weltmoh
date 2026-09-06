# Testing Rules

## Testing Philosophy

Business logic must be tested independently from UI.

A green page is not proof that the application is correct.

---

## Mandatory Tests

### Invoice Numbering

Test:

- first invoice receives expected number
- counter increments
- voided invoice number is never reused
- provisional invoice has no final number
- synchronization finalizes provisional invoices
- two provisional invoices cannot receive the same number
- failed finalization does not corrupt the invoice
- retrying synchronization is safe

### Money

Test:

- kobo arithmetic
- totals
- zero values
- large values
- payment sums
- partial payment
- exact payment
- overpayment

### Invoice Immutability

Test that finalized invoices cannot have:

- items changed
- totals changed
- invoice number changed

### Payments

Test:

```text
0          -> unpaid
less total -> partial
equal      -> paid
greater    -> paid
Offline
```
Test that invoice creation and payment recording continue without network access.

### Recovery

Test:

- empty local database
- restore from Neon
- restored data matches cloud data
- restored device can continue operating