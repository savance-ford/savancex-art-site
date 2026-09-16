import "server-only";

import { timingSafeEqual } from "node:crypto";

import { NextResponse } from "next/server";

import { PrintfulNormalizationError } from "@/lib/commerce/printful-sync-normalization";
import {
  PrintfulSyncAlreadyRunningError,
  PrintfulSyncPersistenceError,
  syncPrintfulCatalog,
} from "@/lib/commerce/printful-sync";
import {
  PrintfulApiError,
  PrintfulConfigurationError,
} from "@/lib/printful/errors";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

function errorResponse(error: string, status: number): NextResponse {
  return NextResponse.json(
    { success: false, provider: "printful", error },
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

function mapPrintfulError(error: PrintfulApiError): {
  message: string;
  status: number;
} {
  if (error.status === 401 || error.status === 403) {
    return { message: "Unable to authenticate with Printful", status: 502 };
  }

  if (error.status === 419 || error.status === 429) {
    return { message: "Printful is temporarily rate limiting requests", status: 503 };
  }

  if (error.kind === "timeout") {
    return { message: "The Printful request timed out", status: 504 };
  }

  return { message: error.message, status: 502 };
}

export async function POST(request: Request): Promise<NextResponse> {
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
    const result = await syncPrintfulCatalog();
    return NextResponse.json(
      { success: true, ...result },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof PrintfulSyncAlreadyRunningError) {
      return errorResponse(error.message, 409);
    }

    if (error instanceof PrintfulConfigurationError) {
      return errorResponse("Printful connection is not configured", 503);
    }

    if (error instanceof PrintfulApiError) {
      const mappedError = mapPrintfulError(error);
      return errorResponse(mappedError.message, mappedError.status);
    }

    if (error instanceof PrintfulNormalizationError) {
      return errorResponse(error.message, 502);
    }

    if (error instanceof PrintfulSyncPersistenceError) {
      return errorResponse("Unable to persist the Printful catalog", 500);
    }

    return errorResponse("Unable to synchronize the Printful catalog", 500);
  }
}
