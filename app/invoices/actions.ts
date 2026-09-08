"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { requireUser } from "@/lib/auth";
import { getDb } from "@/db/sqlite";
import { businessSettings, customers, invoices, invoiceItems } from "@/db/schema.sqlite";
import { sumKobo, computeTaxBreakdown } from "@/lib/money";
import { syncToNeon } from "@/lib/sync";

type LineItemInput = {
  qtyLabel: string;
  description: string;
  rateKobo: number;
  amountKobo: number;
};

type CreateInvoiceInput = {
  customerId: string;
  date: string;
  lpoNumber: string;
  invoiceDetails: string;
  additionalInfo?: string;
  taxPercent?: number;
  items: LineItemInput[];
};

function validateKobo(value: unknown, label: string): number {
  const n = Number(value);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < 0) {
    throw new Error(`${label} must be a non-negative integer (kobo). Got: ${value}`);
  }
  return n;
}

export async function createInvoice(input: CreateInvoiceInput): Promise<void> {
  const user = await requireUser();

  // Validate required fields
  const { customerId, date, lpoNumber, invoiceDetails, additionalInfo, taxPercent, items } = input;

  if (!customerId || typeof customerId !== "string") {
    throw new Error("Customer is required.");
  }
  if (!date || typeof date !== "string") {
    throw new Error("Date is required.");
  }
  if (!invoiceDetails || typeof invoiceDetails !== "string" || invoiceDetails.trim().length === 0) {
    throw new Error("Invoice Details is required.");
  }
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("At least one line item is required.");
  }

  // Validate each item
  const validatedItems: LineItemInput[] = items.map((item, i) => {
    if (!item.qtyLabel || typeof item.qtyLabel !== "string" || item.qtyLabel.trim().length === 0) {
      throw new Error(`Line item ${i + 1}: Qty label is required.`);
    }
    if (!item.description || typeof item.description !== "string" || item.description.trim().length === 0) {
      throw new Error(`Line item ${i + 1}: Description is required.`);
    }
    return {
      qtyLabel: item.qtyLabel.trim(),
      description: item.description.trim(),
      rateKobo: validateKobo(item.rateKobo, `Line item ${i + 1} rate`),
      amountKobo: validateKobo(item.amountKobo, `Line item ${i + 1} amount`),
    };
  });

  const parsedTaxPercent = (typeof taxPercent === "number" && !isNaN(taxPercent)) ? Math.max(0, Math.min(100, Math.round(taxPercent))) : 0;

  const subtotalKobo = sumKobo(validatedItems.map((it) => it.amountKobo));
  const { total: totalKobo } = computeTaxBreakdown(subtotalKobo, parsedTaxPercent);

  const db = getDb();
  const invoiceId = crypto.randomUUID();
  const now = new Date().toISOString();

  // Verify customer exists
  const customer = db
    .select({ id: customers.id })
    .from(customers)
    .where(eq(customers.id, customerId))
    .get();
  if (!customer) {
    throw new Error("Selected customer does not exist.");
  }

  // Insert invoice — provisional, no invoice number yet
  db.insert(invoices)
    .values({
      id: invoiceId,
      invoiceNo: null,
      isProvisional: true,
      customerId,
      date,
      lpoNumber: lpoNumber.trim() || null,
      invoiceDetails: invoiceDetails.trim(),
      additionalInfo: (additionalInfo && typeof additionalInfo === "string" && additionalInfo.trim().length > 0) ? additionalInfo.trim() : null,
      taxPercent: parsedTaxPercent,
      totalKobo,
      isVoid: false,
      voidReason: null,
      supersedesInvoiceId: null,
      createdById: user.id,
      createdAt: now,
    })
    .run();

  // Insert line items
  for (let i = 0; i < validatedItems.length; i++) {
    const item = validatedItems[i];
    db.insert(invoiceItems)
      .values({
        id: crypto.randomUUID(),
        invoiceId,
        position: i,
        qtyLabel: item.qtyLabel,
        description: item.description,
        rateKobo: item.rateKobo,
        amountKobo: item.amountKobo,
      })
      .run();
  }

  try {
    await syncToNeon();
  } catch (err) {
    console.warn("Neon sync deferred:", err);
  }

  redirect(`/invoices/${invoiceId}`);
}

export async function updateInvoice(
  invoiceId: string,
  input: CreateInvoiceInput,
): Promise<void> {
  const user = await requireUser();

  const db = getDb();
  const existing = db
    .select()
    .from(invoices)
    .where(eq(invoices.id, invoiceId))
    .get();

  if (!existing) {
    throw new Error("Invoice not found.");
  }
  if (!existing.isProvisional) {
    throw new Error("Finalized invoices cannot be edited directly.");
  }
  if (existing.isVoid) {
    throw new Error("Voided invoices cannot be edited.");
  }

  const { customerId, date, lpoNumber, invoiceDetails, additionalInfo, taxPercent, items } = input;

  if (!customerId || typeof customerId !== "string") {
    throw new Error("Customer is required.");
  }
  if (!date || typeof date !== "string") {
    throw new Error("Date is required.");
  }
  if (!invoiceDetails || typeof invoiceDetails !== "string" || invoiceDetails.trim().length === 0) {
    throw new Error("Invoice Details is required.");
  }
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("At least one line item is required.");
  }

  const validatedItems: LineItemInput[] = items.map((item, i) => {
    if (!item.qtyLabel || typeof item.qtyLabel !== "string" || item.qtyLabel.trim().length === 0) {
      throw new Error(`Line item ${i + 1}: Qty label is required.`);
    }
    if (!item.description || typeof item.description !== "string" || item.description.trim().length === 0) {
      throw new Error(`Line item ${i + 1}: Description is required.`);
    }
    return {
      qtyLabel: item.qtyLabel.trim(),
      description: item.description.trim(),
      rateKobo: validateKobo(item.rateKobo, `Line item ${i + 1} rate`),
      amountKobo: validateKobo(item.amountKobo, `Line item ${i + 1} amount`),
    };
  });

  const parsedTaxPercent = (typeof taxPercent === "number" && !isNaN(taxPercent)) ? Math.max(0, Math.min(100, Math.round(taxPercent))) : 0;

  const subtotalKobo = sumKobo(validatedItems.map((it) => it.amountKobo));
  const { total: totalKobo } = computeTaxBreakdown(subtotalKobo, parsedTaxPercent);

  const customer = db
    .select({ id: customers.id })
    .from(customers)
    .where(eq(customers.id, customerId))
    .get();
  if (!customer) {
    throw new Error("Selected customer does not exist.");
  }

  // Update invoice
  db.update(invoices)
    .set({
      customerId,
      date,
      lpoNumber: lpoNumber.trim() || null,
      invoiceDetails: invoiceDetails.trim(),
      additionalInfo: (additionalInfo && typeof additionalInfo === "string" && additionalInfo.trim().length > 0) ? additionalInfo.trim() : null,
      taxPercent: parsedTaxPercent,
      totalKobo,
    })
    .where(eq(invoices.id, invoiceId))
    .run();

  // Delete previous items and reinsert
  db.delete(invoiceItems).where(eq(invoiceItems.invoiceId, invoiceId)).run();

  for (let i = 0; i < validatedItems.length; i++) {
    const item = validatedItems[i];
    db.insert(invoiceItems)
      .values({
        id: crypto.randomUUID(),
        invoiceId,
        position: i,
        qtyLabel: item.qtyLabel,
        description: item.description,
        rateKobo: item.rateKobo,
        amountKobo: item.amountKobo,
      })
      .run();
  }

  try {
    await syncToNeon();
  } catch (err) {
    console.warn("Neon sync deferred:", err);
  }

  redirect(`/invoices/${invoiceId}`);
}

export async function finalizeInvoice(invoiceId: string): Promise<void> {
  await requireUser();

  const db = getDb();
  const existing = db
    .select()
    .from(invoices)
    .where(eq(invoices.id, invoiceId))
    .get();

  if (!existing) {
    throw new Error("Invoice not found.");
  }
  if (!existing.isProvisional) {
    throw new Error("Invoice is already finalized.");
  }
  if (existing.isVoid) {
    throw new Error("Cannot finalize a voided invoice.");
  }

  // Claim next invoice number atomically from businessSettings
  const settings = db
    .select()
    .from(businessSettings)
    .where(eq(businessSettings.id, "singleton"))
    .get();

  if (!settings) {
    throw new Error("Business settings not found.");
  }

  const assignedNo = settings.nextInvoiceNumber;

  // Increment counter in settings
  db.update(businessSettings)
    .set({
      nextInvoiceNumber: assignedNo + 1,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(businessSettings.id, "singleton"))
    .run();

  // Finalize invoice
  db.update(invoices)
    .set({
      invoiceNo: assignedNo,
      isProvisional: false,
    })
    .where(eq(invoices.id, invoiceId))
    .run();

  try {
    await syncToNeon();
  } catch (err) {
    console.warn("Neon sync deferred:", err);
  }

  redirect(`/invoices/${invoiceId}`);
}

export async function voidInvoice(invoiceId: string, reason: string): Promise<void> {
  const user = await requireUser();

  if (user.role !== "OWNER" && user.role !== "ADMIN_DEV") {
    throw new Error("Only an Owner or Admin can void an invoice.");
  }

  if (!reason || !reason.trim()) {
    throw new Error("A reason for voiding this invoice is required.");
  }

  const db = getDb();
  const existing = db
    .select()
    .from(invoices)
    .where(eq(invoices.id, invoiceId))
    .get();

  if (!existing) {
    throw new Error("Invoice not found.");
  }
  if (existing.isVoid) {
    throw new Error("Invoice is already voided.");
  }

  db.update(invoices)
    .set({
      isVoid: true,
      voidReason: reason.trim(),
    })
    .where(eq(invoices.id, invoiceId))
    .run();

  try {
    await syncToNeon();
  } catch (err) {
    console.warn("Neon sync deferred:", err);
  }

  redirect(`/invoices/${invoiceId}`);
}

export async function deleteDraftInvoice(invoiceId: string): Promise<void> {
  await requireUser();

  const db = getDb();
  const existing = db
    .select()
    .from(invoices)
    .where(eq(invoices.id, invoiceId))
    .get();

  if (!existing) {
    throw new Error("Invoice not found.");
  }
  if (!existing.isProvisional) {
    throw new Error("Only draft invoices can be deleted.");
  }

  // Delete items first (FK integrity)
  db.delete(invoiceItems).where(eq(invoiceItems.invoiceId, invoiceId)).run();
  db.delete(invoices).where(eq(invoices.id, invoiceId)).run();

  try {
    await syncToNeon();
  } catch (err) {
    console.warn("Neon sync deferred:", err);
  }

  redirect("/invoices");
}



