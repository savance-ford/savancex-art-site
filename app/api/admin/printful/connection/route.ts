import "server-only";

import { timingSafeEqual } from "node:crypto";

import { NextResponse } from "next/server";

import {
  PrintfulApiError,
  PrintfulConfigurationError,
} from "@/lib/printful/errors";
import {
  getPrintfulProducts,
  getPrintfulStores,
} from "@/lib/printful/products";

export const dynamic = "force-dynamic";

type ErrorResponse = {
  connected: false;
  provider: "printful";
  error: string;
};

function errorResponse(error: string, status: number): NextResponse<ErrorResponse> {
  return NextResponse.json(
    { connected: false, provider: "printful", error },
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
    return { message: "The Printful connection timed out", status: 504 };
  }

  return { message: error.message, status: 502 };
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
    const [stores, products] = await Promise.all([
      getPrintfulStores(),
      getPrintfulProducts(),
    ]);
    const configuredStoreId = process.env.PRINTFUL_STORE_ID?.trim();
    const store = configuredStoreId
      ? stores.find(({ id }) => String(id) === configuredStoreId)
      : stores[0];

    if (!store) {
      return errorResponse("Printful returned no accessible store", 502);
    }

    return NextResponse.json(
      {
        connected: true,
        store: { id: store.id, name: store.name },
        productCount: products.length,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof PrintfulConfigurationError) {
      return errorResponse("Printful connection is not configured", 503);
    }

    if (error instanceof PrintfulApiError) {
      const mappedError = mapPrintfulError(error);
      return errorResponse(mappedError.message, mappedError.status);
    }

    return errorResponse("Unable to verify the Printful connection", 500);
  }
}
