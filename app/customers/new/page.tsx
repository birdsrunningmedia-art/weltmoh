import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { saveCustomer } from "../actions";

export default async function NewCustomerPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.role !== "OWNER") redirect("/customers");

  return (
    <div>
      <header className="topbar">
        <h1 className="page-title">New Customer</h1>
        <Link className="btn secondary" href="/customers">
          ← Back to Customers
        </Link>
      </header>

      <section style={{ maxWidth: 640, marginTop: 16 }}>
        <form action={saveCustomer}>
          <label htmlFor="c-name">Name *</label>
          <input id="c-name" name="name" required autoComplete="name" />

          <label htmlFor="c-phone">Contact (Phone)</label>
          <input id="c-phone" name="phone" autoComplete="tel" />

          <label htmlFor="c-email">Email</label>
          <input id="c-email" name="email" type="email" autoComplete="email" />

          <label htmlFor="c-address">Location (Address)</label>
          <input id="c-address" name="address" />

          <label htmlFor="c-notes">Notes</label>
          <textarea id="c-notes" name="notes" rows={3} />

          <button type="submit">Save customer</button>
        </form>
      </section>
    </div>
  );
}
