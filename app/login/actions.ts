"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb } from "@/db/sqlite";
import { users } from "@/db/schema.sqlite";
import { setSessionCookie, verifyPassword } from "@/lib/auth";

export async function loginAction(_prev: { error: string } | null, form: FormData) {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  if (!email || !password) return { error: "Email and password are required." };
  const db = getDb();
  const row = db.select().from(users).where(eq(users.email, email)).get();
  if (!row || !(await verifyPassword(password, row.passwordHash))) {
    return { error: "Invalid email or password." };
  }
  await setSessionCookie(row.id);
  redirect("/");
}
