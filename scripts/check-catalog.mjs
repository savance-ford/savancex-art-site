import {
  CatalogAdminRequestError,
  catalogAdminRequest,
} from "./catalog-admin-client.mjs";

function requireDiagnostics(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new CatalogAdminRequestError(
      "The catalog diagnostics response was invalid.",
    );
  }

  return value;
}

function printIssueList(label, values, formatter) {
  console.log(`${label}: ${values.length}`);
  for (const value of values.slice(0, 20)) {
    console.log(`  - ${formatter(value)}`);
  }
  if (values.length > 20) console.log(`  - ...and ${values.length - 20} more`);
}

function productLabel(value) {
  return `${value.slug} (${value.id})`;
}

function variantLabel(value) {
  return `${value.id} [product ${value.productId}]`;
}

try {
  const diagnostics = requireDiagnostics(
    await catalogAdminRequest("/api/admin/catalog/diagnostics"),
  );

  console.log("SAVANCEX catalog diagnostics");
  console.log(`Generated: ${diagnostics.generatedAt}`);
  console.log("");
  console.log(
    `Products: ${diagnostics.totalDatabaseProducts} total, ${diagnostics.activeDatabaseProducts} active`,
  );
  console.log(
    `Variants: ${diagnostics.totalVariants} total, ${diagnostics.activeVariants} active`,
  );
  console.log("");

  printIssueList(
    "Products with zero variants",
    diagnostics.productsWithZeroVariants,
    productLabel,
  );
  printIssueList(
    "Products without Printful IDs",
    diagnostics.productsWithoutPrintfulIds,
    productLabel,
  );
  printIssueList(
    "Variants without Printful IDs",
    diagnostics.variantsWithoutPrintfulIds,
    (value) => `${variantLabel(value)}: ${value.missing.join(", ")}`,
  );
  printIssueList(
    "Products without images",
    diagnostics.productsWithoutImages,
    productLabel,
  );
  printIssueList(
    "Duplicate slugs",
    diagnostics.duplicateSlugs,
    (value) => `${value.slug} (${value.count} products)`,
  );
  printIssueList(
    "Variants missing price",
    diagnostics.variantsMissingPrice,
    variantLabel,
  );
  printIssueList(
    "Variants missing size/color",
    diagnostics.variantsMissingSizeOrColor,
    (value) => `${variantLabel(value)}: ${value.missing.join(", ")}`,
  );

  console.log("");
  if (diagnostics.mostRecentPrintfulSyncRun) {
    const run = diagnostics.mostRecentPrintfulSyncRun;
    console.log(`Most recent Printful sync: ${run.status} (${run.id})`);
    console.log(`  Started: ${run.startedAt}`);
    console.log(`  Completed: ${run.completedAt ?? "not completed"}`);
    console.log(
      `  Products: ${run.productsUpserted}/${run.productsReceived} upserted`,
    );
    console.log(
      `  Variants: ${run.variantsUpserted}/${run.variantsReceived} upserted`,
    );
  } else {
    console.log("Most recent Printful sync: none");
  }
  console.log(
    `Last successful Printful sync: ${diagnostics.lastSuccessfulPrintfulSyncTime ?? "none"}`,
  );
} catch (error) {
  const message =
    error instanceof CatalogAdminRequestError
      ? error.message
      : "Catalog diagnostics failed.";
  console.error(message);
  process.exitCode = 1;
}
