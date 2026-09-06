import Database from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import * as schema from "./schema.sqlite";

let db: BetterSQLite3Database<typeof schema> | null = null;

export function getDbPath(): string {
  return process.env.SQLITE_DB_PATH ?? path.join(process.cwd(), "data", "weltmoh.db");
}

export function getDb(): BetterSQLite3Database<typeof schema> {
  if (db) return db;
  const dbPath = getDbPath();
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const sqlite = new Database(dbPath);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  db = drizzle(sqlite, { schema });
  return db;
}
