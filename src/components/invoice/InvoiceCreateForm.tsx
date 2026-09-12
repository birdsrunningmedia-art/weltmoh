"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { nairaToKobo, koboToNaira } from "@/lib/money";
import { createInvoice } from "../../../app/invoices/actions";

type Customer = { id: string; name: string };

type LineItem = {
  qtyLabel: string;
  description: string;
  rateNaira: string;
  amountNaira: string;
};

function emptyItem(): LineItem {
  return { qtyLabel: "", description: "", rateNaira: "", amountNaira: "" };
}

function parseNairaInput(value: string): number {
  const trimmed = value.trim();
  if (trimmed === "") return 0;
  return nairaToKobo(trimmed);
}

export function InvoiceCreateForm({ customers }: { customers: Customer[] }) {
  const router = useRouter();

  const [customerId, setCustomerId] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [lpoNumber, setLpoNumber] = useState("");
  const [invoiceDetails, setInvoiceDetails] = useState("");
  const [additionalInfo, setAdditionalInfo] = useState("");
  const [taxPercent, setTaxPercent] = useState("0");
  const [signatory, setSignatory] = useState<"owner" | "manager" | "">("")
  const [items, setItems] = useState<LineItem[]>([emptyItem()]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function updateItem(index: number, field: keyof LineItem, value: string) {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)),
    );
  }

  function addItem() {
    setItems((prev) => [...prev, emptyItem()]);
  }

  function removeItem(index: number) {
    setItems((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((_, i) => i !== index);
    });
  }

  // Running total (kobo) — computed from amount fields, tolerant of parse errors
  function computeTotalKobo(): number {
    let total = 0;
    for (const item of items) {
      try {
        total += parseNairaInput(item.amountNaira);
      } catch {
        // skip unparseable amounts for live total
      }
    }
    return total;
  }

  const totalKobo = computeTotalKobo();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      // Convert Naira string inputs to kobo
      const parsedItems = items.map((item, i) => {
        if (!item.qtyLabel.trim()) throw new Error(`Line item ${i + 1}: Qty label is required.`);
        if (!item.description.trim()) throw new Error(`Line item ${i + 1}: Description is required.`);
        return {
          qtyLabel: item.qtyLabel.trim(),
          description: item.description.trim(),
          rateKobo: parseNairaInput(item.rateNaira),
          amountKobo: parseNairaInput(item.amountNaira),
        };
      });

      await createInvoice({
        customerId,
        date,
        lpoNumber,
        invoiceDetails,
        additionalInfo: additionalInfo.trim() || undefined,
        taxPercent: Number(taxPercent) || 0,
        signatory: signatory as "owner" | "manager",
        items: parsedItems,
      });
      // Server Action redirects on success — if we reach here, navigate manually
      router.push("/invoices");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create invoice.");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {error && (
        <div className="error-banner" style={{ color: "#dc2626", background: "#fef2f2", padding: "8px 12px", borderRadius: 6, marginBottom: 16, border: "1px solid #fecaca" }}>
          {error}
        </div>
      )}

      {/* Customer */}
      <div style={{ marginBottom: 12 }}>
        <label htmlFor="customerId">Customer *</label>
        <select
          id="customerId"
          name="customerId"
          value={customerId}
          onChange={(e) => setCustomerId(e.target.value)}
          required
          style={{ display: "block", width: "100%", padding: "6px 8px", marginTop: 4 }}
        >
          <option value="">— Select customer —</option>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {/* Date */}
      <div style={{ marginBottom: 12 }}>
        <label htmlFor="invoiceDate">Date *</label>
        <input
          id="invoiceDate"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
          style={{ display: "block", width: "100%", padding: "6px 8px", marginTop: 4 }}
        />
      </div>

      {/* LPO */}
      <div style={{ marginBottom: 12 }}>
        <label htmlFor="lpoNumber">L.P.O. Number (optional)</label>
        <input
          id="lpoNumber"
          type="text"
          value={lpoNumber}
          onChange={(e) => setLpoNumber(e.target.value)}
          style={{ display: "block", width: "100%", padding: "6px 8px", marginTop: 4 }}
        />
      </div>

      {/* Invoice Details */}
      <div style={{ marginBottom: 12 }}>
        <label htmlFor="invoiceDetails">Invoice Details *</label>
        <textarea
          id="invoiceDetails"
          value={invoiceDetails}
          onChange={(e) => setInvoiceDetails(e.target.value)}
          required
          rows={3}
          style={{ display: "block", width: "100%", padding: "6px 8px", marginTop: 4 }}
        />
      </div>

      {/* Additional Info */}
      <div style={{ marginBottom: 12 }}>
        <label htmlFor="additionalInfo">Additional Information (optional)</label>
        <textarea
          id="additionalInfo"
          value={additionalInfo}
          onChange={(e) => setAdditionalInfo(e.target.value)}
          rows={2}
          style={{ display: "block", width: "100%", padding: "6px 8px", marginTop: 4 }}
        />
      </div>

      {/* Tax Percent */}
      <div style={{ marginBottom: 12 }}>
        <label htmlFor="taxPercent">Tax Percent (%)</label>
        <input
          id="taxPercent"
          type="number"
          min={0}
          max={100}
          value={taxPercent}
          onChange={(e) => setTaxPercent(e.target.value)}
          style={{ display: "block", width: "100%", padding: "6px 8px", marginTop: 4 }}
        />
      </div>

      {/* Signatory */}
      <div style={{ marginBottom: 12 }}>
        <label htmlFor="signatory">Signatory *</label>
        <select
          id="signatory"
          name="signatory"
          value={signatory}
          onChange={(e) => setSignatory(e.target.value as "owner" | "manager" | "")}
          required
          style={{ display: "block", width: "100%", padding: "6px 8px", marginTop: 4 }}
        >
          <option value="">— Select signatory —</option>
          <option value="owner">Owner</option>
          <option value="manager">Manager</option>
        </select>
      </div>

      {/* Line Items */}
      <fieldset style={{ border: "1px solid #d1d5db", borderRadius: 6, padding: 12, marginBottom: 16 }}>
        <legend style={{ fontWeight: 600 }}>Line Items</legend>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left", padding: "4px 6px", fontSize: 13 }}>Qty</th>
              <th style={{ textAlign: "left", padding: "4px 6px", fontSize: 13 }}>Description</th>
              <th style={{ textAlign: "right", padding: "4px 6px", fontSize: 13 }}>Rate (₦)</th>
              <th style={{ textAlign: "right", padding: "4px 6px", fontSize: 13 }}>Amount (₦)</th>
              <th style={{ width: 40 }}></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => (
              <tr key={i}>
                <td style={{ padding: "4px 4px" }}>
                  <input
                    type="text"
                    placeholder='e.g. "14 days"'
                    value={item.qtyLabel}
                    onChange={(e) => updateItem(i, "qtyLabel", e.target.value)}
                    required
                    style={{ width: "100%", padding: "4px 6px" }}
                  />
                </td>
                <td style={{ padding: "4px 4px" }}>
                  <input
                    type="text"
                    placeholder="Description of work"
                    value={item.description}
                    onChange={(e) => updateItem(i, "description", e.target.value)}
                    required
                    style={{ width: "100%", padding: "4px 6px" }}
                  />
                </td>
                <td style={{ padding: "4px 4px" }}>
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="0.00"
                    value={item.rateNaira}
                    onChange={(e) => updateItem(i, "rateNaira", e.target.value)}
                    style={{ width: 100, padding: "4px 6px", textAlign: "right" }}
                  />
                </td>
                <td style={{ padding: "4px 4px" }}>
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="0.00"
                    value={item.amountNaira}
                    onChange={(e) => updateItem(i, "amountNaira", e.target.value)}
                    required
                    style={{ width: 100, padding: "4px 6px", textAlign: "right" }}
                  />
                </td>
                <td style={{ padding: "4px 4px", textAlign: "center" }}>
                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeItem(i)}
                      title="Remove item"
                      style={{ background: "none", border: "none", color: "#dc2626", cursor: "pointer", fontSize: 16 }}
                    >
                      ✕
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <button
          type="button"
          onClick={addItem}
          style={{ marginTop: 8, fontSize: 13, cursor: "pointer" }}
        >
          + Add line item
        </button>
      </fieldset>

      {/* Running total */}
      <div style={{ textAlign: "right", fontWeight: 700, fontSize: 18, marginBottom: 16 }}>
        Total: {totalKobo > 0 ? koboToNaira(totalKobo) : "₦0.00"}
      </div>

      {/* Submit */}
      <div style={{ display: "flex", gap: 12 }}>
        <button
          type="submit"
          disabled={submitting}
          className="btn"
          style={{ padding: "10px 24px" }}
        >
          {submitting ? "Saving…" : "Save Invoice (Draft)"}
        </button>
        <a href="/invoices" className="btn secondary" style={{ padding: "10px 24px" }}>
          Cancel
        </a>
      </div>
    </form>
  );
}
