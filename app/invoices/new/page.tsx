import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getDb } from "@/db/sqlite";
import { customers } from "@/db/schema.sqlite";
import { InvoiceCreateForm } from "@/components/invoice/InvoiceCreateForm";

export default async function NewInvoicePage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const db = getDb();
  const allCustomers = db
    .select({ id: customers.id, name: customers.name })
    .from(customers)
    .orderBy(customers.name)
    .all();

  return (
    <div>
      <header className="topbar">
        <h1 className="page-title">Create Invoice</h1>
        <Link className="btn secondary" href="/invoices">
          ← Back to Invoices
        </Link>
      </header>

      <section style={{ maxWidth: 720, marginTop: 16 }}>
        {allCustomers.length === 0 ? (
          <p style={{ color: "#6b7280" }}>
            No customers yet.{" "}
            <a href="/customers" style={{ color: "#15803d" }}>
              Create a customer first
            </a>
            .
          </p>
        ) : (
          <InvoiceCreateForm customers={allCustomers} />
        )}
      </section>
    </div>
  );
}
