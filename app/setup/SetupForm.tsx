"use client";

import { useActionState } from "react";
import { setupAction } from "./actions";

export function SetupForm() {
  const [state, action, pending] = useActionState(setupAction, null);

  if (state && "syncKey" in state) {
    return (
      <div className="card">
        <h3 style={{ marginTop: 0 }}>Setup complete — save your sync key</h3>
        <p>
          This key recovers your business data on a new computer. Store it in a password manager{" "}
          <strong>now</strong> — it will never be shown again.
        </p>
        <p
          style={{
            fontFamily: "monospace",
            background: "#f3f4f6",
            padding: 12,
            borderRadius: 8,
            wordBreak: "break-all",
          }}
        >
          {state.syncKey}
        </p>
        <a className="btn" href="/">
          Continue to dashboard
        </a>
      </div>
    );
  }

  return (
    <form action={action}>
      <h3>Owner account</h3>
      <label htmlFor="name">Owner name</label>
      <input id="name" name="name" required autoComplete="name" />
      <label htmlFor="email">Owner email</label>
      <input id="email" name="email" type="email" required autoComplete="username" />
      <label htmlFor="password">Password (min 8 chars)</label>
      <input id="password" name="password" type="password" required autoComplete="new-password" />

      <h3>Business</h3>
      <label htmlFor="companyName">Company name</label>
      <input id="companyName" name="companyName" required defaultValue="Weltmoh Services Nigeria Ltd" />
      <label htmlFor="prefix">Invoice prefix</label>
      <input id="prefix" name="prefix" defaultValue="WSNLI-" />
      <label htmlFor="startNumber">First invoice number (paper book continues from here)</label>
      <input id="startNumber" name="startNumber" inputMode="numeric" defaultValue="1" />
      <label htmlFor="phone">Phone</label>
      <input id="phone" name="phone" autoComplete="tel" />
      <label htmlFor="addressLines">Address lines</label>
      <textarea id="addressLines" name="addressLines" rows={3} />
      <label htmlFor="tagline">Tagline</label>
      <input id="tagline" name="tagline" />
      <label htmlFor="bankName">Bank name</label>
      <input id="bankName" name="bankName" />
      <label htmlFor="bankAccountName">Bank account name</label>
      <input id="bankAccountName" name="bankAccountName" />
      <label htmlFor="bankAccountNumber">Bank account number</label>
      <input id="bankAccountNumber" name="bankAccountNumber" />
      <label htmlFor="footerNote">Footer note</label>
      <input
        id="footerNote"
        name="footerNote"
        defaultValue="Services rendered as per agreed contract terms. Thanks, please call again."
      />

      {state && "error" in state ? <p className="error">{state.error}</p> : null}
      <p>
        <button className="btn" type="submit" disabled={pending}>
          {pending ? "Setting up…" : "Complete setup"}
        </button>
      </p>
    </form>
  );
}
