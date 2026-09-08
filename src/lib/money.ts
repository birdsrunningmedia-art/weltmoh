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

/** Format invoice number with prefix, e.g. WSNLI-0001. */
export function formatInvoiceNo(prefix: string, n: number): string {
  if (!Number.isInteger(n) || n < 1) throw new Error(`Invalid invoice number: ${n}`);
  return `${prefix}${String(n).padStart(4, "0")}`;
}

/** Compute subtotal, tax amount (in kobo) and total with tax given items subtotal and percent. */
export function computeTaxBreakdown(subtotalKobo: number, taxPercent: number): { subtotal: number; taxAmount: number; total: number } {
  if (!Number.isInteger(subtotalKobo) || subtotalKobo < 0) throw new Error(`Invalid subtotal: ${subtotalKobo}`);
  if (taxPercent < 0 || taxPercent > 100) throw new Error(`Invalid tax percent: ${taxPercent}`);
  const taxAmount = Math.round(subtotalKobo * (taxPercent / 100));
  const total = subtotalKobo + taxAmount;
  return { subtotal: subtotalKobo, taxAmount, total };
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

const ONES = [
  "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
  "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
  "Seventeen", "Eighteen", "Nineteen",
];

const TENS = [
  "", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety",
];

function chunkToWords(num: number): string {
  const parts: string[] = [];
  const hundred = Math.floor(num / 100);
  const remainder = num % 100;

  if (hundred > 0) {
    parts.push(`${ONES[hundred]} Hundred`);
  }

  if (remainder > 0) {
    if (remainder < 20) {
      parts.push(ONES[remainder]);
    } else {
      const ten = Math.floor(remainder / 10);
      const unit = remainder % 10;
      parts.push(unit > 0 ? `${TENS[ten]}-${ONES[unit]}` : TENS[ten]);
    }
  }

  return parts.join(" ");
}

/** Convert integer kobo amount into words in Naira (e.g. Twelve Thousand Naira Only). */
export function amountInWords(kobo: number): string {
  if (!Number.isInteger(kobo) || kobo < 0) {
    throw new Error(`Invalid kobo value: ${kobo}`);
  }

  if (kobo === 0) {
    return "Zero Naira Only";
  }

  const naira = Math.floor(kobo / 100);
  const remainingKobo = kobo % 100;

  const scales: { value: number; label: string }[] = [
    { value: 1_000_000_000, label: "Billion" },
    { value: 1_000_000, label: "Million" },
    { value: 1_000, label: "Thousand" },
    { value: 1, label: "" },
  ];

  let remainingNaira = naira;
  const words: string[] = [];

  for (const scale of scales) {
    if (remainingNaira >= scale.value) {
      const chunk = Math.floor(remainingNaira / scale.value);
      remainingNaira %= scale.value;
      const chunkWord = chunkToWords(chunk);
      if (chunkWord) {
        words.push(scale.label ? `${chunkWord} ${scale.label}` : chunkWord);
      }
    }
  }

  const nairaPart = words.length > 0 ? `${words.join(" ")} Naira` : "";
  const koboPart = remainingKobo > 0 ? `${chunkToWords(remainingKobo)} Kobo` : "";

  if (nairaPart && koboPart) {
    return `${nairaPart} and ${koboPart} Only`;
  }
  if (nairaPart) {
    return `${nairaPart} Only`;
  }
  return `${koboPart} Only`;
}