import type {
  CommercePrice,
  CommerceVariant,
} from "@/lib/commerce/types";
import { formatMoney } from "@/lib/formatting/money";

export function formatCommercePrice(price: CommercePrice): string {
  return formatMoney(price.amount / 100, price.currency);
}

export function hasVariableVariantPrices(
  variants: readonly CommerceVariant[],
): boolean {
  const first = variants[0]?.price;
  return Boolean(
    first &&
      variants.some(
        (variant) =>
          variant.price.amount !== first.amount ||
          variant.price.currency !== first.currency,
      ),
  );
}
