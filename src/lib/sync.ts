import { eq } from "drizzle-orm";
import { getDb } from "@/db/sqlite";
import {
  users as sqliteUsers,
  businessSettings as sqliteSettings,
  customers as sqliteCustomers,
  invoices as sqliteInvoices,
  invoiceItems as sqliteItems,
} from "@/db/schema.sqlite";
import { getCloudDb } from "@/db/pg";
import {
  users as pgUsers,
  businessSettings as pgSettings,
  customers as pgCustomers,
  invoices as pgInvoices,
  invoiceItems as pgItems,
  syncState as pgSyncState,
} from "@/db/schema.pg";
import { setSyncValue } from "@/lib/settings";

export type SyncResult = {
  success: boolean;
  timestamp: string;
  synced: {
    users: number;
    settings: boolean;
    customers: number;
    invoices: number;
    items: number;
  };
  error?: string;
};

export async function syncToNeon(): Promise<SyncResult> {
  const now = new Date().toISOString();
  const summary = {
    users: 0,
    settings: false,
    customers: 0,
    invoices: 0,
    items: 0,
  };

  try {
    const cloudDb = getCloudDb();
    const localDb = getDb();

    // 1. Sync Business Settings
    const localSettings = localDb
      .select()
      .from(sqliteSettings)
      .where(eq(sqliteSettings.id, "singleton"))
      .get();

    if (localSettings) {
      await cloudDb
        .insert(pgSettings)
        .values({
          id: "singleton",
          companyName: localSettings.companyName,
          tagline: localSettings.tagline,
          addressLines: localSettings.addressLines,
          phone: localSettings.phone,
          logoUrl: localSettings.logoUrl,
          footerNote: localSettings.footerNote,
          invoiceNumberPrefix: localSettings.invoiceNumberPrefix,
          nextInvoiceNumber: localSettings.nextInvoiceNumber,
          bankName: localSettings.bankName,
          bankAccountName: localSettings.bankAccountName,
          bankAccountNumber: localSettings.bankAccountNumber,
          updatedAt: new Date(localSettings.updatedAt || now),
        })
        .onConflictDoUpdate({
          target: pgSettings.id,
          set: {
            companyName: localSettings.companyName,
            tagline: localSettings.tagline,
            addressLines: localSettings.addressLines,
            phone: localSettings.phone,
            logoUrl: localSettings.logoUrl,
            footerNote: localSettings.footerNote,
            invoiceNumberPrefix: localSettings.invoiceNumberPrefix,
            nextInvoiceNumber: localSettings.nextInvoiceNumber,
            bankName: localSettings.bankName,
            bankAccountName: localSettings.bankAccountName,
            bankAccountNumber: localSettings.bankAccountNumber,
            updatedAt: new Date(localSettings.updatedAt || now),
          },
        });
      summary.settings = true;
    }

    // 2. Sync Users
    const localUsers = localDb.select().from(sqliteUsers).all();
    for (const u of localUsers) {
      await cloudDb
        .insert(pgUsers)
        .values({
          id: u.id,
          name: u.name,
          email: u.email,
          passwordHash: u.passwordHash,
          role: u.role,
          createdAt: new Date(u.createdAt || now),
        })
        .onConflictDoUpdate({
          target: pgUsers.id,
          set: {
            name: u.name,
            email: u.email,
            passwordHash: u.passwordHash,
            role: u.role,
          },
        });
      summary.users++;
    }

    // 3. Sync Customers
    const localCustomers = localDb.select().from(sqliteCustomers).all();
    for (const c of localCustomers) {
      await cloudDb
        .insert(pgCustomers)
        .values({
          id: c.id,
          name: c.name,
          address: c.address,
          phone: c.phone,
          email: c.email,
          notes: c.notes,
          createdAt: new Date(c.createdAt || now),
        })
        .onConflictDoUpdate({
          target: pgCustomers.id,
          set: {
            name: c.name,
            address: c.address,
            phone: c.phone,
            email: c.email,
            notes: c.notes,
          },
        });
      summary.customers++;
    }

    // 4. Sync Invoices
    const localInvoices = localDb.select().from(sqliteInvoices).all();
    for (const inv of localInvoices) {
      await cloudDb
        .insert(pgInvoices)
        .values({
          id: inv.id,
          invoiceNo: inv.invoiceNo,
          isProvisional: Boolean(inv.isProvisional),
          customerId: inv.customerId,
          date: new Date(inv.date),
          lpoNumber: inv.lpoNumber,
          invoiceDetails: inv.invoiceDetails,
          totalKobo: inv.totalKobo,
          isVoid: Boolean(inv.isVoid),
          voidReason: inv.voidReason,
          supersedesInvoiceId: inv.supersedesInvoiceId,
          createdById: inv.createdById,
          createdAt: new Date(inv.createdAt || now),
        })
        .onConflictDoUpdate({
          target: pgInvoices.id,
          set: {
            invoiceNo: inv.invoiceNo,
            isProvisional: Boolean(inv.isProvisional),
            customerId: inv.customerId,
            date: new Date(inv.date),
            lpoNumber: inv.lpoNumber,
            invoiceDetails: inv.invoiceDetails,
            totalKobo: inv.totalKobo,
            isVoid: Boolean(inv.isVoid),
            voidReason: inv.voidReason,
            supersedesInvoiceId: inv.supersedesInvoiceId,
          },
        });
      summary.invoices++;
    }

    // 5. Sync Line Items
    const localItems = localDb.select().from(sqliteItems).all();
    for (const item of localItems) {
      await cloudDb
        .insert(pgItems)
        .values({
          id: item.id,
          invoiceId: item.invoiceId,
          position: item.position,
          qtyLabel: item.qtyLabel,
          description: item.description,
          rateKobo: item.rateKobo,
          amountKobo: item.amountKobo,
        })
        .onConflictDoUpdate({
          target: pgItems.id,
          set: {
            position: item.position,
            qtyLabel: item.qtyLabel,
            description: item.description,
            rateKobo: item.rateKobo,
            amountKobo: item.amountKobo,
          },
        });
      summary.items++;
    }

    // 6. Record last sync timestamp locally & in Neon
    setSyncValue("lastSyncAt", now);

    await cloudDb
      .insert(pgSyncState)
      .values({
        key: "lastSyncAt",
        value: now,
        updatedAt: new Date(now),
      })
      .onConflictDoUpdate({
        target: pgSyncState.key,
        set: {
          value: now,
          updatedAt: new Date(now),
        },
      });

    return {
      success: true,
      timestamp: now,
      synced: summary,
    };
  } catch (err: any) {
    console.error("Sync to Neon failed:", err);
    return {
      success: false,
      timestamp: now,
      synced: summary,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
