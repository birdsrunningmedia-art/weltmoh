"use client";

import { useRef, useState } from "react";
import html2canvas from "html2canvas";
import JSPDF from "jspdf";

import { koboToNaira, formatInvoiceNo, amountInWords } from "@/lib/money";

import Link from "next/link";
import { finalizeInvoice, voidInvoice, deleteDraftInvoice } from "../../../app/invoices/actions";

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
  items: { qtyLabel: string; description: string; rateKobo: number; amountKobo: number }[];
  totalKobo: number;
  isVoid?: boolean;
  voidReason?: string | null;
  canVoid?: boolean;
  canEdit?: boolean;
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
  items,
  totalKobo,
  isVoid,
  voidReason,
  canVoid,
  canEdit,
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
  const totalNaira = koboToNaira(totalKobo);
  const wordsText = amountInWords(totalKobo);

  const safeCustomer = customerName.replace(/[^a-zA-Z0-9_-]/g, "_");
  const fileBaseName = `Invoice-${invoiceDisplayNo}-${safeCustomer}`;

  async function handleFinalize() {
    setActionError(null);
    setFinalizing(true);
    try {
      await finalizeInvoice(id);
      setShowFinalizeModal(false);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to finalize invoice.");
      setFinalizing(false);
    }
  }

  async function handleDeleteDraft() {
    setActionError(null);
    setDeleting(true);
    try {
      await deleteDraftInvoice(id);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to delete draft invoice.");
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
      setActionError(err instanceof Error ? err.message : "Failed to void invoice.");
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
      alert("Could not generate PDF directly. You can use the Print button to Save as PDF.");
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
            <h3 style={{ margin: "0 0 10px", color: "#15803d" }}>Finalize Invoice</h3>
            <p style={{ fontSize: 14, color: "#374151", lineHeight: 1.5 }}>
              Finalizing assigns a <strong>permanent sequential number</strong> (e.g. {prefix}0001) to this invoice, removes the draft watermark, and locks line items from further direct edits.
            </p>
            {actionError && <div className="error" style={{ marginBottom: 12 }}>{actionError}</div>}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 18 }}>
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
            <h3 style={{ margin: "0 0 10px", color: "#b91c1c" }}>Delete Draft Invoice</h3>
            <p style={{ fontSize: 14, color: "#374151", lineHeight: 1.5 }}>
              Are you sure you want to delete this draft invoice? This action cannot be undone.
            </p>
            {actionError && <div className="error" style={{ marginBottom: 12 }}>{actionError}</div>}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 18 }}>
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
            <h3 style={{ margin: "0 0 10px", color: "#b91c1c" }}>Void Finalized Invoice</h3>
            <p style={{ fontSize: 14, color: "#374151", lineHeight: 1.5 }}>
              Voiding permanently cancels this invoice. The number <strong>{invoiceDisplayNo}</strong> will remain recorded in history with your audit reason and will never be reused.
            </p>
            <div style={{ marginTop: 12 }}>
              <label htmlFor="voidReason" style={{ fontWeight: 600, fontSize: 13 }}>
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
            {actionError && <div className="error" style={{ marginBottom: 12 }}>{actionError}</div>}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 18 }}>
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


      {/* Printable Sheet */}
      <div className="invoice-sheet-wrapper">
        <div className="invoice-sheet" ref={containerRef}>
          {/* Watermark */}
          {isVoid ? (
            <div className="invoice-watermark void">
              VOID{voidReason ? ` — ${voidReason}` : ""}
            </div>
          ) : isProvisional ? (
            <div className="invoice-watermark">
              DRAFT — NOT YET FINALIZED
            </div>
          ) : null}

          {/* Header */}
          <div className="invoice-header-row">
            <div className="invoice-brand-col">
              {settings?.logoUrl ? (
                <img
                  src={settings.logoUrl}
                  alt={settings.companyName}
                  style={{ width: 54, height: 54, objectFit: "contain", borderRadius: 8 }}
                />
              ) : (
                <div className="invoice-logo-circle">
                  <span>WELT</span>
                </div>
              )}
              <div>
                <div className="invoice-company-title">
                  {settings?.companyName || "Weltmoh Services Nigeria Ltd"}
                </div>
                <div className="invoice-company-tagline">
                  {settings?.tagline || "Marine Services • Equipment Leasing • General Contract"}
                </div>
              </div>
            </div>

            <div
              className={`invoice-badge-box ${
                isVoid ? "void" : isProvisional ? "draft" : ""
              }`}
            >
              <div className="invoice-badge-title">INVOICE</div>
              <div className="invoice-badge-num">
                {isProvisional ? "DRAFT — PENDING SYNC" : invoiceDisplayNo}
              </div>
            </div>
          </div>

          {/* Office Address & Phone */}
          {(settings?.addressLines || settings?.phone) && (
            <div className="invoice-office-info">
              {settings?.addressLines && <div>{settings.addressLines}</div>}
              {settings?.phone && <div>Tel: {settings.phone}</div>}
            </div>
          )}

          {/* To / Date / L.P.O. Row */}
          <div className="invoice-meta-grid">
            <div className="invoice-meta-box">
              <div className="meta-label">To / Customer:</div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{customerName}</div>
              {customerAddress && <div style={{ color: "#4b5563" }}>{customerAddress}</div>}
              {customerPhone && <div style={{ color: "#4b5563" }}>Tel: {customerPhone}</div>}
            </div>

            <div className="invoice-meta-box">
              <div style={{ marginBottom: 6 }}>
                <span className="meta-label" style={{ display: "inline", marginRight: 6 }}>
                  Date:
                </span>
                <span style={{ fontWeight: 600 }}>{date}</span>
              </div>
              <div>
                <span className="meta-label" style={{ display: "inline", marginRight: 6 }}>
                  L.P.O. No:
                </span>
                <span style={{ fontWeight: 600 }}>{lpoNumber || "—"}</span>
              </div>
            </div>
          </div>

          {/* Invoice Details */}
          <div className="invoice-details-box">
            <div className="invoice-details-header">INVOICE DETAILS</div>
            <div className="invoice-details-body">{invoiceDetails}</div>
          </div>

          {/* Line Items Table */}
          <div className="invoice-table-box">
            <table className="invoice-table">
              <thead>
                <tr>
                  <th style={{ width: 44, textAlign: "center" }}>ITEM</th>
                  <th style={{ width: 90 }}>QTY</th>
                  <th>DESCRIPTION OF SERVICES / WORK DONE</th>
                  <th className="text-right" style={{ width: 120 }}>
                    RATE
                  </th>
                  <th className="text-right" style={{ width: 130 }}>
                    AMOUNT (₦)
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => (
                  <tr key={index}>
                    <td style={{ textAlign: "center", color: "#6b7280" }}>{index + 1}</td>
                    <td>{item.qtyLabel}</td>
                    <td>{item.description}</td>
                    <td className="text-right">{koboToNaira(item.rateKobo)}</td>
                    <td className="text-right" style={{ fontWeight: 600 }}>
                      {koboToNaira(item.amountKobo)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Total Row */}
          <div className="invoice-total-section">
            <div className="invoice-total-box">Total: {totalNaira}</div>
          </div>

          {/* Amount In Words */}
          <div className="invoice-words-box">
            <strong>Amount in words:</strong> {wordsText}
          </div>

          {/* Bank Payment Details */}
          {(settings?.bankName || settings?.bankAccountName || settings?.bankAccountNumber) && (
            <div className="invoice-bank-box">
              <strong style={{ color: "#15803d" }}>Please make payment to:</strong>
              <div style={{ marginTop: 4 }}>
                {settings.bankName && <div>Bank: <strong>{settings.bankName}</strong></div>}
                {settings.bankAccountName && <div>Account Name: <strong>{settings.bankAccountName}</strong></div>}
                {settings.bankAccountNumber && <div>Account Number: <strong>{settings.bankAccountNumber}</strong></div>}
              </div>
            </div>
          )}

          {/* Signatures */}
          <div className="invoice-signatures">
            <div className="invoice-sig-line">Customer&apos;s Sign</div>
            <div className="invoice-sig-line">Manager&apos;s Sign</div>
          </div>

          {/* Footer Note */}
          <div className="invoice-footer-note">
            {settings?.footerNote ||
              "Services rendered as per agreed contract terms. Thanks, please call again."}
          </div>
        </div>
      </div>
    </div>
  );
}