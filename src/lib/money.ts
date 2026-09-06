// Money helpers — D11: users see NAIRA only. Storage is integer kobo.
// Never use floats for money math; parse/format at the boundaries.

const NAIRA_FORMAT = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  minimumFractionDigits: 2,
});

/** Parse a Naira string ("12,500.00", "₦12500") into integer kobo. */
export function nairaToKobo(input: string): number {
  const cleaned = input.replace(/[₦,\s]/g, "").trim();
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) {
    throw new Error(`Invalid Naira amount: "${input}"`);
  }
  const [naira, kobo = ""] = cleaned.split(".");
  return Number(naira) * 100 + Number((kobo + "00").slice(0, 2));
}

/** Format integer kobo as Naira (₦12,500.00). */
export function koboToNaira(kobo: number): string {
  if (!Number.isInteger(kobo) || kobo < 0) throw new Error(`Invalid kobo value: ${kobo}`);
  return NAIRA_FORMAT.format(kobo / 100);
}

/** Sum integer kobo amounts (throws on non-integers). */
export function sumKobo(amounts: number[]): number {
  let total = 0;
  for (const a of amounts) {
    if (!Number.isInteger(a) || a < 0) throw new Error(`Invalid kobo amount: ${a}`);
    total += a;
  }
  return total;
}
