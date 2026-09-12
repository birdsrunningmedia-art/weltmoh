"use client";

import { useRef, useState } from "react";
import html2canvas from "html2canvas";
import JSPDF from "jspdf";

import {
  koboToNaira,
  formatInvoiceNo,
  amountInWords,
  computeTaxBreakdown,
} from "@/lib/money";

import Link from "next/link";
import {
  finalizeInvoice,
  voidInvoice,
  deleteDraftInvoice,
} from "../../../app/invoices/actions";

type BusinessSettingsData = {
  companyName: string;
  tagline: string | null;
  addressLines: string | null;
  phone: string | null;
  logoUrl: string | null;
  footerNote: string | null;
  invoiceNumberPrefix: string;
  bankName: string | null;
  bankAccountName: string | null;
  bankAccountNumber: string | null;
};

export type InvoiceDisplayProps = {
  id: string;
  invoiceNo?: number | null;
  isProvisional: boolean;
  customerName: string;
  customerAddress?: string | null;
  customerPhone?: string | null;
  date: string;
  lpoNumber?: string | null;
  invoiceDetails: string;
  additionalInfo?: string | null;
  taxPercent?: number;
  items: {
    qtyLabel: string;
    description: string;
    rateKobo: number;
    amountKobo: number;
  }[];
  totalKobo: number;
  isVoid?: boolean;
  voidReason?: string | null;
  canVoid?: boolean;
  canEdit?: boolean;
  signatory?: string | null;
  settings: BusinessSettingsData | null;
};

export function InvoiceDisplay({
  id,
  invoiceNo,
  isProvisional,
  customerName,
  customerAddress,
  customerPhone,
  date,
  lpoNumber,
  invoiceDetails,
  additionalInfo,
  taxPercent,
  items,
  totalKobo,
  isVoid,
  voidReason,
  canVoid,
  canEdit,
  signatory,
  settings,
}: InvoiceDisplayProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [exportingPng, setExportingPng] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  // Lifecycle modals & action states
  const [showFinalizeModal, setShowFinalizeModal] = useState(false);
  const [finalizing, setFinalizing] = useState(false);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [showVoidModal, setShowVoidModal] = useState(false);
  const [voiding, setVoiding] = useState(false);
  const [voidReasonInput, setVoidReasonInput] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);

  const prefix = settings?.invoiceNumberPrefix ?? "WSNLI-";
  const invoiceDisplayNo =
    invoiceNo != null ? formatInvoiceNo(prefix, invoiceNo) : "DRAFT";

  const subtotalKobo = items.reduce((sum, it) => sum + it.amountKobo, 0);
  const taxPercentValue =
    typeof taxPercent === "number" && !isNaN(taxPercent)
      ? Math.max(0, Math.min(100, Math.round(taxPercent)))
      : 0;
  const {
    subtotal,
    taxAmount,
    total: computedTotal,
  } = computeTaxBreakdown(subtotalKobo, taxPercentValue);

  // Show total from props if it differs (backward compat), else use computed
  const displayTotalKobo = totalKobo;
  const displaySubtotal = subtotalKobo;
  const displayTax = Math.round(subtotalKobo * (taxPercentValue / 100));

  const totalNaira = koboToNaira(displayTotalKobo);
  const subtotalNaira = koboToNaira(displaySubtotal);
  const taxNaira = koboToNaira(displayTax);
  const wordsText = amountInWords(displayTotalKobo);

  const safeCustomer = customerName.replace(/[^a-zA-Z0-9_-]/g, "_");
  const fileBaseName = `Invoice-${invoiceDisplayNo}-${safeCustomer}`;

  async function handleFinalize() {
    setActionError(null);
    setFinalizing(true);
    try {
      await finalizeInvoice(id);
      setShowFinalizeModal(false);
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Failed to finalize invoice.",
      );
      setFinalizing(false);
    }
  }

  async function handleDeleteDraft() {
    setActionError(null);
    setDeleting(true);
    try {
      await deleteDraftInvoice(id);
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Failed to delete draft invoice.",
      );
      setDeleting(false);
    }
  }

  async function handleVoid() {
    if (!voidReasonInput.trim()) {
      setActionError("A reason is required to void an invoice.");
      return;
    }
    setActionError(null);
    setVoiding(true);
    try {
      await voidInvoice(id, voidReasonInput.trim());
      setShowVoidModal(false);
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Failed to void invoice.",
      );
      setVoiding(false);
    }
  }

  async function handleDownloadPdf() {
    if (!containerRef.current) return;
    setExportingPdf(true);
    try {
      const canvas = await (html2canvas as any)(containerRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new JSPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(`${fileBaseName}.pdf`);
    } catch (err) {
      console.error("PDF export failed:", err);
      alert(
        "Could not generate PDF directly. You can use the Print button to Save as PDF.",
      );
    } finally {
      setExportingPdf(false);
    }
  }

  async function handleDownloadPng() {
    if (!containerRef.current) return;
    setExportingPng(true);
    try {
      const canvas = await (html2canvas as any)(containerRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
      });

      const dataUrl = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.download = `${fileBaseName}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("PNG export failed:", err);
      alert("Could not generate PNG image.");
    } finally {
      setExportingPng(false);
    }
  }

  function handlePrint() {
    window.print();
  }

  async function handleShare() {
    const title = `Invoice ${invoiceDisplayNo} - ${customerName}`;
    const text = `Invoice ${invoiceDisplayNo} for ${customerName} (Total: ${totalNaira})`;
    const url = typeof window !== "undefined" ? window.location.href : "";

    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title, text, url });
        return;
      } catch (err: any) {
        if (err.name === "AbortError") return;
      }
    }

    if (typeof navigator !== "undefined" && navigator.clipboard) {
      await navigator.clipboard.writeText(url);
      setCopyFeedback("Invoice link copied to clipboard!");
      setTimeout(() => setCopyFeedback(null), 3000);
    }
  }

  return (
    <div className="invoice-view-container">
      {/* Action Toolbar */}
      <div className="invoice-toolbar no-print">
        <span className="toolbar-title">
          Invoice: <strong>{invoiceDisplayNo}</strong>
          {isProvisional && (
            <span className="badge draft" style={{ marginLeft: 8 }}>
              DRAFT
            </span>
          )}
          {isVoid && (
            <span className="badge void" style={{ marginLeft: 8 }}>
              VOID
            </span>
          )}
        </span>

        {/* Draft Actions */}
        {isProvisional && !isVoid && (
          <>
            <button
              type="button"
              className="btn"
              style={{ background: "#15803d", fontWeight: 700 }}
              onClick={() => {
                setActionError(null);
                setShowFinalizeModal(true);
              }}
            >
              ✓ Finalize Invoice
            </button>

            {canEdit && (
              <Link href={`/invoices/${id}/edit`} className="btn secondary">
                ✎ Edit Draft
              </Link>
            )}

            <button
              type="button"
              className="btn danger"
              style={{ fontSize: 13 }}
              onClick={() => {
                setActionError(null);
                setShowDeleteModal(true);
              }}
            >
              Delete Draft
            </button>
          </>
        )}

        {/* Void Action for Finalized Invoices */}
        {!isProvisional && !isVoid && canVoid && (
          <button
            type="button"
            className="btn danger"
            onClick={() => {
              setActionError(null);
              setVoidReasonInput("");
              setShowVoidModal(true);
            }}
          >
            Void Invoice
          </button>
        )}

        {/* Output & Sharing */}
        <button
          type="button"
          className="btn secondary"
          onClick={handleDownloadPdf}
          disabled={exportingPdf || exportingPng}
        >
          {exportingPdf ? "Generating PDF…" : "Download PDF"}
        </button>

        <button
          type="button"
          className="btn secondary"
          onClick={handleDownloadPng}
          disabled={exportingPdf || exportingPng}
        >
          {exportingPng ? "Generating PNG…" : "Download Image (PNG)"}
        </button>

        <button
          type="button"
          className="btn secondary"
          onClick={handlePrint}
          disabled={exportingPdf || exportingPng}
        >
          Print Invoice
        </button>

        <button
          type="button"
          className="btn secondary"
          onClick={handleShare}
          disabled={exportingPdf || exportingPng}
        >
          Share
        </button>

        {copyFeedback && (
          <span style={{ fontSize: 13, color: "#15803d", fontWeight: 600 }}>
            {copyFeedback}
          </span>
        )}
      </div>

      {/* Finalize Confirmation Modal */}
      {showFinalizeModal && (
        <div className="modal-backdrop no-print">
          <div className="modal-dialog">
            <h3 style={{ margin: "0 0 10px", color: "#15803d" }}>
              Finalize Invoice
            </h3>
            <p style={{ fontSize: 14, color: "#374151", lineHeight: 1.5 }}>
              Finalizing assigns a <strong>permanent sequential number</strong>{" "}
              (e.g. {prefix}0001) to this invoice, removes the draft watermark,
              and locks line items from further direct edits.
            </p>
            {actionError && (
              <div className="error" style={{ marginBottom: 12 }}>
                {actionError}
              </div>
            )}
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 10,
                marginTop: 18,
              }}
            >
              <button
                type="button"
                className="btn secondary"
                onClick={() => setShowFinalizeModal(false)}
                disabled={finalizing}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn"
                onClick={handleFinalize}
                disabled={finalizing}
              >
                {finalizing ? "Finalizing…" : "Confirm & Finalize"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Draft Modal */}
      {showDeleteModal && (
        <div className="modal-backdrop no-print">
          <div className="modal-dialog">
            <h3 style={{ margin: "0 0 10px", color: "#b91c1c" }}>
              Delete Draft Invoice
            </h3>
            <p style={{ fontSize: 14, color: "#374151", lineHeight: 1.5 }}>
              Are you sure you want to delete this draft invoice? This action
              cannot be undone.
            </p>
            {actionError && (
              <div className="error" style={{ marginBottom: 12 }}>
                {actionError}
              </div>
            )}
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 10,
                marginTop: 18,
              }}
            >
              <button
                type="button"
                className="btn secondary"
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn danger"
                onClick={handleDeleteDraft}
                disabled={deleting}
              >
                {deleting ? "Deleting…" : "Delete Draft"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Void Modal */}
      {showVoidModal && (
        <div className="modal-backdrop no-print">
          <div className="modal-dialog">
            <h3 style={{ margin: "0 0 10px", color: "#b91c1c" }}>
              Void Finalized Invoice
            </h3>
            <p style={{ fontSize: 14, color: "#374151", lineHeight: 1.5 }}>
              Voiding permanently cancels this invoice. The number{" "}
              <strong>{invoiceDisplayNo}</strong> will remain recorded in
              history with your audit reason and will never be reused.
            </p>
            <div style={{ marginTop: 12 }}>
              <label
                htmlFor="voidReason"
                style={{ fontWeight: 600, fontSize: 13 }}
              >
                Reason for voiding *
              </label>
              <textarea
                id="voidReason"
                rows={3}
                placeholder="e.g. Cancelled by customer / Incorrect billing terms"
                value={voidReasonInput}
                onChange={(e) => setVoidReasonInput(e.target.value)}
                required
                style={{ marginTop: 4, width: "100%", padding: 8 }}
              />
            </div>
            {actionError && (
              <div className="error" style={{ marginBottom: 12 }}>
                {actionError}
              </div>
            )}
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 10,
                marginTop: 18,
              }}
            >
              <button
                type="button"
                className="btn secondary"
                onClick={() => setShowVoidModal(false)}
                disabled={voiding}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn danger"
                onClick={handleVoid}
                disabled={voiding || !voidReasonInput.trim()}
              >
                {voiding ? "Voiding…" : "Confirm Void"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Printable Sheet - Matches HTML Template */}
      <div
        ref={containerRef}
        style={{
          width: "100%",
          maxWidth: "100%",
          margin: "0 auto",
          padding: "32px",
          backgroundColor: "#fff",
          fontFamily: "Inter, system-ui, sans-serif",
        }}
      >
        {/* Watermark */}
        {isVoid && (
          <div
            style={{
              position: "fixed",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%) rotate(-45deg)",
              fontSize: "72px",
              fontWeight: 700,
              color: "rgba(220, 38, 38, 0.1)",
              pointerEvents: "none",
              zIndex: 0,
            }}
          >
            VOID{voidReason ? ` — ${voidReason}` : ""}
          </div>
        )}
        {isProvisional && (
          <div
            style={{
              position: "fixed",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%) rotate(-45deg)",
              fontSize: "72px",
              fontWeight: 700,
              color: "rgba(21, 128, 61, 0.1)",
              pointerEvents: "none",
              zIndex: 0,
            }}
          >
            DRAFT — NOT YET FINALIZED
          </div>
        )}

        {/* Header Section */}
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            flexWrap: "wrap",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "32px",
            marginBottom: "32px",
          }}
        >
          {/* Logo & Company Info */}
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              gap: "32px",
              alignItems: "center",
              flex: "1 1 420px",
              minWidth: 0,
            }}
          >
            <div style={{ flexShrink: 0, width: "153px", height: "155px" }}>
              {settings?.logoUrl ? (
                <img
                  src={settings.logoUrl}
                  alt="Company Logo"
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "contain",
                  }}
                />
              ) : (
                <img
                  src="/logo.svg"
                  alt={settings?.companyName || "Weltmoh"}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "contain",
                    maxWidth: "153px",
                    maxHeight: "155px",
                  }}
                />
              )}
            </div>
            <div>
              <h1
                style={{
                  fontSize: "36px",
                  fontWeight: 700,
                  color: "#15803d",
                  margin: "0",
                  lineHeight: "1.2",
                }}
              >
                {settings?.companyName || "Weltmoh Services Nigeria Ltd"}
              </h1>
              <p
                style={{
                  fontSize: "20px",
                  fontWeight: 700,
                  color: "#15803d",
                  margin: "8px 0 0",
                }}
              >
                {settings?.tagline ||
                  "Marine Services • Equipment Leasing • Procurement"}
              </p>
            </div>
          </div>

          {/* Invoice Badge */}
          <div
            style={{
              backgroundColor: "#15803d",
              borderRadius: "16px",
              padding: "16px 32px",
              color: "#fff",
              textAlign: "right",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              gap: "16px",
            }}
          >
            <div style={{ fontSize: "24px", fontWeight: 700, lineHeight: 1 }}>
              INVOICE
            </div>
            <div style={{ fontSize: "24px", fontWeight: 700, lineHeight: 1 }}>
              {isProvisional ? "DRAFT" : invoiceDisplayNo}
            </div>
          </div>
        </div>

        {/* Billed By / Billed To / Issue Date Row */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "24px",
            marginBottom: "32px",
          }}
        >
          {/* Billed By */}
          <div
            style={{
              backgroundColor: "#15803d1a",
              borderRadius: "16px",
              padding: "16px",
              flex: "1 1 280px",
              minWidth: 0,
            }}
          >
            <h3
              style={{
                fontSize: "24px",
                fontWeight: 700,
                color: "#15803d",
                margin: "0 0 8px",
                textDecoration: "underline",
                textUnderlineOffset: "4px",
              }}
            >
              Billed by:
            </h3>
            <p
              style={{
                fontSize: "18px",
                fontWeight: 400,
                margin: "0",
                color: "#000",
              }}
            >
              {settings?.companyName || "Weltmoh Services Nigeria Limited."}
            </p>
            <p
              style={{
                fontSize: "18px",
                fontWeight: 400,
                margin: "0",
                color: "#000",
              }}
            >
              {settings?.addressLines ||
                "28 Warri Sapele Road, Warri Boatyard, Warri Delta State."}
            </p>
            <p
              style={{
                fontSize: "18px",
                fontWeight: 400,
                margin: "0",
                color: "#000",
              }}
            >
              07052883191, 08102347354
            </p>
          </div>

          {/* Billed To */}
          <div
            style={{
              backgroundColor: "#15803d1a",
              borderRadius: "16px",
              padding: "16px",
              flex: "1 1 280px",
              minWidth: 0,
            }}
          >
            <h3
              style={{
                fontSize: "24px",
                fontWeight: 700,
                color: "#15803d",
                margin: "0 0 8px",
                textDecoration: "underline",
                textUnderlineOffset: "4px",
              }}
            >
              Billed to:
            </h3>
            <p
              style={{
                fontSize: "20px",
                fontWeight: 400,
                margin: "0",
                color: "#000",
              }}
            >
              {customerName}
            </p>
            <p
              style={{
                fontSize: "20px",
                fontWeight: 400,
                margin: "0",
                color: "#000",
              }}
            >
              {customerAddress || ""}
            </p>
          </div>

          {/* Issue Date */}
          <div style={{ flex: "0 1 220px", minWidth: 0 }}>
            <h3
              style={{
                fontSize: "24px",
                fontWeight: 700,
                color: "#000",
                margin: "0 0 8px",
              }}
            >
              Issue Date:
            </h3>
            <p
              style={{
                fontSize: "20px",
                fontWeight: 400,
                margin: "0",
                color: "#000",
              }}
            >
              {date}
            </p>
          </div>
        </div>

        {/* Invoice Details Box */}
        <div
          style={{
            backgroundColor: "#15803d1a",
            borderRadius: "16px",
            padding: "16px",
            marginBottom: "32px",
          }}
        >
          <h3
            style={{
              fontSize: "24px",
              fontWeight: 700,
              color: "#15803d",
              margin: "0 0 8px",
              textDecoration: "underline",
              textUnderlineOffset: "4px",
            }}
          >
            Invoice Details:
          </h3>
          <p
            style={{
              fontSize: "16px",
              fontWeight: 400,
              margin: "0",
              color: "#000",
              lineHeight: "1.5",
            }}
          >
            {invoiceDetails}
          </p>
        </div>

        {/* Additional Details Box (if present) */}
        {additionalInfo && additionalInfo.trim().length > 0 && (
          <div
            style={{
              backgroundColor: "#15803d1a",
              borderRadius: "16px",
              padding: "16px",
              marginBottom: "32px",
            }}
          >
            <h3
              style={{
                fontSize: "24px",
                fontWeight: 700,
                color: "#15803d",
                margin: "0 0 8px",
                textDecoration: "underline",
                textUnderlineOffset: "4px",
              }}
            >
              Additional Details:
            </h3>
            <p
              style={{
                fontSize: "16px",
                fontWeight: 400,
                margin: "0",
                color: "#000",
                lineHeight: "1.5",
              }}
            >
              {additionalInfo.trim()}
            </p>
          </div>
        )}

        {/* Line Items Table */}
        <div
          style={{
            backgroundColor: "#e8f3ec",
            borderRadius: "16px",
            borderBottom: "4px solid #15803d",
            overflow: "hidden",
            marginBottom: "32px",
          }}
        >
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "16px",
            }}
          >
            <thead>
              <tr style={{ backgroundColor: "#15803d", color: "#fff" }}>
                <th
                  style={{
                    padding: "15px 8px",
                    textAlign: "center",
                    fontWeight: 700,
                    fontSize: "24px",
                    color: "#fff",
                  }}
                >
                  ITEM
                </th>
                <th
                  style={{
                    padding: "15px 8px",
                    textAlign: "left",
                    fontWeight: 700,
                    fontSize: "24px",
                    color: "#fff",
                  }}
                >
                  QTY
                </th>
                <th
                  style={{
                    padding: "15px 8px",
                    textAlign: "left",
                    fontWeight: 700,
                    fontSize: "24px",
                    color: "#fff",
                  }}
                >
                  DESCRIPTION OF SERVICE / WORK DONE
                </th>
                <th
                  style={{
                    padding: "15px 8px",
                    textAlign: "right",
                    fontWeight: 700,
                    fontSize: "24px",
                    color: "#fff",
                  }}
                >
                  RATE
                </th>
                <th
                  style={{
                    padding: "15px 8px",
                    textAlign: "right",
                    fontWeight: 700,
                    fontSize: "24px",
                    color: "#fff",
                  }}
                >
                  AMOUNT
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={index}>
                  <td
                    style={{
                      padding: "12px 8px",
                      textAlign: "center",
                      color: "#374151",
                      backgroundColor: "#f0fdf4",
                      border: "1px solid #d1d5db",
                    }}
                  >
                    {index + 1}
                  </td>

                  <td
                    style={{
                      padding: "12px 8px",
                      textAlign: "center",
                      color: "#374151",
                      backgroundColor: "#f0fdf4",
                      border: "1px solid #d1d5db",
                    }}
                  >
                    {item.qtyLabel}
                  </td>

                  <td
                    style={{
                      padding: "12px 8px",
                      textAlign: "left",
                      color: "#1f2937",
                      backgroundColor: "#f0fdf4",
                      border: "1px solid #d1d5db",
                    }}
                  >
                    {item.description}
                  </td>

                  <td
                    style={{
                      padding: "12px 8px",
                      textAlign: "right",
                      color: "#1f2937",
                      backgroundColor: "#f0fdf4",
                      border: "1px solid #d1d5db",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {koboToNaira(item.rateKobo)}
                  </td>

                  <td
                    style={{
                      padding: "12px 8px",
                      textAlign: "right",
                      color: "#111827",
                      backgroundColor: "#f0fdf4",
                      fontWeight: 600,
                      border: "1px solid #d1d5db",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {koboToNaira(item.amountKobo)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals & Bank Info Section */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "32px",
            marginBottom: "32px",
          }}
        >
          {/* Bank Details */}
          <div
            style={{
              backgroundColor: "#e8f3ec",
              borderRadius: "16px",
              padding: "16px",
              flex: "1 1 260px",
              minWidth: 0,
            }}
          >
            <div style={{ marginBottom: "24px" }}>
              <p
                style={{
                  fontSize: "24px",
                  fontWeight: 700,
                  color: "#15803d",
                  margin: "0 0 8px",
                  textDecoration: "underline",
                  textUnderlineOffset: "4px",
                }}
              >
                Bank Name:
              </p>
              <p
                style={{
                  fontSize: "20px",
                  fontWeight: 400,
                  margin: "0",
                  color: "#000",
                }}
              >
                {settings?.bankName || "Union Bank"}
              </p>
            </div>
            <div style={{ marginBottom: "24px" }}>
              <p
                style={{
                  fontSize: "24px",
                  fontWeight: 700,
                  color: "#15803d",
                  margin: "0 0 8px",
                  textDecoration: "underline",
                  textUnderlineOffset: "4px",
                }}
              >
                Account Name:
              </p>
              <p
                style={{
                  fontSize: "20px",
                  fontWeight: 400,
                  margin: "0",
                  color: "#000",
                }}
              >
                {settings?.bankAccountName || "WELTMORE SERVICES NIGERIA LTD"}
              </p>
            </div>
            <div>
              <p
                style={{
                  fontSize: "24px",
                  fontWeight: 700,
                  color: "#15803d",
                  margin: "0 0 8px",
                  textDecoration: "underline",
                  textUnderlineOffset: "4px",
                }}
              >
                Account Number:
              </p>
              <p
                style={{
                  fontSize: "20px",
                  fontWeight: 400,
                  margin: "0",
                  color: "#000",
                }}
              >
                {settings?.bankAccountNumber || "0011223344"}
              </p>
            </div>
          </div>

          {/* Amount in Words & Signatures */}
          <div
            style={{
              flex: "2 1 320px",
              minWidth: 0,
              display: "flex",
              flexDirection: "column",
              gap: "24px",
            }}
          >
            <div
              style={{
                backgroundColor: "#e8f3ec",
                borderRadius: "16px",
                padding: "16px",
              }}
            >
              <p
                style={{
                  fontSize: "24px",
                  fontWeight: 700,
                  color: "#15803d",
                  margin: "0",
                  textDecoration: "underline",
                  textUnderlineOffset: "4px",
                }}
              >
                Amount in words:
              </p>
              <p
                style={{
                  fontSize: "16px",
                  fontWeight: 400,
                  margin: "8px 0 0",
                  color: "#000",
                }}
              >
                {wordsText}
              </p>
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: "24px" }}>
              <div style={{ flex: "1 1 180px", minWidth: 0 }}>
                <div style={{ minHeight: "61px", marginBottom: "8px" }} />
                <div style={{ borderTop: "2px solid #000", paddingTop: "8px" }}>
                  <p
                    style={{
                      fontSize: "16px",
                      fontWeight: 700,
                      margin: "0",
                      color: "#000",
                    }}
                  >
                    Customer's Signature
                  </p>
                </div>
              </div>
              <div style={{ flex: "1 1 180px", minWidth: 0 }}>
                <div style={{ minHeight: "61px", marginBottom: "8px" }}>
                  {signatory && (
                    <img
                      src={`/signature-${signatory}.png`}
                      alt={`${signatory === "owner" ? "Owner" : "Manager"}'s Signature`}
                      style={{
                        maxHeight: "60px",
                        maxWidth: "100%",
                        objectFit: "contain",
                      }}
                    />
                  )}
                </div>
                <div style={{ borderTop: "2px solid #000", paddingTop: "8px" }}>
                  <p
                    style={{
                      fontSize: "16px",
                      fontWeight: 700,
                      margin: "0",
                      color: "#000",
                    }}
                  >
                    Manager's Signature
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Totals Box */}
          <div
            style={{
              backgroundColor: "#e8f3ec",
              borderTop: "4px solid #15803d",
              borderRadius: "16px",
              
              flex: "1 1 280px",
              minWidth: 0,
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
          >
            <div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "24px",
                  padding: "16px",
                }}
              >
                <span
                  style={{ fontSize: "20px", fontWeight: 400, color: "#000" }}
                >
                  Subtotal
                </span>
                <span
                  style={{ fontSize: "20px", fontWeight: 700, color: "#000" }}
                >
                  {subtotalNaira}
                </span>
              </div>
              {taxPercentValue > 0 && (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: "24px",
                    padding: "16px",
                  }}
                >
                  <span
                    style={{ fontSize: "20px", fontWeight: 400, color: "#000" }}
                  >
                    Tax({taxPercentValue}%)
                  </span>
                  <span
                    style={{ fontSize: "20px", fontWeight: 700, color: "#000" }}
                  >
                    {taxNaira}
                  </span>
                </div>
              )}
            </div>
            <div
              style={{
                backgroundColor: "#15803d",
                color: "#fff",
                padding: "16px",
                display: "flex",
                justifyContent: "space-between",
                borderRadius: "0 0 16px 16px"
              }}
            >
              <span style={{ fontSize: "24px", fontWeight: 800 }}>Total</span>
              <span style={{ fontSize: "24px", fontWeight: 800 }}>
                {totalNaira}
              </span>
            </div>
          </div>
        </div>

        {/* Footer Note */}
        <p
          style={{
            fontSize: "20px",
            fontWeight: 400,
            color: "#15803d",
            margin: "0",
            textAlign: "center",
          }}
        >
          {settings?.footerNote ||
            "Services rendered as per agreed contract terms"}
        </p>
      </div>
    </div>
  );
}
