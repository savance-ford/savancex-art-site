import type { PrintfulSyncProductSummary, PrintfulSyncVariant } from "@/lib/printful/types";
import type { Json } from "@/lib/supabase/types";

export class PrintfulNormalizationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PrintfulNormalizationError";
  }
}

export type ExistingPrintfulProductIdentity = {
  storefrontId: string;
  slug: string;
};

export type ExistingPrintfulVariantIdentity = {
  storefrontVariantId: string;
};

export type NormalizedPrintfulProduct = {
  [key: string]: Json | undefined;
  printful_sync_product_id: number;
  storefront_id: string;
  slug: string;
  printful_external_id: string | null;
  printful_thumbnail_url: string | null;
  name: string;
  active: boolean;
};

export type NormalizedPrintfulVariant = {
  [key: string]: Json | undefined;
  printful_sync_variant_id: number;
  printful_sync_product_id: number;
  storefront_variant_id: string;
  printful_catalog_variant_id: number;
  external_id: string | null;
  sku: string | null;
  name: string;
  color: string | null;
  size: string | null;
  retail_price: string;
  currency: "USD";
  availability_status: string | null;
  active: boolean;
  metadata: {
    source: "printful";
    synced: boolean;
    file_count: number;
  };
};

function requireProviderId(value: number, label: string): number {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new PrintfulNormalizationError(`${label} is invalid.`);
  }
  return value;
}

function normalizeNullableString(value: string | null): string | null {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

export function generatePrintfulProductSlug(name: string): string {
  const slug = name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || "product";
}

export function createUniquePrintfulProductSlug(
  name: string,
  reservedSlugs: ReadonlySet<string>,
): string {
  const baseSlug = generatePrintfulProductSlug(name);
  if (!reservedSlugs.has(baseSlug)) return baseSlug;

  for (let suffix = 2; suffix < Number.MAX_SAFE_INTEGER; suffix += 1) {
    const candidate = `${baseSlug}-${suffix}`;
    if (!reservedSlugs.has(candidate)) return candidate;
  }

  throw new PrintfulNormalizationError(
    "Unable to allocate a unique product slug.",
  );
}

export function normalizePrintfulRetailPrice(value: string): string {
  const match = value.trim().match(/^(\d{1,8})(?:\.(\d{1,2}))?$/);
  if (!match) {
    throw new PrintfulNormalizationError(
      "Printful returned an invalid retail price.",
    );
  }

  const wholeUnits = BigInt(match[1]).toString();
  const fractionalUnits = (match[2] ?? "").padEnd(2, "0");
  return `${wholeUnits}.${fractionalUnits}`;
}

export function normalizePrintfulProduct(
  product: PrintfulSyncProductSummary,
  options: {
    existingIdentity?: ExistingPrintfulProductIdentity;
    reservedSlugs: Set<string>;
  },
): NormalizedPrintfulProduct {
  const printfulProductId = requireProviderId(product.id, "Printful product ID");
  const name = product.name.trim();

  if (!name) {
    throw new PrintfulNormalizationError(
      `Printful product ${printfulProductId} has no name.`,
    );
  }

  const storefrontId =
    options.existingIdentity?.storefrontId ?? `pf-${printfulProductId}`;
  const slug =
    options.existingIdentity?.slug ??
    createUniquePrintfulProductSlug(name, options.reservedSlugs);

  options.reservedSlugs.add(slug);

  return {
    printful_sync_product_id: printfulProductId,
    storefront_id: storefrontId,
    slug,
    printful_external_id: normalizeNullableString(product.external_id),
    printful_thumbnail_url: normalizeNullableString(product.thumbnail_url),
    name,
    active: !product.is_ignored && product.synced > 0,
  };
}

export function normalizePrintfulVariant(
  variant: PrintfulSyncVariant,
  product: NormalizedPrintfulProduct,
  existingIdentity?: ExistingPrintfulVariantIdentity,
): NormalizedPrintfulVariant {
  const syncVariantId = requireProviderId(
    variant.id,
    "Printful sync variant ID",
  );
  const catalogVariantId = requireProviderId(
    variant.variant_id,
    "Printful catalog variant ID",
  );
  const syncProductId = requireProviderId(
    variant.sync_product_id,
    "Printful variant product ID",
  );

  if (syncProductId !== product.printful_sync_product_id) {
    throw new PrintfulNormalizationError(
      `Printful variant ${syncVariantId} belongs to an unexpected product.`,
    );
  }

  const name = variant.name.trim();
  if (!name) {
    throw new PrintfulNormalizationError(
      `Printful variant ${syncVariantId} has no name.`,
    );
  }

  return {
    printful_sync_variant_id: syncVariantId,
    printful_sync_product_id: syncProductId,
    storefront_variant_id:
      existingIdentity?.storefrontVariantId ??
      `pf-${syncProductId}-${syncVariantId}`,
    printful_catalog_variant_id: catalogVariantId,
    external_id: normalizeNullableString(variant.external_id),
    sku: normalizeNullableString(variant.sku),
    name,
    color: normalizeNullableString(variant.color),
    size: normalizeNullableString(variant.size),
    retail_price: normalizePrintfulRetailPrice(variant.retail_price),
    currency: "USD",
    availability_status: normalizeNullableString(
      variant.availability_status,
    ),
    active: product.active && variant.synced,
    metadata: {
      source: "printful",
      synced: variant.synced,
      file_count: variant.files.length,
    },
  };
}
