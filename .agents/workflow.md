# Development Workflow

## Before Coding

Read:

1. implementation.md
2. agents/rules.md
3. relevant agent rule files

Determine which requirements apply to the task.

---

## Before Changing Architecture

Check whether the proposed change conflicts with:

- offline-first architecture
- SQLite operational source of truth
- Neon durable hub
- single-business scope
- invoice numbering rules
- immutable invoices

Do not silently change architecture.

---

## Implementation Order

Follow the implementation brief's phases unless there is a technical dependency requiring otherwise.

Prefer completing a vertical slice over partially implementing many features.

---

## After Each Feature

Run:

- typecheck
- lint
- relevant unit tests
- relevant integration tests

For UI features, run the relevant E2E flow.

---

## Documentation

Keep TODO/progress state updated.

If interrupted, leave enough information for another agent to resume.

Record:

- completed work
- current task
- failing tests
- known issues
- next step

---

## Git

Keep commits focused.

Prefer commits such as:

```text
feat: add customer management
feat: add provisional invoices
test: cover invoice numbering
feat: add neon synchronization
fix: preserve provisional invoice after sync failure