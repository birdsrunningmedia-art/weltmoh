"use server";

import { randomBytes, createHash } from "node:crypto";
import { redirect } from "next/navigation";
import { count } from "drizzle-orm";
import { getDb } from "@/db/sqlite";
import { businessSettings, users } from "@/db/schema.sqlite";
import { hashPassword, setSessionCookie } from "@/lib/auth";
import { isFirstRun, setSyncValue } from "@/lib/settings";
import { DEFAULT_INVOICE_PREFIX, FIRST_INVOICE_NUMBER } from "@/lib/invoice-number";

export type SetupResult = { error: string } | { syncKey: string };

export async function setupAction(_prev: SetupResult | null, form: FormData): Promise<SetupResult> {
  if (!isFirstRun()) redirect("/login");
  const db = getDb();
  const [{ n }] = db.select({ n: count() }).from(users).all();
  if (n > 0) redirect("/login");

  const name = String(form.get("name") ?? "").trim();
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  const companyName = String(form.get("companyName") ?? "").trim();
  const prefix = String(form.get("prefix") ?? "").trim() || DEFAULT_INVOICE_PREFIX;
  const startRaw = String(form.get("startNumber") ?? "").trim() || String(FIRST_INVOICE_NUMBER);
  const startNumber = Number(startRaw);

  if (!name || !email || !password || !companyName) {
    return { error: "Owner name, email, password and company name are required." };
  }
  if (password.length < 8) return { error: "Password must be at least 8 characters." };
  if (!Number.isInteger(startNumber) || startNumber < 1) {
    return { error: "Starting invoice number must be a positive whole number." };
  }

  const now = new Date().toISOString();
  const ownerId = crypto.randomUUID();
  await hashPassword(password).then((passwordHash) => {
    db.insert(users)
      .values({ id: ownerId, name, email, passwordHash, role: "OWNER", createdAt: now })
      .run();
  });
  db.insert(businessSettings)
    .values({
      id: "singleton",
      companyName,
      tagline: String(form.get("tagline") ?? "").trim() || null,
      addressLines: String(form.get("addressLines") ?? "").trim() || null,
      phone: String(form.get("phone") ?? "").trim() || null,
      logoUrl: null,
      footerNote: String(form.get("footerNote") ?? "").trim() || null,
      invoiceNumberPrefix: prefix,
      nextInvoiceNumber: startNumber,
      bankName: String(form.get("bankName") ?? "").trim() || null,
      bankAccountName: String(form.get("bankAccountName") ?? "").trim() || null,
      bankAccountNumber: String(form.get("bankAccountNumber") ?? "").trim() || null,
      updatedAt: now,
    })
    .run();

  // Sync key: shown ONCE to the operator, only its hash is stored.
  const syncKey = randomBytes(32).toString("hex");
  const syncKeyHash = createHash("sha256").update(syncKey).digest("hex");
  setSyncValue("syncKeyHash", syncKeyHash);

  await setSessionCookie(ownerId);
  return { syncKey };
}
