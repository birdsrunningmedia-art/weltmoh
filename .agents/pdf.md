# Invoice Rendering Rules

## Single Source of Truth

Create one invoice layout component.

Both:

- PDF
- PNG

must derive from the same invoice representation/layout.

Do not create separate invoice templates.

## Business Data

Never hardcode:

- company name
- address
- phone
- bank name
- account name
- account number
- footer

Read them from `businessSettings`.

## Provisional Invoices

If provisional:

- show DRAFT
- show draft watermark
- never display a fake invoice number

## Finalized Invoice

Display:

- invoice number
- customer
- date
- LPO
- invoice details
- line items
- total
- payment details where configured
- amount in words
- signatures
- computed payment status

## Layout

Follow the approved reference PDF when available.

Do not redesign the invoice unless explicitly requested.

## Data Integrity

The rendered invoice must reflect the stored data.

Do not calculate a different total in the PDF renderer.