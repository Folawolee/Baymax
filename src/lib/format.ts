const numberFormatter = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });
const currencyFormatter = new Intl.NumberFormat("en-US", { style: "currency", currency: "NGN", currencyDisplay: "narrowSymbol" });
const compactNumberFormatter = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });
const compactCurrencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "NGN",
  currencyDisplay: "narrowSymbol",
  notation: "compact",
  maximumFractionDigits: 1,
});
const dateFormatter = new Intl.DateTimeFormat("en-US", { dateStyle: "medium" });
const dateTimeFormatter = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" });

export function formatQty(value: number, unit?: string): string {
  const n = numberFormatter.format(value);
  return unit ? `${n} ${unit}` : n;
}

export function formatCurrency(value: number): string {
  return currencyFormatter.format(value);
}

/** Auto-compact for stat-tile values: 1,284 / 12.9K / 4.2M (dataviz spec's figures contract). */
export function formatCompact(value: number): string {
  return compactNumberFormatter.format(value);
}

export function formatCompactCurrency(value: number): string {
  return compactCurrencyFormatter.format(value);
}

export function formatDate(value: string | Date): string {
  return dateFormatter.format(new Date(value));
}

export function formatDateTime(value: string | Date): string {
  return dateTimeFormatter.format(new Date(value));
}
