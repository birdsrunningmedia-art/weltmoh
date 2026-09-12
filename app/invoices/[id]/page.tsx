import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { eq, asc } from "drizzle-orm";
import { getSessionUser, can } from "@/lib/auth";
import { getDb } from "@/db/sqlite";
import { customers, invoices, invoiceItems } from "@/db/schema.sqlite";
import { getSettings } from "@/lib/settings";
import { InvoiceDisplay } from "@/components/invoice/InvoiceDisplay";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function InvoiceDetailPage({ params }: PageProps) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const { id } = await params;
  if (!id) notFound();

  const db = getDb();
  const settings = getSettings();

  // 1. Fetch invoice
  const invoice = db
    .select()
    .from(invoices)
    .where(eq(invoices.id, id))
    .get();

  if (!invoice) {
    notFound();
  }

  // 2. Fetch customer
  const customer = db
    .select()
    .from(customers)
    .where(eq(customers.id, invoice.customerId))
    .get();

  // 3. Fetch items ordered by position
  const items = db
    .select({
      qtyLabel: invoiceItems.qtyLabel,
      description: invoiceItems.description,
      rateKobo: invoiceItems.rateKobo,
      amountKobo: invoiceItems.amountKobo,
    })
    .from(invoiceItems)
    .where(eq(invoiceItems.invoiceId, id))
    .orderBy(asc(invoiceItems.position))
    .all();

  const canVoid = can(user, "void");
  const canEdit = invoice.isProvisional && !invoice.isVoid;

  return (
    <div>
      <header className="topbar no-print">
        <h1 className="page-title">
          {invoice.isProvisional ? "Draft Invoice" : `Invoice ${invoice.invoiceNo ? `${settings?.invoiceNumberPrefix ?? "WSNLI-"}${String(invoice.invoiceNo).padStart(4, "0")}` : ""}`}
        </h1>
        <div style={{ display: "flex", gap: 10 }}>
          <Link className="btn secondary" href="/invoices">
            ← Invoices
          </Link>
          <Link className="btn secondary" href="/invoices/new">
            + New Invoice
          </Link>
        </div>
      </header>

      <InvoiceDisplay
        id={invoice.id}
        invoiceNo={invoice.invoiceNo}
        isProvisional={invoice.isProvisional}
        customerName={customer?.name ?? "Unknown Customer"}
        customerAddress={customer?.address}
        customerPhone={customer?.phone}
        date={invoice.date}
        lpoNumber={invoice.lpoNumber}
        invoiceDetails={invoice.invoiceDetails}
        additionalInfo={invoice.additionalInfo}
        taxPercent={invoice.taxPercent}
        items={items}
        totalKobo={invoice.totalKobo}
        isVoid={invoice.isVoid}
        voidReason={invoice.voidReason}
        canVoid={canVoid}
        canEdit={canEdit}
        signatory={invoice.signatory}
        settings={settings}
      />
    </div>
  );
}

