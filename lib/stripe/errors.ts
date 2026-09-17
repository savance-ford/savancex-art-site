export class StripeConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StripeConfigurationError";
  }
}

export class StripeMoneyError extends TypeError {
  constructor(message: string) {
    super(message);
    this.name = "StripeMoneyError";
  }
}
