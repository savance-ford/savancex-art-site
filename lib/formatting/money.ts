const DEFAULT_LOCALE = "en-US";
const DEFAULT_CURRENCY = "USD";

export function formatMoney(
  value: number,
  currency: string = DEFAULT_CURRENCY,
): string {
  return new Intl.NumberFormat(DEFAULT_LOCALE, {
    style: "currency",
    currency,
  }).format(value);
}
