import type { Config } from "drizzle-kit";

export default {
  schema: "./src/db/schema.pg.ts",
  out: "./drizzle-pg",
  dialect: "postgresql",
  dbCredentials: { url: process.env.NEON_DATABASE_URL ?? "postgresql://localhost:5432/weltmoh" },
} satisfies Config;
