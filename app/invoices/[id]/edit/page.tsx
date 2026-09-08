import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { eq, asc } from "drizzle-orm";
import { getSessionUser } from "@/lib/auth";
import { getDb } from "@/db/sqlite";
import { customers, invoices, invoiceItems } from "@/db/schema.sqlite";
import { InvoiceEditForm } from "@/components/invoice/InvoiceEditForm";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function InvoiceEditPage({ params }: PageProps) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const { id } = await params;
  if (!id) notFound();

  const db = getDb();

  const invoice = db
    .select()
    .from(invoices)
    .where(eq(invoices.id, id))
    .get();

  if (!invoice) {
    notFound();
  }

  // Finalized or voided invoices cannot be edited
  if (!invoice.isProvisional || invoice.isVoid) {
    redirect(`/invoices/${id}`);
  }

  const allCustomers = db
    .select({ id: customers.id, name: customers.name })
    .from(customers)
    .orderBy(customers.name)
    .all();

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

  const formattedItems = items.map((it) => ({
    qtyLabel: it.qtyLabel,
    description: it.description,
    rateNaira: (it.rateKobo / 100).toFixed(2),
    amountNaira: (it.amountKobo / 100).toFixed(2),
  }));

  return (
    <div>
      <header className="topbar">
        <h1 className="page-title">Edit Draft Invoice</h1>
        <Link className="btn secondary" href={`/invoices/${id}`}>
          ← Back to Invoice
        </Link>
      </header>

      <section className="card" style={{ maxWidth: 820, margin: "0 auto" }}>
        <InvoiceEditForm
          invoiceId={id}
          customers={allCustomers}
          initialData={{
            customerId: invoice.customerId,
            date: invoice.date,
            lpoNumber: invoice.lpoNumber ?? "",
            invoiceDetails: invoice.invoiceDetails,
            additionalInfo: invoice.additionalInfo ?? "",
            taxPercent: invoice.taxPercent ?? 0,
            items: formattedItems,
          }}
        />
      </section>
    </div>
  );
}
