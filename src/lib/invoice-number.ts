// Invoice number helpers — D1: prefix "WSNLI-", counter from 1,
// displayed zero-padded to 4 digits: WSNLI-0001.

export const DEFAULT_INVOICE_PREFIX = "WSNLI-";
export const FIRST_INVOICE_NUMBER = 1;

export function formatInvoiceNo(prefix: string, n: number): string {
  if (!Number.isInteger(n) || n < 1) throw new Error(`Invalid invoice number: ${n}`);
  return `${prefix}${String(n).padStart(4, "0")}`;
}
