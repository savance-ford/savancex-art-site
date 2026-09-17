import { NextResponse } from "next/server";

import { isAdminRequestAuthorized } from "@/lib/admin/auth";
import {
  getPrintfulFulfillmentReadiness,
  PrintfulFulfillmentError,
} from "@/lib/printful/orders";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ orderId: string }>;
};

const RESPONSE_OPTIONS = {
  headers: { "Cache-Control": "no-store" },
} as const;

function errorResponse(error: string, status: number): NextResponse {
  return NextResponse.json(
    { success: false, error },
    { status, ...RESPONSE_OPTIONS },
  );
}

export async function GET(
  request: Request,
  { params }: RouteContext,
): Promise<NextResponse> {
  if (!isAdminRequestAuthorized(request)) {
    return errorResponse("Unauthorized", 401);
  }

  const { orderId } = await params;
  try {
    const readiness = await getPrintfulFulfillmentReadiness(orderId);
    return NextResponse.json(readiness, RESPONSE_OPTIONS);
  } catch (error) {
    if (error instanceof PrintfulFulfillmentError) {
      const status =
        error.kind === "not_found"
          ? 404
          : error.kind === "validation"
            ? 400
            : 500;
      return errorResponse(error.message, status);
    }
    return errorResponse("Unable to inspect Printful readiness.", 500);
  }
}
