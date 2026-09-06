# Business Rules

These rules are non-negotiable.

## Invoice Number

- Invoice numbers are sequential.
- Invoice numbers are permanent once assigned.
- Invoice numbers are never reused.
- Voided invoices retain their invoice number.
- Offline invoices do not receive permanent invoice numbers locally.
- A provisional invoice must display as a draft.
- Draft exports must contain a draft watermark.
- Neon assigns the permanent invoice number during synchronization.

## Finalized Invoices

Once finalized:

- line items cannot be edited
- total cannot be edited
- invoice number cannot be edited

Corrections create a new invoice.

The new invoice references the previous invoice using:

`supersedesInvoiceId`



## Money

- Store all money as integer kobo.

- Never use floating point for financial calculations.

## Deletion

- Invoices cannot be deleted.

- Finalized invoices may only be voided by Owner.

- Voiding requires a reason.

- Voided invoices remain searchable.

## Invoice Requirements

Every invoice must have:

- exactly one customer
- at least one line item
- non-empty invoice details
- Currency

Naira only for v1.

Do not introduce currency abstractions unless explicitly requested.