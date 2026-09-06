# Design Specification — Weltmoh Invoicing App

## 1. Design Goal

The application should feel:

* Professional
* Simple
* Reliable
* Clean
* Business-focused
* Easy to understand

This is an internal business tool, not a marketing website.

Prioritize clarity and usability over visual effects.

---

## 2. General Style

Use a clean dashboard-style interface.

Avoid:

* Excessive animations
* Glassmorphism
* Large decorative graphics
* Gradients everywhere
* Excessive rounded cards
* Unnecessary illustrations
* Complex navigation
* Visual clutter

Use whitespace, clear typography, borders, and simple hierarchy.

---

## 3. Colors

Use a restrained business palette.

### Primary

Green should be the primary brand/action color.

Use it for:

* Primary buttons
* Invoice headings
* Important status elements
* Active navigation
* Invoice accents

### Neutral

Use:

* White for main surfaces
* Very light gray for page backgrounds
* Dark gray/black for primary text
* Muted gray for secondary text
* Light gray borders

### Status

Use clear semantic colors:

* **Paid:** green
* **Partial:** orange
* **Unpaid:** red
* **Void:** dark gray/red
* **Draft:** gray

Do not rely on color alone. Always include text labels.

---

## 4. Typography

Use a clean sans-serif font.

Prioritize readability over personality.

Recommended hierarchy:

```text
Page title
    ↓
Section heading
    ↓
Card/table heading
    ↓
Body text
    ↓
Secondary/meta text
```

Invoice typography should remain professional and highly readable.

---

## 5. Layout

Use a simple application shell:

```text
┌──────────────────────────────────────────────┐
│ Sidebar / Navigation                         │
├──────────────────────────────────────────────┤
│                                              │
│ Page title                         Primary CTA│
│                                              │
│ Content                                      │
│                                              │
└──────────────────────────────────────────────┘
```

Desktop should be the primary experience because the application is normally used on an office computer.

The application should still work well on smaller screens.

---

## 6. Navigation

Keep navigation small.

Primary sections:

* Dashboard
* Invoices
* Customers
* Payments
* Settings

Admin/developer functionality can be placed separately.

Do not create navigation items for every small feature.

---

## 7. Dashboard

The dashboard should provide useful information immediately.

Show:

* Total invoices
* Unpaid amount
* Partially paid amount
* Paid amount
* Recent invoices
* Draft/provisional invoices
* Last successful sync

Keep the dashboard practical.

Avoid charts unless they provide useful business information.

---

## 8. Tables

Tables are preferred for business records.

Use them for:

* Invoices
* Customers
* Payments

Tables should support:

* Clear column headings
* Comfortable row spacing
* Search
* Filters where appropriate
* Status badges
* Clickable rows/details
* Empty states

Do not overcrowd tables with unnecessary information.

---

## 9. Forms

Forms should be simple and predictable.

Use:

* Clear labels
* Helpful placeholders where necessary
* Inline validation
* Clear error messages
* Logical grouping
* Consistent spacing

Required fields should be obvious.

Primary actions should be visually distinct from secondary actions.

Destructive actions should require confirmation.

---

## 10. Invoice Creation

Invoice creation is one of the most important workflows.

The interface should make the process obvious:

```text
Customer
   ↓
Invoice details
   ↓
Line items
   ↓
Total
   ↓
Save invoice
```

The running total should always be visible.

When offline, clearly communicate that the invoice is saved locally and is awaiting synchronization.

Do not make the user understand the technical synchronization architecture.

---

## 11. Invoice Detail

The invoice detail screen should prioritize the invoice itself.

Actions should be easy to find:

* Download PDF
* Download PNG
* Share
* Record payment
* Void invoice (Owner only)

If the invoice is provisional, clearly show:

**DRAFT — PENDING SYNC**

If the invoice is voided, clearly show:

**VOID**

---

## 12. Status Badges

Use compact badges.

Example:

```text
PAID
PARTIAL
UNPAID
DRAFT
VOID
```

Badges should be visually obvious but not oversized.

---

## 13. Sync Status

The application should communicate connectivity without becoming distracting.

Show a small status indicator such as:

```text
● Synced 2 minutes ago
```

or:

```text
● Offline
```

or:

```text
● Syncing...
```

or:

```text
● Sync failed
```

The user should always be able to understand whether their data has successfully synchronized.

---

## 14. Empty States

Empty states should be useful and simple.

Example:

```text
No invoices yet.

Create your first invoice to get started.

[ Create Invoice ]
```

Do not use elaborate illustrations unless they genuinely improve the experience.

---

## 15. Loading & Errors

Loading states should be subtle.

Use:

* Skeletons
* Spinners
* Disabled buttons during submission

Errors should clearly explain:

1. What went wrong
2. Whether the user's data was saved
3. What they can do next

Never show raw database errors to users.

---

## 16. Modals

Use modals sparingly.

Good uses:

* Confirming invoice voiding
* Confirming important destructive actions
* Creating a small record inline
* Important setup steps

Do not put entire complex workflows inside giant modals.

---

## 17. Buttons

Use a small consistent button hierarchy.

### Primary

For the main action:

```text
Create Invoice
Save
Record Payment
```

### Secondary

For supporting actions:

```text
Cancel
Back
Edit
```

### Destructive

For dangerous actions:

```text
Void Invoice
```

Destructive actions should never look like ordinary primary actions.

---

## 18. Responsive Design

Desktop-first, but responsive.

At smaller widths:

* Sidebar can collapse
* Tables may scroll horizontally
* Forms stack vertically
* Invoice preview remains readable
* Important actions remain accessible

Do not redesign the entire application for mobile.

---

## 19. Accessibility

Follow basic accessibility practices:

* Use semantic HTML
* Proper form labels
* Keyboard navigation
* Visible focus states
* Sufficient contrast
* Accessible buttons
* Accessible error messages
* Do not rely only on color to communicate status

---

## 20. Animation

Keep animation minimal.

Use animation only when it improves:

* Feedback
* Navigation
* Loading
* State changes

Avoid decorative animations.

The application should feel fast and stable.

---

## 21. Invoice PDF Design

The invoice itself follows the approved invoice visual specification in `implementation.md`.

The application UI should complement the invoice rather than compete with it.

The invoice should feel:

* Official
* Professional
* Easy to print
* Easy to read
* Suitable for sending to customers

The invoice layout must remain consistent between PDF and PNG output.

---

## 22. Design Principle

When making a design decision, ask:

> "Does this make the business task clearer or faster?"

If not, leave it out.

**Simple, trustworthy, and functional beats impressive.**
