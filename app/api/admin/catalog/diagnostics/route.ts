import "server-only";

import { timingSafeEqual } from "node:crypto";

import { NextResponse } from "next/server";

import {
  CatalogDiagnosticsError,
  getCatalogDiagnostics,
} from "@/lib/commerce/catalog-diagnostics";

export const dynamic = "force-dynamic";

function errorResponse(error: string, status: number): NextResponse {
  return NextResponse.json(
    { success: false, error },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

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

export async function GET(request: Request): Promise<NextResponse> {
  const configuredSecret = process.env.CATALOG_SYNC_SECRET;
  const providedSecret = readBearerToken(request.headers.get("authorization"));

  if (
    !configuredSecret ||
    !providedSecret ||
    !secretsMatch(providedSecret, configuredSecret)
  ) {
    return errorResponse("Unauthorized", 401);
  }

  try {
    const diagnostics = await getCatalogDiagnostics();
    return NextResponse.json(diagnostics, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    if (error instanceof CatalogDiagnosticsError) {
      return errorResponse("Unable to read catalog diagnostics", 500);
    }

    return errorResponse("Catalog diagnostics are unavailable", 500);
  }
}
