import "server-only";

import {
  PrintfulApiError,
  PrintfulConfigurationError,
} from "@/lib/printful/errors";
import type {
  PrintfulApiResponse,
  PrintfulPaging,
} from "@/lib/printful/types";

const PRINTFUL_API_BASE_URL = "https://api.printful.com";
const DEFAULT_TIMEOUT_MS = 15_000;

type QueryValue = string | number | boolean | undefined;

type PrintfulRequestOptions<T> = {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  query?: Readonly<Record<string, QueryValue>>;
  body?: unknown;
  timeoutMs?: number;
  parseResult: (value: unknown) => T;
};

type PrintfulConfiguration = {
  token: string;
  storeId: string | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getPrintfulConfiguration(): PrintfulConfiguration {
  const token = process.env.PRINTFUL_TOKEN?.trim();
  const storeId = process.env.PRINTFUL_STORE_ID?.trim() || null;

  if (!token) {
    throw new PrintfulConfigurationError(
      "Printful is not configured. Missing: PRINTFUL_TOKEN.",
    );
  }

  if (/[\r\n]/.test(token)) {
    throw new PrintfulConfigurationError(
      "Printful is not configured. PRINTFUL_TOKEN is invalid.",
    );
  }

  if (storeId && !/^\d+$/.test(storeId)) {
    throw new PrintfulConfigurationError(
      "Printful is not configured. PRINTFUL_STORE_ID must be numeric.",
    );
  }

  return { token, storeId };
}

function buildPrintfulUrl(
  path: string,
  query: Readonly<Record<string, QueryValue>> | undefined,
): URL {
  if (!path.startsWith("/") || path.startsWith("//")) {
    throw new PrintfulConfigurationError(
      "Printful request paths must be API-relative.",
    );
  }

  const url = new URL(path, PRINTFUL_API_BASE_URL);

  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }

  return url;
}

function sanitizeProviderMessage(value: string, token: string): string {
  const withoutToken = value.split(token).join("[redacted]");
  const withoutBearerValues = withoutToken.replace(
    /Bearer\s+[^\s,;]+/gi,
    "Bearer [redacted]",
  );

  return withoutBearerValues.replace(/[\r\n\t]+/g, " ").trim().slice(0, 300);
}

function extractProviderMessage(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (!isRecord(value)) return null;

  for (const key of ["message", "reason", "error"]) {
    const candidate = value[key];
    if (typeof candidate === "string") return candidate;
    if (isRecord(candidate)) {
      const nested = extractProviderMessage(candidate);
      if (nested) return nested;
    }
  }

  if ("result" in value) return extractProviderMessage(value.result);
  return null;
}

function parsePaging(value: unknown): PrintfulPaging | undefined {
  if (value === undefined || value === null) return undefined;
  if (!isRecord(value)) return undefined;

  const { total, offset, limit } = value;
  if (
    !Number.isInteger(total) ||
    !Number.isInteger(offset) ||
    !Number.isInteger(limit) ||
    (total as number) < 0 ||
    (offset as number) < 0 ||
    (limit as number) <= 0
  ) {
    return undefined;
  }

  return {
    total: total as number,
    offset: offset as number,
    limit: limit as number,
  };
}

async function parseJsonResponse(response: Response): Promise<unknown> {
  const responseText = await response.text();
  if (!responseText) return null;

  try {
    return JSON.parse(responseText) as unknown;
  } catch {
    return null;
  }
}

export async function printfulRequest<T>(
  path: string,
  options: PrintfulRequestOptions<T>,
): Promise<PrintfulApiResponse<T>> {
  const { token, storeId } = getPrintfulConfiguration();
  const url = buildPrintfulUrl(path, options.query);
  const controller = new AbortController();
  let timedOut = false;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const timeout = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  const headers = new Headers({
    Accept: "application/json",
    Authorization: `Bearer ${token}`,
  });

  if (storeId) headers.set("X-PF-Store-Id", storeId);

  let body: string | undefined;
  if (options.body !== undefined) {
    headers.set("Content-Type", "application/json");
    body = JSON.stringify(options.body);
  }

  try {
    const response = await fetch(url, {
      method: options.method ?? "GET",
      headers,
      body,
      cache: "no-store",
      signal: controller.signal,
    });
    const payload = await parseJsonResponse(response);
    const payloadCode =
      isRecord(payload) && typeof payload.code === "number"
        ? payload.code
        : null;

    if (!response.ok) {
      const extractedMessage = extractProviderMessage(payload);
      const providerMessage = sanitizeProviderMessage(
        extractedMessage || response.statusText || "Printful rejected the request.",
        token,
      );

      throw new PrintfulApiError({
        kind: "http",
        message: providerMessage || "Printful rejected the request.",
        status: response.status,
        providerCode: payloadCode,
      });
    }

    if (!isRecord(payload) || payloadCode === null || !("result" in payload)) {
      throw new PrintfulApiError({
        kind: "invalid_response",
        message: "Printful returned an unexpected response format.",
        status: response.status,
      });
    }

    let result: T;
    try {
      result = options.parseResult(payload.result);
    } catch {
      throw new PrintfulApiError({
        kind: "invalid_response",
        message: "Printful returned an unexpected response format.",
        status: response.status,
        providerCode: payloadCode,
      });
    }

    return {
      code: payloadCode,
      result,
      paging: parsePaging(payload.paging),
      ...(payload.extra === undefined ? {} : { extra: payload.extra }),
    };
  } catch (error) {
    if (error instanceof PrintfulApiError) throw error;

    if (timedOut) {
      throw new PrintfulApiError({
        kind: "timeout",
        message: "The Printful request timed out.",
        status: null,
      });
    }

    throw new PrintfulApiError({
      kind: "network",
      message: "Unable to reach Printful.",
      status: null,
    });
  } finally {
    clearTimeout(timeout);
  }
}
