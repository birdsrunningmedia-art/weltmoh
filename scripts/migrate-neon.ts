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

  // Read all SQL migration files in drizzle-pg/ in filename order
  // (0000 base schema, then 0001, 0002, ...). Each file is applied
  // statement by statement; already-applied statements are skipped so
  // re-running is safe.
  const migrationsDir = path.resolve(process.cwd(), "drizzle-pg");
  const migrationFiles = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();
  if (migrationFiles.length === 0) {
    throw new Error("No migration files found in " + migrationsDir);
  }
  console.log(`Found migration files: ${migrationFiles.join(", ")}`);

  for (const file of migrationFiles) {
    const migrationPath = path.join(migrationsDir, file);
    const migrationSql = fs.readFileSync(migrationPath, "utf-8");
    const statements = migrationSql
      .split("--> statement-breakpoint")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    console.log(`Applying ${statements.length} migration statements from ${file}...`);

    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      try {
        // Execute each statement via neon raw sql query
        await sql.query(stmt);
        console.log(`✓ [${file}] Statement ${i + 1}/${statements.length} executed.`);
      } catch (err: any) {
        // If type/table/column already exists, log and proceed
        if (
          err.message &&
          (err.message.includes("already exists") ||
            err.message.includes("duplicate") ||
            err.code === "42710" ||
            err.code === "42P07" ||
            err.code === "42701")
        ) {
          console.log(`ℹ [${file}] Statement ${i + 1} skipped (already applied).`);
        } else {
          console.error(`✗ Error in ${file} statement ${i + 1}:`, err.message);
          throw err;
        }
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
