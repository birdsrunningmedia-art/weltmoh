import { eq } from "drizzle-orm";
import { getDb } from "@/db/sqlite";
import { businessSettings, syncState } from "@/db/schema.sqlite";

export type BusinessSettings = typeof businessSettings.$inferSelect;

export function getSettings(): BusinessSettings | null {
  const db = getDb();
  return db.select().from(businessSettings).where(eq(businessSettings.id, "singleton")).get() ?? null;
}

export function isFirstRun(): boolean {
  const db = getDb();
  const row = db.select({ id: businessSettings.id }).from(businessSettings).limit(1).all();
  return row.length === 0;
}

export function getSyncValue(key: string): string | null {
  const db = getDb();
  const row = db.select().from(syncState).where(eq(syncState.key, key)).get();
  return row?.value ?? null;
}

export function setSyncValue(key: string, value: string): void {
  const db = getDb();
  const now = new Date().toISOString();
  db.insert(syncState)
    .values({ key, value, updatedAt: now })
    .onConflictDoUpdate({ target: syncState.key, set: { value, updatedAt: now } })
    .run();
}
