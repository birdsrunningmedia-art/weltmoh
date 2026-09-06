import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getDb } from "@/db/sqlite";
import { customers, invoices } from "@/db/schema.sqlite";
import { getSettings } from "@/lib/settings";
import { koboToNaira, formatInvoiceNo } from "@/lib/money";
import { eq, desc } from "drizzle-orm";

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const db = getDb();
  const settings = getSettings();

  const { id } = await params;

  const customer = db
    .select()
    .from(customers)
    .where(eq(customers.id, id))
    .get();

  if (!customer) return notFound();

  // Sorted invoices: by date descending, then invoiceNo descending
  const invoiceRows = db
    .select({
      id: invoices.id,
      invoiceNo: invoices.invoiceNo,
      isProvisional: invoices.isProvisional,
      date: invoices.date,
      totalKobo: invoices.totalKobo,
      isVoid: invoices.isVoid,
    })
    .from(invoices)
    .where(eq(invoices.customerId, id))
    .orderBy(desc(invoices.date), desc(invoices.invoiceNo))
    .all();

  const invoiceList = invoiceRows.map((inv) => ({
    ...inv,
    totalNaira: koboToNaira(inv.totalKobo),
    invoiceDisplayNo:
      inv.invoiceNo != null
        ? formatInvoiceNo(settings?.invoiceNumberPrefix ?? "WSNLI-", inv.invoiceNo)
        : "DRAFT",
  }));

  return (
    <div>
      <header className="topbar">
        <h1 className="page-title">Customer Detail</h1>
        <Link className="btn secondary" href="/customers">
          ← Customers
        </Link>
      </header>

      <section>
        <h2 style={{ margin: "16px 0 8px" }}>{customer.name}</h2>
        <table style={{ marginBottom: 16 }}>
          <tbody>
            <tr><th>Phone</th><td>{customer.phone ?? "—"}</td></tr>
            <tr><th>Email</th><td>{customer.email ?? "—"}</td></tr>
            <tr><th>Address</th><td>{customer.address ?? "—"}</td></tr>
            <tr><th>Notes</th><td>{customer.notes ?? "—"}</td></tr>
            <tr><th>Created</th><td>{new Date(customer.createdAt).toLocaleString()}</td></tr>
          </tbody>
        </table>
      </section>

      <section>
        <h2 style={{ margin: "24px 0 12px" }}>Invoices ({invoiceList.length})</h2>
        {invoiceList.length === 0 ? (
          <p style={{ color: "#6b7280" }}>No invoices yet.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Invoice No</th>
                <th>Date</th>
                <th>Total</th>
                <th>Provisional</th>
                <th>Void</th>
              </tr>
            </thead>
            <tbody>
              {invoiceList.map((inv) => (
                <tr key={inv.id}>
                  <td>
                    <Link href={`/invoices/${inv.id}`} className="link">
                      {inv.invoiceDisplayNo}
                    </Link>
                  </td>
                  <td>{new Date(inv.date).toLocaleDateString()}</td>
                  <td>{inv.totalNaira}</td>
                  <td>{inv.isProvisional ? "Yes" : "No"}</td>
                  <td>{inv.isVoid ? "Yes" : "No"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
