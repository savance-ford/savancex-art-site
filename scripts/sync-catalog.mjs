import {
  CatalogAdminRequestError,
  catalogAdminRequest,
} from "./catalog-admin-client.mjs";

try {
  const result = await catalogAdminRequest("/api/admin/printful/sync", {
    method: "POST",
    timeoutMs: 5 * 60_000,
  });

  if (!result || typeof result !== "object" || result.success !== true) {
    throw new CatalogAdminRequestError(
      "The Printful synchronization response was invalid.",
    );
  }

  console.log("Printful catalog synchronization completed");
  console.log(`Sync run: ${result.syncRunId}`);
  console.log(
    `Products: ${result.productsUpserted}/${result.productsReceived} upserted`,
  );
  console.log(
    `Variants: ${result.variantsUpserted}/${result.variantsReceived} upserted`,
  );
} catch (error) {
  const message =
    error instanceof CatalogAdminRequestError
      ? error.message
      : "Printful catalog synchronization failed.";
  console.error(message);
  process.exitCode = 1;
}
