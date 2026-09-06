"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "@/db/sqlite";
import { customers } from "@/db/schema.sqlite";
import { syncToNeon } from "@/lib/sync";

export async function saveCustomer(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("Customer name is required.");
  const db = getDb();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  db.insert(customers).values({ id, name, phone: null, email: null, notes: null, createdAt: now }).run();

  try {
    await syncToNeon();
  } catch (err) {
    console.warn("Neon sync deferred:", err);
  }

  revalidatePath("/customers");
}