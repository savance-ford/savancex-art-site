import { NextResponse } from "next/server";

import { isAdminRequestAuthorized } from "@/lib/admin/auth";
import {
  createPrintfulDraftOrder,
  PrintfulFulfillmentError,
} from "@/lib/printful/orders";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

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

function statusForError(error: PrintfulFulfillmentError): number {
  switch (error.kind) {
    case "not_found":
      return 404;
    case "validation":
      return 422;
    case "ineligible":
      return 409;
    case "configuration":
      return 503;
    case "provider":
      return 502;
    case "persistence":
      return 500;
  }
}

export async function POST(
  request: Request,
  { params }: RouteContext,
): Promise<NextResponse> {
  if (!isAdminRequestAuthorized(request)) {
    return errorResponse("Unauthorized", 401);
  }

  const { orderId } = await params;
  try {
    const result = await createPrintfulDraftOrder(orderId);
    return NextResponse.json(
      { success: true, ...result },
      RESPONSE_OPTIONS,
    );
  } catch (error) {
    if (error instanceof PrintfulFulfillmentError) {
      return errorResponse(error.message, statusForError(error));
    }
    return errorResponse("Unable to create the Printful draft order.", 500);
  }
}
