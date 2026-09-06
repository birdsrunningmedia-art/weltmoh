import { neon } from "@neondatabase/serverless";
import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import * as schema from "./schema.pg";

// Cloud hub client. ONLY the sync job (Bucket 4) may import this.
// Day-to-day app code uses src/db/sqlite.ts so the app works offline.
export function getCloudDb(): NeonHttpDatabase<typeof schema> {
  const url = process.env.NEON_DATABASE_URL;
  if (!url) throw new Error("NEON_DATABASE_URL is not set (sync only).");
  return drizzle(neon(url), { schema });
}
