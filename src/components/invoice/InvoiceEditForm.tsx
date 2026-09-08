"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { nairaToKobo, koboToNaira } from "@/lib/money";
import { updateInvoice } from "../../../app/invoices/actions";

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

export type InvoiceEditFormProps = {
  invoiceId: string;
  customers: Customer[];
  initialData: {
    customerId: string;
    date: string;
    lpoNumber: string;
    invoiceDetails: string;
    additionalInfo?: string;
    taxPercent?: number;
    items: LineItem[];
  };
};

export function InvoiceEditForm({
  invoiceId,
  customers,
  initialData,
}: InvoiceEditFormProps) {
  const router = useRouter();

  const [customerId, setCustomerId] = useState(initialData.customerId);
  const [date, setDate] = useState(initialData.date);
  const [lpoNumber, setLpoNumber] = useState(initialData.lpoNumber);
  const [invoiceDetails, setInvoiceDetails] = useState(initialData.invoiceDetails);
  const [additionalInfo, setAdditionalInfo] = useState(initialData.additionalInfo || "");
  const [taxPercent, setTaxPercent] = useState(String(initialData.taxPercent ?? 0));
  const [items, setItems] = useState<LineItem[]>(
    initialData.items.length > 0 ? initialData.items : [emptyItem()],
  );
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

  function computeTotalKobo(): number {
    let total = 0;
    for (const item of items) {
      try {
        total += parseNairaInput(item.amountNaira);
      } catch {
        // ignore parse error during typing
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

      await updateInvoice(invoiceId, {
        customerId,
        date,
        lpoNumber,
        invoiceDetails,
        additionalInfo: additionalInfo.trim() || undefined,
        taxPercent: Number(taxPercent) || 0,
        items: parsedItems,
      });

      router.push(`/invoices/${invoiceId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update invoice.");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {error && (
        <div
          className="error-banner"
          style={{
            color: "#dc2626",
            background: "#fef2f2",
            padding: "8px 12px",
            borderRadius: 6,
            marginBottom: 16,
            border: "1px solid #fecaca",
          }}
        >
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
          {submitting ? "Saving…" : "Save Changes"}
        </button>
        <Link href={`/invoices/${invoiceId}`} className="btn secondary" style={{ padding: "10px 24px" }}>
          Cancel
        </Link>
      </div>
    </form>
  );
}
