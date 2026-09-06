"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { getDb } from "@/db/sqlite";
import { businessSettings, users } from "@/db/schema.sqlite";
import { can, clearSessionCookie, getSessionUser, hashPassword } from "@/lib/auth";

async function owner(): Promise<Exclude<Awaited<ReturnType<typeof getSessionUser>>, null>> {
  const u = await getSessionUser();
  if (!u || !can(u, "manage-settings")) throw new Error("Forbidden: Owner only.");
  return u;
}

export async function updateSettingsAction(_prev: { error?: string; ok?: boolean } | null, form: FormData) {
  await owner();
  const companyName = String(form.get("companyName") ?? "").trim();
  if (!companyName) return { error: "Company name is required." };
  const db = getDb();
  const now = new Date().toISOString();
  db.update(businessSettings)
    .set({
      companyName,
      tagline: String(form.get("tagline") ?? "").trim() || null,
      addressLines: String(form.get("addressLines") ?? "").trim() || null,
      phone: String(form.get("phone") ?? "").trim() || null,
      footerNote: String(form.get("footerNote") ?? "").trim() || null,
      bankName: String(form.get("bankName") ?? "").trim() || null,
      bankAccountName: String(form.get("bankAccountName") ?? "").trim() || null,
      bankAccountNumber: String(form.get("bankAccountNumber") ?? "").trim() || null,
      updatedAt: now,
    })
    .where(eq(businessSettings.id, "singleton"))
    .run();
  revalidatePath("/settings");
  return { ok: true as const };
}

export async function createStaffAction(_prev: { error?: string; ok?: boolean } | null, form: FormData) {
  await owner();
  const name = String(form.get("name") ?? "").trim();
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  const role = String(form.get("role") ?? "STAFF");
  if (!name || !email || !password) return { error: "Name, email and password are required." };
  if (password.length < 8) return { error: "Password must be at least 8 characters." };
  if (role !== "STAFF" && role !== "OWNER" && role !== "ADMIN_DEV") return { error: "Invalid role." };
  const db = getDb();
  const exists = db.select().from(users).where(eq(users.email, email)).get();
  if (exists) return { error: "That email is already registered." };
  db.insert(users)
    .values({
      id: crypto.randomUUID(),
      name,
      email,
      passwordHash: await hashPassword(password),
      role: role as "STAFF" | "OWNER" | "ADMIN_DEV",
      createdAt: new Date().toISOString(),
    })
    .run();
  revalidatePath("/settings");
  return { ok: true as const };
}

export async function resetPasswordAction(_prev: { error?: string; ok?: boolean } | null, form: FormData) {
  await owner();
  const userId = String(form.get("userId") ?? "");
  const password = String(form.get("password") ?? "");
  if (!userId || password.length < 8) return { error: "Select a user and a password of min 8 chars." };
  const db = getDb();
  db.update(users)
    .set({ passwordHash: await hashPassword(password) })
    .where(eq(users.id, userId))
    .run();
  revalidatePath("/settings");
  return { ok: true as const };
}

export async function signOutAction() {
  await clearSessionCookie();
  redirect("/login");
}
