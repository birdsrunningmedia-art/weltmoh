import fs from "fs";
import path from "path";
import { neon } from "@neondatabase/serverless";

function getNeonUrl(): string {
  if (process.env.NEON_DATABASE_URL) return process.env.NEON_DATABASE_URL;

  // Try loading from .env.local
  const envLocalPath = path.resolve(process.cwd(), ".env.local");
  if (fs.existsSync(envLocalPath)) {
    const content = fs.readFileSync(envLocalPath, "utf-8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (trimmed.startsWith("NEON_DATABASE_URL=")) {
        return trimmed.replace("NEON_DATABASE_URL=", "").trim().replace(/^["']|["']$/g, "");
      }
    }
  }

  // Try loading from .env
  const envPath = path.resolve(process.cwd(), ".env");
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, "utf-8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (trimmed.startsWith("NEON_DATABASE_URL=")) {
        return trimmed.replace("NEON_DATABASE_URL=", "").trim().replace(/^["']|["']$/g, "");
      }
    }
  }

  throw new Error("NEON_DATABASE_URL not found in environment, .env.local, or .env");
}

async function run() {
  const url = getNeonUrl();
  console.log("Found Neon URL. Connecting to Neon...");

  const sql = neon(url);

  // Test simple query
  const res = await sql`SELECT 1 as connected;`;
  console.log("Connection successful:", res);

  // Read SQL migration file
  const migrationPath = path.resolve(process.cwd(), "drizzle-pg", "0000_slow_bishop.sql");
  if (!fs.existsSync(migrationPath)) {
    throw new Error("Migration file not found at " + migrationPath);
  }

  const migrationSql = fs.readFileSync(migrationPath, "utf-8");
  const statements = migrationSql
    .split("--> statement-breakpoint")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  console.log(`Applying ${statements.length} migration statements to Neon...`);

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    try {
      // Execute each statement via neon raw sql query
      await sql.query(stmt);
      console.log(`✓ Statement ${i + 1}/${statements.length} executed.`);
    } catch (err: any) {
      // If type already exists or table already exists, log and proceed
      if (err.message && (err.message.includes("already exists") || err.code === "42710" || err.code === "42P07")) {
        console.log(`ℹ Statement ${i + 1} skipped (already exists).`);
      } else {
        console.error(`✗ Error on statement ${i + 1}:`, err.message);
        throw err;
      }
    }
  }

  console.log("✓ Neon schema migrations applied successfully!");

  // List created tables
  const tables = await sql`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public';
  `;
  console.log("Tables in Neon public schema:", tables.map((t: any) => t.table_name));
}

run().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
