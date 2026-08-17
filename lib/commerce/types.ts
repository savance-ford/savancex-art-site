/** Monetary values use integer minor units (for example, 3600 means USD $36.00). */
export interface CommercePrice {
  readonly amount: number;
  readonly currency: string;
}

export interface CommerceProduct {
  /** Storefront-owned ID. This is not a fulfillment-provider product ID. */
  readonly id: string;
  /** Optional ID owned by an external catalog or fulfillment provider. */
  readonly externalId: string | null;
  readonly slug: string;
  readonly name: string;
  readonly description: string;
  readonly category: string;
  readonly collection: string;
  readonly defaultPrice: CommercePrice;
  readonly compareAtPrice: CommercePrice | null;
  readonly image: string;
  readonly alternateImage: string;
  readonly badge: string | null;
  readonly rating: number;
  readonly reviewCount: number;
  readonly features: readonly string[];
  readonly fit: string;
  readonly available: boolean;
}

export interface CommerceVariant {
  /** Storefront-owned variant ID. */
  readonly id: string;
  /** Optional provider-owned ID, such as a future Printful variant ID. */
  readonly externalId: string | null;
  readonly productId: CommerceProduct["id"];
  readonly name: string;
  readonly sku: string | null;
  readonly options: Readonly<Record<string, string>>;
  readonly price: CommercePrice;
  readonly image: string;
  readonly available: boolean;
}

export interface CheckoutLine {
  readonly variantId: CommerceVariant["id"];
  readonly quantity: number;
}

export interface ShippingAddress {
  readonly firstName: string;
  readonly lastName: string;
  readonly company?: string;
  readonly addressLine1: string;
  readonly addressLine2?: string;
  readonly city: string;
  readonly stateOrProvince: string;
  readonly postalCode: string;
  readonly countryCode: string;
  readonly phone?: string;
}

export interface ShippingEstimate {
  readonly id: string;
  readonly carrier: string | null;
  readonly service: string;
  readonly price: CommercePrice;
  readonly minimumDeliveryDays: number | null;
  readonly maximumDeliveryDays: number | null;
}

export type CheckoutSessionStatus =
  | "open"
  | "complete"
  | "expired";

export interface CheckoutSession {
  readonly id: string;
  readonly status: CheckoutSessionStatus;
  readonly url: string | null;
  readonly lines: readonly CheckoutLine[];
  readonly subtotal: CommercePrice;
  readonly shipping: CommercePrice | null;
  readonly total: CommercePrice;
  readonly customerEmail: string | null;
}

export type FulfillmentStatus =
  | "pending"
  | "submitted"
  | "in_production"
  | "fulfilled"
  | "shipped"
  | "delivered"
  | "canceled"
  | "failed";

export interface FulfillmentOrder {
  readonly id: string;
  readonly externalId: string | null;
  readonly checkoutSessionId: CheckoutSession["id"];
  readonly status: FulfillmentStatus;
  readonly lines: readonly CheckoutLine[];
  readonly shippingAddress: ShippingAddress;
  readonly shippingEstimateId: ShippingEstimate["id"] | null;
  readonly trackingUrl: string | null;
  readonly createdAt: string;
}

export interface CreateCheckoutSessionInput {
  readonly lines: readonly CheckoutLine[];
  readonly customerEmail?: string;
  readonly successUrl: string;
  readonly cancelUrl: string;
  readonly idempotencyKey: string;
}

export interface EstimateShippingInput {
  readonly lines: readonly CheckoutLine[];
  readonly shippingAddress: ShippingAddress;
}

export interface CreateFulfillmentOrderInput {
  readonly checkoutSessionId: CheckoutSession["id"];
  readonly paymentReference: string;
  readonly lines: readonly CheckoutLine[];
  readonly shippingAddress: ShippingAddress;
  readonly shippingEstimateId?: ShippingEstimate["id"];
  readonly idempotencyKey: string;
}
