export class CatalogUnavailableError extends Error {
  constructor(
    message = "The storefront catalog is temporarily unavailable.",
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "CatalogUnavailableError";
  }
}
