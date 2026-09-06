"use client";

import { useActionState } from "react";
import { createStaffAction, resetPasswordAction, updateSettingsAction } from "./actions";
import type { BusinessSettings } from "@/lib/settings";

export function SettingsEditor({ settings, editable }: { settings: BusinessSettings; editable: boolean }) {
  const [state, action, pending] = useActionState(updateSettingsAction, null);
  return (
    <form action={editable ? action : undefined}>
      <label htmlFor="companyName">Company name</label>
      <input id="companyName" name="companyName" defaultValue={settings.companyName} disabled={!editable} required />
      <label htmlFor="tagline">Tagline</label>
      <input id="tagline" name="tagline" defaultValue={settings.tagline ?? ""} disabled={!editable} />
      <label htmlFor="phone">Phone</label>
      <input id="phone" name="phone" defaultValue={settings.phone ?? ""} disabled={!editable} />
      <label htmlFor="addressLines">Address lines</label>
      <textarea id="addressLines" name="addressLines" rows={3} defaultValue={settings.addressLines ?? ""} disabled={!editable} />
      <label htmlFor="bankName">Bank name</label>
      <input id="bankName" name="bankName" defaultValue={settings.bankName ?? ""} disabled={!editable} />
      <label htmlFor="bankAccountName">Bank account name</label>
      <input id="bankAccountName" name="bankAccountName" defaultValue={settings.bankAccountName ?? ""} disabled={!editable} />
      <label htmlFor="bankAccountNumber">Bank account number</label>
      <input id="bankAccountNumber" name="bankAccountNumber" defaultValue={settings.bankAccountNumber ?? ""} disabled={!editable} />
      <label htmlFor="footerNote">Footer note</label>
      <input id="footerNote" name="footerNote" defaultValue={settings.footerNote ?? ""} disabled={!editable} />
      <p style={{ color: "#6b7280" }}>
        Prefix: <strong>{settings.invoiceNumberPrefix}</strong> · next number:{" "}
        <strong>{settings.nextInvoiceNumber}</strong> (managed by sync — Bucket 4)
      </p>
      {state?.error ? <p className="error">{state.error}</p> : null}
      {state && "ok" in state ? <p style={{ color: "#15803d" }}>Saved.</p> : null}
      {editable ? (
        <button className="btn" type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save settings"}
        </button>
      ) : (
        <p style={{ color: "#6b7280" }}>Only Owner can edit settings.</p>
      )}
    </form>
  );
}

export function StaffManager({ staff }: { staff: { id: string; name: string; email: string; role: string }[] }) {
  const [s1, a1, p1] = useActionState(createStaffAction, null);
  const [s2, a2, p2] = useActionState(resetPasswordAction, null);
  return (
    <>
      <h3>Team accounts</h3>
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Role</th>
          </tr>
        </thead>
        <tbody>
          {staff.map((u) => (
            <tr key={u.id}>
              <td>{u.name}</td>
              <td>{u.email}</td>
              <td>{u.role}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <h4>Create account</h4>
      <form action={a1}>
        <label htmlFor="s-name">Name</label>
        <input id="s-name" name="name" required />
        <label htmlFor="s-email">Email</label>
        <input id="s-email" name="email" type="email" required />
        <label htmlFor="s-password">Password (min 8 chars)</label>
        <input id="s-password" name="password" type="password" required />
        <label htmlFor="s-role">Role</label>
        <select id="s-role" name="role" defaultValue="STAFF">
          <option value="STAFF">STAFF</option>
          <option value="OWNER">OWNER</option>
          <option value="ADMIN_DEV">ADMIN_DEV</option>
        </select>
        {s1?.error ? <p className="error">{s1.error}</p> : null}
        {s1 && "ok" in s1 ? <p style={{ color: "#15803d" }}>Account created.</p> : null}
        <p>
          <button className="btn" type="submit" disabled={p1}>
            {p1 ? "Creating…" : "Create account"}
          </button>
        </p>
      </form>
      <h4>Reset a password (Owner action)</h4>
      <form action={a2}>
        <label htmlFor="r-user">User</label>
        <select id="r-user" name="userId">
          {staff.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name} ({u.email})
            </option>
          ))}
        </select>
        <label htmlFor="r-password">New password (min 8 chars)</label>
        <input id="r-password" name="password" type="password" required />
        {s2?.error ? <p className="error">{s2.error}</p> : null}
        {s2 && "ok" in s2 ? <p style={{ color: "#15803d" }}>Password reset.</p> : null}
        <p>
          <button className="btn secondary" type="submit" disabled={p2}>
            {p2 ? "Resetting…" : "Reset password"}
          </button>
        </p>
      </form>
    </>
  );
}
