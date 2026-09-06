import Link from "next/link";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb } from "@/db/sqlite";
import { customers, invoices } from "@/db/schema.sqlite";
import { getSessionUser } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { koboToNaira, formatInvoiceNo } from "@/lib/money";
import { saveCustomer } from "./actions";

export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const db = getDb();
  const settings = getSettings();

  // --- READ search from URL query param (simple link-based filter) ---
  const resolvedSearchParams = await searchParams;
  const search = resolvedSearchParams?.q || "";

  // --- LIST customers + invoice counts ---
  const allCustomers = db
    .select({ id: customers.id, name: customers.name, phone: customers.phone, email: customers.email })
    .from(customers)
    .orderBy(customers.name)
    .all();

  // Initialize invoice counts per customer (0 until invoices are created).
  const customerInvoiceCounts = new Map(
    allCustomers.map(c => [c.id, 0] as const),
  );

  // --- FILTERED display ---
  const displayed = search
    ? allCustomers.filter(
        (c) =>
          c.name.toLowerCase().includes(search.toLowerCase()) ||
          (c.phone && c.phone.toLowerCase().includes(search.toLowerCase())) ||
          (c.email && c.email.toLowerCase().includes(search.toLowerCase())),
      )
    : allCustomers;

  return (
    <div>
      <header className="topbar">
        <h1 className="page-title">Customers</h1>
        <Link className="btn secondary" href="/">
          ← Dashboard
        </Link>
        {user.role === "OWNER" && (
          <form action={saveCustomer}>
            <label htmlFor="c-name">Name</label>
            <input id="c-name" name="name" required autoComplete="name" />
            <button type="submit">Save customer</button>
          </form>
        )}
      </header>

      <section>
        <h2 style={{ margin: "16px 0 12px" }}>Customers</h2>
        {displayed.length === 0 ? (
          <p style={{ color: "#6b7280" }}>
            No customers yet.{" "}
            <a href="/customers/new">Create your first customer</a>
          </p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Phone</th>
                <th>Email</th>
                <th>Invoices</th>
              </tr>
            </thead>
            <tbody>
              {displayed.map((c) => (
                <tr key={c.id}>
                  <td>{c.name}</td>
                  <td>{c.phone ?? "—"}</td>
                  <td>{c.email ?? "—"}</td>
                  <td>{customerInvoiceCounts.get(c.id) ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}