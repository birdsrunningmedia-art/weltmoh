import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getDb } from "@/db/sqlite";
import { customers, invoices } from "@/db/schema.sqlite";
import { getSettings } from "@/lib/settings";
import { koboToNaira, formatInvoiceNo } from "@/lib/money";

export default async function InvoicesPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const db = getDb();
  const settings = getSettings();

  // --- LIST invoices ---
  const allInvoices = db
    .select({
      id: invoices.id,
      invoiceNo: invoices.invoiceNo,
      isProvisional: invoices.isProvisional,
      customerId: invoices.customerId,
      date: invoices.date,
      totalKobo: invoices.totalKobo,
      isVoid: invoices.isVoid,
    })
    .from(invoices)
    .orderBy(invoices.createdAt)
    .all();

  // Customer names map
  const allCustomers = db
    .select({ id: customers.id, name: customers.name })
    .from(customers)
    .all();
  const customerNames = new Map(allCustomers.map((c) => [c.id, c.name]));

  // Format helpers
  const displayed = allInvoices.map((inv) => ({
    ...inv,
    customerName: customerNames.get(inv.customerId) ?? "—",
    totalNaira: koboToNaira(inv.totalKobo),
    invoiceDisplayNo: inv.invoiceNo != null ? formatInvoiceNo(settings?.invoiceNumberPrefix ?? "WSNLI-", inv.invoiceNo) : "DRAFT",
  }));

  return (
    <div>
      <header className="topbar">
        <h1 className="page-title">Invoices</h1>
        <Link className="btn secondary" href="/">
          ← Dashboard
        </Link>
        <Link
          href="/invoices/new"
          className="btn secondary"
          style={{ marginLeft: 8 }}
        >
          Create invoice
        </Link>
      </header>

      <section>
        <h2 style={{ margin: "16px 0 12px" }}>Invoices</h2>
        {displayed.length === 0 ? (
          <p style={{ color: "#6b7280" }}>
            No invoices yet.{" "}
            <Link href="/invoices/new" style={{ color: "#15803d" }}>
              Create your first invoice
            </Link>
          </p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Number</th>
                <th>Customer</th>
                <th>Date</th>
                <th>Total (₦)</th>
                <th>Status</th>
                <th style={{ textAlign: "right" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {displayed.map((inv) => (
                <tr key={inv.id}>
                  <td>
                    <Link
                      href={`/invoices/${inv.id}`}
                      style={{
                        fontWeight: 700,
                        color: "#15803d",
                        textDecoration: "none",
                      }}
                    >
                      {inv.invoiceDisplayNo}
                    </Link>
                  </td>
                  <td>{inv.customerName}</td>
                  <td>{inv.date}</td>
                  <td>{inv.totalNaira}</td>
                  <td>
                    {inv.isVoid ? (
                      <span className="badge void">VOID</span>
                    ) : inv.isProvisional ? (
                      <span className="badge draft">DRAFT</span>
                    ) : (
                      <span className="badge final">FINALIZED</span>
                    )}
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <Link
                      href={`/invoices/${inv.id}`}
                      className="btn secondary"
                      style={{
                        fontSize: 12,
                        padding: "4px 10px",
                        display: "inline-block",
                      }}
                    >
                      View / Export
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}