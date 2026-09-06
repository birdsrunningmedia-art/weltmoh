"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SyncBadge } from "./SyncBadge";

const LINKS = [
  { href: "/", label: "Dashboard" },
  { href: "/invoices", label: "Invoices" },
  { href: "/customers", label: "Customers" },
  { href: "/settings", label: "Settings" },
];

export function SiteNav() {
  const path = usePathname();
  if (path === "/login" || path === "/setup") return null;
  return (
    <aside className="sidebar">
      <div className="brand">
        Weltmoh
        <br />
        <small style={{ fontSize: 11, color: "#6b7280" }}>Invoicing</small>
      </div>
      {LINKS.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          className={path === l.href ? "navlink active" : "navlink"}
        >
          <span className="label">{l.label}</span>
        </Link>
      ))}
      <div style={{ marginTop: "auto", padding: "8px" }}>
        <SyncBadge />
      </div>
    </aside>
  );
}
