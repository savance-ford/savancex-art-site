import "server-only";

import type { CreateOrderItemInput } from "@/lib/orders/types";
import type { CheckoutRequestLine } from "@/lib/stripe/checkout-types";
import { StripeMoneyError } from "@/lib/stripe/errors";
import { decimalStringToCents } from "@/lib/stripe/money";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type {
  DatabaseProduct,
  DatabaseProductImage,
  DatabaseProductVariant,
} from "@/lib/supabase/types";

const UNAVAILABLE_VARIANT_STATUSES = new Set([
  "discontinued",
  "inactive",
  "out_of_stock",
  "unavailable",
]);

export class CheckoutCatalogValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CheckoutCatalogValidationError";
  }
}

export class CheckoutCatalogUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CheckoutCatalogUnavailableError";
  }
}

export type AuthoritativeCheckoutLine = {
  request: CheckoutRequestLine;
  orderItem: CreateOrderItemInput;
  stripeName: string;
  stripeDescription?: string;
  stripeImageUrl?: string;
  stripeTaxCode?: string;
};

const STRIPE_TAX_CODE_PATTERN = /^txcd_[0-9]{8}$/;

function productTaxCode(product: DatabaseProduct): string | undefined {
  const taxCode = product.stripe_tax_code?.trim();
  if (!taxCode) return undefined;
  if (!STRIPE_TAX_CODE_PATTERN.test(taxCode)) {
    throw new CheckoutCatalogUnavailableError(
      "A catalog item has an invalid Stripe tax configuration.",
    );
  }
  return taxCode;
}

function isUnavailableVariant(variant: DatabaseProductVariant): boolean {
  const status = variant.availability_status?.trim().toLowerCase();
  return (
    !variant.active ||
    Boolean(status && UNAVAILABLE_VARIANT_STATUSES.has(status))
  );
}

function selectProductImage(
  product: DatabaseProduct,
  images: readonly DatabaseProductImage[],
): string | null {
  return (
    images.find(
      (image) => image.product_id === product.id && image.url.trim(),
    )?.url.trim() ??
    product.printful_thumbnail_url?.trim() ??
    null
  );
}

function asPublicStripeImageUrl(value: string | null): string | undefined {
  if (!value || value.length > 2_048) return undefined;

  try {
    const url = new URL(value);
    if (
      url.protocol !== "https:" ||
      !url.hostname ||
      url.username ||
      url.password
    ) {
      return undefined;
    }
    return url.href;
  } catch {
    return undefined;
  }
}

function selectStripeProductImage(
  product: DatabaseProduct,
  images: readonly DatabaseProductImage[],
): string | undefined {
  const candidates = images
    .filter((image) => image.product_id === product.id)
    .map((image) => image.url.trim());
  if (product.printful_thumbnail_url?.trim()) {
    candidates.push(product.printful_thumbnail_url.trim());
  }

  for (const candidate of candidates) {
    const publicUrl = asPublicStripeImageUrl(candidate);
    if (publicUrl) return publicUrl;
  }

  return undefined;
}

function variantDescription(
  variant: DatabaseProductVariant,
): string | undefined {
  const attributes = [
    variant.color?.trim() ? `Color: ${variant.color.trim()}` : null,
    variant.size?.trim() ? `Size: ${variant.size.trim()}` : null,
  ].filter((value): value is string => Boolean(value));

  return attributes.length ? attributes.join(" / ") : undefined;
}

function authoritativeUnitAmount(variant: DatabaseProductVariant): number {
  const retailPrice: unknown = variant.retail_price;
  if (
    (typeof retailPrice !== "string" && typeof retailPrice !== "number") ||
    (typeof retailPrice === "number" && !Number.isFinite(retailPrice))
  ) {
    throw new CheckoutCatalogUnavailableError(
      "A catalog item does not have a valid retail price.",
    );
  }

  try {
    return decimalStringToCents(String(retailPrice));
  } catch (error) {
    if (error instanceof StripeMoneyError) {
      throw new CheckoutCatalogUnavailableError(
        "A catalog item does not have a valid USD retail price.",
      );
    }
    throw error;
  }
}

export async function resolveAuthoritativeCheckoutLines(
  requestedLines: readonly CheckoutRequestLine[],
): Promise<AuthoritativeCheckoutLine[]> {
  const supabase = getSupabaseAdminClient();
  const variantIds = requestedLines.map((line) => line.variantId);
  const { data: variants, error: variantsError } = await supabase
    .from("product_variants")
    .select("*")
    .in("storefront_variant_id", variantIds);

  if (variantsError) {
    throw new CheckoutCatalogUnavailableError(
      "The catalog is temporarily unavailable.",
    );
  }

  const variantsByStorefrontId = new Map(
    (variants ?? []).map((variant) => [variant.storefront_variant_id, variant]),
  );
  for (const requestedLine of requestedLines) {
    const variant = variantsByStorefrontId.get(requestedLine.variantId);
    if (!variant || isUnavailableVariant(variant)) {
      throw new CheckoutCatalogValidationError(
        "One or more cart items are unavailable.",
      );
    }
  }

  const productIds = [
    ...new Set((variants ?? []).map((variant) => variant.product_id)),
  ];
  const [productsResponse, imagesResponse] = await Promise.all([
    supabase.from("products").select("*").in("id", productIds),
    supabase
      .from("product_images")
      .select("*")
      .in("product_id", productIds)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true }),
  ]);

  if (productsResponse.error || imagesResponse.error) {
    throw new CheckoutCatalogUnavailableError(
      "The catalog is temporarily unavailable.",
    );
  }

  const productsById = new Map(
    (productsResponse.data ?? []).map((product) => [product.id, product]),
  );
  const images = imagesResponse.data ?? [];

  return requestedLines.map((requestedLine) => {
    const variant = variantsByStorefrontId.get(requestedLine.variantId);
    if (!variant) {
      throw new CheckoutCatalogValidationError(
        "One or more cart items are unavailable.",
      );
    }

    const product = productsById.get(variant.product_id);
    if (!product?.active) {
      throw new CheckoutCatalogValidationError(
        "One or more cart items are unavailable.",
      );
    }

    if (variant.currency.trim().toUpperCase() !== "USD") {
      throw new CheckoutCatalogUnavailableError(
        "A catalog item is not priced in USD.",
      );
    }

    const unitAmountCents = authoritativeUnitAmount(variant);
    const lineTotalCents = unitAmountCents * requestedLine.quantity;
    if (!Number.isSafeInteger(lineTotalCents)) {
      throw new CheckoutCatalogUnavailableError(
        "A catalog item total exceeds the supported range.",
      );
    }

    const imageUrl = selectProductImage(product, images);
    return {
      request: requestedLine,
      orderItem: {
        product_id: product.id,
        product_variant_id: variant.id,
        storefront_product_id: product.storefront_id,
        storefront_variant_id: variant.storefront_variant_id,
        printful_sync_product_id: product.printful_sync_product_id,
        printful_sync_variant_id: variant.printful_sync_variant_id,
        printful_catalog_variant_id: variant.printful_catalog_variant_id,
        product_name: product.name,
        variant_name: variant.name,
        color: variant.color,
        size: variant.size,
        sku: variant.sku,
        unit_amount_cents: unitAmountCents,
        quantity: requestedLine.quantity,
        line_total_cents: lineTotalCents,
        image_url: imageUrl,
      },
      stripeName: product.name,
      stripeDescription: variantDescription(variant),
      stripeImageUrl: selectStripeProductImage(product, images),
      stripeTaxCode: productTaxCode(product),
    };
  });
}
