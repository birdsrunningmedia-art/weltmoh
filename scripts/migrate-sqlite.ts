import fs from "node:fs";
import path from "node:path";
import { getDb, getDbPath } from "@/db/sqlite";
import { syncState } from "@/db/schema.sqlite";

const MIGRATIONS_DIR = path.join(process.cwd(), "drizzle-sqlite");

function journalEntries(): { idx: number; tag: string; sql: string }[] {
  const journalPath = path.join(MIGRATIONS_DIR, "meta", "_journal.json");
  const journal = JSON.parse(fs.readFileSync(journalPath, "utf8")) as {
    entries: { idx: number; version: string; when: number; tag: string; breakpoints: boolean }[];
  };
  return journal.entries.map((e) => {
    // drizzle names the file "<tag>.sql" where tag already contains the index.
    const sqlPath = path.join(MIGRATIONS_DIR, `${e.tag}.sql`);
    return { idx: e.idx, tag: e.tag, sql: fs.readFileSync(sqlPath, "utf8") };
  });
}

async function main() {
  if (!fs.existsSync(path.join(MIGRATIONS_DIR, "meta", "_journal.json"))) {
    throw new Error("No sqlite migrations found. Run: npm run db:generate-sqlite");
  }
  const dbPath = getDbPath();
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  // Apply via the raw better-sqlite3 connection behind drizzle.
  const { default: Database } = await import("better-sqlite3");
  const sqlite = new Database(dbPath);
  sqlite.pragma("journal_mode = WAL");
  sqlite.exec(`CREATE TABLE IF NOT EXISTS __drizzle_migrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    hash TEXT NOT NULL UNIQUE,
    created_at INTEGER NOT NULL
  )`);
  const applied = new Set(
    (sqlite.prepare("SELECT hash FROM __drizzle_migrations").all() as { hash: string }[]).map(
      (r) => r.hash,
    ),
  );
  for (const entry of journalEntries()) {
    const hash = `${entry.idx}_${entry.tag}`;
    if (applied.has(hash)) continue;
    // Split on drizzle statement breakpoints.
    const statements = entry.sql.split("--> statement-breakpoint");
    const run = sqlite.transaction(() => {
      for (const s of statements) {
        if (s.trim().length === 0) continue;
        sqlite.exec(s);
      }
      sqlite.prepare("INSERT INTO __drizzle_migrations (hash, created_at) VALUES (?, ?)").run(hash, Date.now());
    });
    run();
    console.log(`applied sqlite migration ${hash}`);
  }
  // Touch drizzle to ensure schema loads.
  getDb().select().from(syncState).limit(1).all();
  console.log("sqlite migrate done:", dbPath);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
