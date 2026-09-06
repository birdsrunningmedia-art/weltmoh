import Link from "next/link";
import { redirect } from "next/navigation";
import { count, eq } from "drizzle-orm";
import { getDb } from "@/db/sqlite";
import { customers, invoices } from "@/db/schema.sqlite";
import { getSessionUser } from "@/lib/auth";
import { getSettings, isFirstRun } from "@/lib/settings";

export default async function Dashboard() {
  if (isFirstRun()) redirect("/setup");
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const db = getDb();
  const [{ n: customerCount }] = db.select({ n: count() }).from(customers).all();
  const [{ n: invoiceCount }] = db.select({ n: count() }).from(invoices).all();
  const [{ n: draftCount }] = db
    .select({ n: count() })
    .from(invoices)
    .where(eq(invoices.isProvisional, true))
    .all();
  const settings = getSettings();

  return (
    <>
      <div className="topbar">
        <h1 className="page-title">Dashboard</h1>
        <span className="syncbar">Signed in as {user.name} ({user.role})</span>
      </div>
      <div className="stat-grid">
        <div className="stat">
          <div className="num">{invoiceCount}</div>
          <div className="lbl">Total invoices</div>
        </div>
        <div className="stat">
          <div className="num">{draftCount}</div>
          <div className="lbl">Draft / provisional</div>
        </div>
        <div className="stat">
          <div className="num">{customerCount}</div>
          <div className="lbl">Customers</div>
        </div>
      </div>
      <div className="card" style={{ marginTop: 16 }}>
        <h3 style={{ marginTop: 0 }}>Business profile</h3>
        {settings ? (
          <p style={{ color: "#374151" }}>
            {settings.companyName} · prefix {settings.invoiceNumberPrefix} · next number{" "}
            {settings.nextInvoiceNumber}
          </p>
        ) : (
          <p>No business settings yet.</p>
        )}
        <Link className="btn secondary" href="/invoices">
          View invoices
        </Link>{" "}
        <Link className="btn secondary" href="/customers">
          View customers
        </Link>
      </div>
      <div className="card">
        <h3 style={{ marginTop: 0 }}>Next steps</h3>
        <p style={{ color: "#6b7280" }}>
          Invoice creation and customer management land in Bucket 2. PDF/PNG output in Bucket 3.
          Cloud sync in Bucket 4.
        </p>
      </div>
    </>
  );
}
