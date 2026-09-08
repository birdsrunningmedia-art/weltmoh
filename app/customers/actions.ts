"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "@/db/sqlite";
import { customers } from "@/db/schema.sqlite";
import { eq } from "drizzle-orm";
import { syncToNeon } from "@/lib/sync";

export async function saveCustomer(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("Customer name is required.");
  const db = getDb();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  db.insert(customers).values({
    id,
    name,
    phone: String(formData.get("phone") ?? "").trim() || null,
    email: String(formData.get("email") ?? "").trim() || null,
    address: String(formData.get("address") ?? "").trim() || null,
    notes: String(formData.get("notes") ?? "").trim() || null,
    createdAt: now,
  }).run();

  try {
    await syncToNeon();
  } catch (err) {
    console.warn("Neon sync deferred:", err);
  }

  revalidatePath("/customers");
}

export async function updateCustomer(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();
  if (!id) throw new Error("Customer id is required.");
  const db = getDb();
  db.update(customers)
    .set({
      name: String(formData.get("name") ?? "").trim(),
      phone: String(formData.get("phone") ?? "").trim() || null,
      email: String(formData.get("email") ?? "").trim() || null,
      address: String(formData.get("address") ?? "").trim() || null,
      notes: String(formData.get("notes") ?? "").trim() || null,
    })
    .where(eq(customers.id, id))
    .run();
  try { await syncToNeon(); } catch (err) { console.warn("Neon sync deferred:", err); }
  revalidatePath(`/customers/${id}`);
  revalidatePath("/customers");
}

