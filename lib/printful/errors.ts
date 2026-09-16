export type PrintfulApiErrorKind =
  | "http"
  | "timeout"
  | "network"
  | "invalid_response";

type PrintfulApiErrorOptions = {
  kind: PrintfulApiErrorKind;
  message: string;
  status: number | null;
  providerCode?: number | string | null;
};

export class PrintfulApiError extends Error {
  readonly kind: PrintfulApiErrorKind;
  readonly status: number | null;
  readonly providerCode: number | string | null;

  constructor({
    kind,
    message,
    status,
    providerCode = null,
  }: PrintfulApiErrorOptions) {
    super(message);
    this.name = "PrintfulApiError";
    this.kind = kind;
    this.status = status;
    this.providerCode = providerCode;
  }
}

export class PrintfulConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PrintfulConfigurationError";
  }
}
