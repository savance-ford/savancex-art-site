import "server-only";

import { timingSafeEqual } from "node:crypto";

function readBearerToken(authorization: string | null): string | null {
  const match = authorization?.match(/^Bearer ([^\s]+)$/i);
  return match?.[1] ?? null;
}

function secretsMatch(provided: string, configured: string): boolean {
  const providedBytes = Buffer.from(provided);
  const configuredBytes = Buffer.from(configured);
  return (
    providedBytes.length === configuredBytes.length &&
    timingSafeEqual(providedBytes, configuredBytes)
  );
}

export function isAdminRequestAuthorized(request: Request): boolean {
  const configuredSecret = process.env.CATALOG_SYNC_SECRET;
  const providedSecret = readBearerToken(request.headers.get("authorization"));

  return Boolean(
    configuredSecret &&
      providedSecret &&
      secretsMatch(providedSecret, configuredSecret),
  );
}
