const DEFAULT_BASE_URL = "http://localhost:3000";

export class CatalogAdminRequestError extends Error {
  constructor(message, status = null) {
    super(message);
    this.name = "CatalogAdminRequestError";
    this.status = status;
  }
}

function loadLocalEnvironment() {
  if (typeof process.loadEnvFile !== "function") return;

  try {
    process.loadEnvFile(".env.local");
  } catch (error) {
    if (error && typeof error === "object" && error.code === "ENOENT") return;
    throw new CatalogAdminRequestError("Unable to load .env.local.");
  }
}

function getCatalogAdminUrl(path) {
  const configuredBaseUrl =
    process.env.CATALOG_ADMIN_BASE_URL?.trim() || DEFAULT_BASE_URL;

  let baseUrl;
  try {
    baseUrl = new URL(configuredBaseUrl);
  } catch {
    throw new CatalogAdminRequestError(
      "CATALOG_ADMIN_BASE_URL must be a valid URL.",
    );
  }

  if (baseUrl.protocol !== "http:" && baseUrl.protocol !== "https:") {
    throw new CatalogAdminRequestError(
      "CATALOG_ADMIN_BASE_URL must use HTTP or HTTPS.",
    );
  }

  return new URL(path, baseUrl);
}

function safeResponseMessage(payload, fallback) {
  if (
    payload &&
    typeof payload === "object" &&
    typeof payload.error === "string"
  ) {
    return payload.error.replace(/[\r\n\t]+/g, " ").trim().slice(0, 300);
  }

  return fallback;
}

export async function catalogAdminRequest(
  path,
  { method = "GET", timeoutMs = 30_000 } = {},
) {
  loadLocalEnvironment();

  const secret = process.env.CATALOG_SYNC_SECRET;
  if (!secret) {
    throw new CatalogAdminRequestError(
      "CATALOG_SYNC_SECRET is required in .env.local or the shell environment.",
    );
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(getCatalogAdminUrl(path), {
      method,
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${secret}`,
      },
      signal: controller.signal,
    });

    let payload = null;
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }

    if (!response.ok) {
      throw new CatalogAdminRequestError(
        safeResponseMessage(
          payload,
          `Catalog admin request failed with HTTP ${response.status}.`,
        ),
        response.status,
      );
    }

    return payload;
  } catch (error) {
    if (error instanceof CatalogAdminRequestError) throw error;
    if (error instanceof Error && error.name === "AbortError") {
      throw new CatalogAdminRequestError("Catalog admin request timed out.");
    }

    throw new CatalogAdminRequestError(
      "Unable to reach the catalog administration endpoint.",
    );
  } finally {
    clearTimeout(timeout);
  }
}
