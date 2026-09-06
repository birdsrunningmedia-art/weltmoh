"use client";

import { useEffect, useState } from "react";

// Foundation placeholder: shows last successful sync time.
// The sync job itself lands in Bucket 4. Reads via API so no
// node/SQLite code is ever bundled into the browser.
export function SyncBadge() {
  const [last, setLast] = useState<string | null>(null);
  useEffect(() => {
    fetch("/api/sync-status")
      .then((r) => r.json())
      .then((d) => setLast(d.lastSyncAt ?? null))
      .catch(() => setLast(null));
  }, []);
  return (
    <span className="syncbar" title="Sync status (full sync lands in Bucket 4)">
      ● {last ? `Synced ${last}` : "Not synced yet"}
    </span>
  );
}
