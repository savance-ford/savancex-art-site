import { expect, test } from "@playwright/test";

import {
  generatePrintfulProductSlug,
  normalizePrintfulProduct,
  normalizePrintfulRetailPrice,
  normalizePrintfulVariant,
} from "../../lib/commerce/printful-sync-normalization";
import type {
  PrintfulSyncProductSummary,
  PrintfulSyncVariant,
} from "../../lib/printful/types";

const printfulProduct: PrintfulSyncProductSummary = {
  id: 123,
  external_id: "product-external-id",
  name: "SAVANCEX Logo Tee",
  variants: 1,
  synced: 1,
  thumbnail_url: "https://example.com/logo-tee.jpg",
  is_ignored: false,
};

const printfulVariant: PrintfulSyncVariant = {
  id: 456,
  external_id: "variant-external-id",
  sync_product_id: 123,
  name: "Black / M",
  synced: true,
  variant_id: 4012,
  retail_price: "36.00",
  sku: "SX-LOGO-BLK-M",
  size: "M",
  color: "Black",
  availability_status: "active",
  files: [],
  product: null,
};

test("generates normalized, punctuation-safe product slugs", () => {
  expect(generatePrintfulProductSlug("  SÁVANCEX Logo Tee!!  ")).toBe(
    "savancex-logo-tee",
  );
  expect(generatePrintfulProductSlug("Static & Bloom")).toBe("static-bloom");
});

test("normalizes prices without floating-point arithmetic", () => {
  expect(normalizePrintfulRetailPrice("0036.5")).toBe("36.50");
  expect(normalizePrintfulRetailPrice("0")).toBe("0.00");
  expect(() => normalizePrintfulRetailPrice("36.999")).toThrow(
    "invalid retail price",
  );
  expect(() => normalizePrintfulRetailPrice("1e2")).toThrow(
    "invalid retail price",
  );
});

test("normalizes a Printful product for database persistence", () => {
  const product = normalizePrintfulProduct(printfulProduct, {
    reservedSlugs: new Set(["savancex-logo-tee"]),
  });

  expect(product).toEqual({
    printful_sync_product_id: 123,
    storefront_id: "pf-123",
    slug: "savancex-logo-tee-2",
    printful_external_id: "product-external-id",
    printful_thumbnail_url: "https://example.com/logo-tee.jpg",
    name: "SAVANCEX Logo Tee",
    active: true,
  });
});

test("keeps Printful sync and catalog variant IDs distinct", () => {
  const product = normalizePrintfulProduct(printfulProduct, {
    reservedSlugs: new Set(),
  });
  const variant = normalizePrintfulVariant(printfulVariant, product);

  expect(variant.printful_sync_variant_id).toBe(456);
  expect(variant.printful_catalog_variant_id).toBe(4012);
  expect(variant.storefront_variant_id).toBe("pf-123-456");
  expect(variant.retail_price).toBe("36.00");
  expect(variant.currency).toBe("USD");
  expect(variant.metadata).toEqual({
    source: "printful",
    synced: true,
    file_count: 0,
  });
});

test("retains storefront IDs and slugs on repeat synchronization", () => {
  const reservedSlugs = new Set<string>();
  const firstProduct = normalizePrintfulProduct(printfulProduct, {
    reservedSlugs,
  });
  const firstVariant = normalizePrintfulVariant(printfulVariant, firstProduct);

  const renamedProduct = normalizePrintfulProduct(
    { ...printfulProduct, name: "A Completely New Product Name" },
    {
      existingIdentity: {
        storefrontId: firstProduct.storefront_id,
        slug: firstProduct.slug,
      },
      reservedSlugs,
    },
  );
  const repeatedVariant = normalizePrintfulVariant(
    { ...printfulVariant, name: "Renamed Variant" },
    renamedProduct,
    { storefrontVariantId: firstVariant.storefront_variant_id },
  );

  expect(renamedProduct.storefront_id).toBe(firstProduct.storefront_id);
  expect(renamedProduct.slug).toBe(firstProduct.slug);
  expect(repeatedVariant.storefront_variant_id).toBe(
    firstVariant.storefront_variant_id,
  );
});
