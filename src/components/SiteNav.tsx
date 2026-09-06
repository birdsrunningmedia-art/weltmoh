"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function SiteNav() {
  const pathname = usePathname();
  const [syncing, setSyncing] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/sync-status")
      .then((res) => res.json())
      .then((data) => {
        if (data?.lastSyncAt) setLastSyncAt(data.lastSyncAt);
      })
      .catch(() => {});
  }, []);

  async function handleSyncNow() {
    setSyncing(true);
    setSyncMessage(null);
    try {
      const res = await fetch("/api/sync", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setLastSyncAt(data.timestamp);
        setSyncMessage("Synced to Neon!");
        setTimeout(() => setSyncMessage(null), 4000);
      } else {
        setSyncMessage(data.error ? `Error: ${data.error.slice(0, 30)}` : "Sync failed");
      }
    } catch {
      setSyncMessage("Network error");
    } finally {
      setSyncing(false);
    }
  }

  function formatTime(iso: string | null) {
    if (!iso) return "Never";
    try {
      return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch {
      return iso;
    }
  }

  return (
    <aside className="sidebar">
      <div className="brand">
        Weltmoh<br />
        <small style={{ fontSize: 11, color: "#6b7280" }}>Invoicing</small>
      </div>
      <nav style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <Link href="/" className={`navlink ${pathname === "/" ? "active" : ""}`}>
          Dashboard
        </Link>
        <Link
          href="/customers"
          className={`navlink ${pathname.startsWith("/customers") ? "active" : ""}`}
        >
          Customers
        </Link>
        <Link
          href="/invoices"
          className={`navlink ${pathname.startsWith("/invoices") ? "active" : ""}`}
        >
          Invoices
        </Link>
        <Link
          href="/settings"
          className={`navlink ${pathname.startsWith("/settings") ? "active" : ""}`}
        >
          Settings
        </Link>
      </nav>

      {/* Neon Cloud Sync Widget */}
      <div
        style={{
          marginTop: "auto",
          padding: "12px 10px",
          background: "#f9fafb",
          border: "1px solid var(--border)",
          borderRadius: 8,
          fontSize: 12,
        }}
      >
        <div style={{ fontWeight: 700, color: "#15803d", marginBottom: 4, display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#15803d", display: "inline-block" }}></span>
          Neon Cloud
        </div>
        <div style={{ color: "#6b7280", marginBottom: 8, fontSize: 11 }}>
          Last sync: <strong>{formatTime(lastSyncAt)}</strong>
        </div>
        <button
          type="button"
          onClick={handleSyncNow}
          disabled={syncing}
          className="btn secondary"
          style={{
            width: "100%",
            padding: "5px 8px",
            fontSize: 12,
            textAlign: "center",
          }}
        >
          {syncing ? "Syncing…" : "⚡ Sync Now"}
        </button>
        {syncMessage && (
          <div
            style={{
              marginTop: 6,
              fontSize: 11,
              color: syncMessage.includes("Error") ? "#dc2626" : "#15803d",
              fontWeight: 600,
              textAlign: "center",
            }}
          >
            {syncMessage}
          </div>
        )}
      </div>
    </aside>
  );
}