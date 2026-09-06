md
# Database Rules

## Two Schemas

Maintain:

- `schema.sqlite.ts`
- `schema.pg.ts`

They represent the same logical data model.

Every schema change must update both schemas in the same commit.

---

## IDs

Use application-generated UUID strings.

Do not use database-specific auto-increment IDs.

---

## Money

SQLite:

```text
integer
```

Postgres:

```text
bigint
```

Both represent integer kobo.

## Timestamps

SQLite:

```text
ISO-8601 text
```

Postgres:

```text
timestamp
```

Conversions belong in synchronization boundaries.

## Enums

SQLite:

```text
text
check constraints
```

Postgres:

```text
pgEnum
Migrations
```

## Whenever the schema changes:

- Update SQLite schema.
- Update Postgres schema.
- Generate the required migrations.
- Apply migrations.
- Test both schemas.
- Verify synchronization mapping.

Never allow the schemas to silently drift.