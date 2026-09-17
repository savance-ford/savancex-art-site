import type Stripe from "stripe";

import type { DatabaseOrder } from "@/lib/orders/types";
import type { NormalizedShippingAddress } from "@/lib/shipping/address";
import type { ShippingRate } from "@/lib/shipping/quote-types";
import type { AuthoritativeCheckoutLine } from "@/lib/stripe/checkout-catalog";

export const STRIPE_APPAREL_TAX_CODE = "txcd_30011000";
export const STRIPE_SHIPPING_TAX_CODE = "txcd_92010001";

type CustomerCreator = (
  params: Stripe.CustomerCreateParams,
  options: Stripe.RequestOptions,
) => Promise<{ id: string }>;

type CheckoutSessionInput = {
  order: Pick<DatabaseOrder, "id" | "order_number">;
  lines: readonly AuthoritativeCheckoutLine[];
  shippingRate: ShippingRate;
  customerId: string;
  siteUrl: URL;
};

export type StripeTaxReconciliation =
  | {
      automaticTaxStatus: "complete";
      taxCents: number;
      totalCents: number;
      amountsReconciled: true;
    }
  | {
      automaticTaxStatus: string | null;
      taxCents: number | null;
      totalCents: number | null;
      amountsReconciled: false;
    };

function stripeAddress(
  address: NormalizedShippingAddress,
): Stripe.AddressParam {
  return {
    line1: address.addressLine1,
    ...(address.addressLine2 ? { line2: address.addressLine2 } : {}),
    city: address.city,
    state: address.stateCode,
    postal_code: address.postalCode,
    country: address.countryCode,
  };
}

export function buildStripeCustomerParams(
  address: NormalizedShippingAddress,
  orderId: string,
): Stripe.CustomerCreateParams {
  const customerAddress = stripeAddress(address);
  return {
    email: address.email,
    name: address.name,
    ...(address.phone ? { phone: address.phone } : {}),
    address: customerAddress,
    shipping: {
      name: address.name,
      ...(address.phone ? { phone: address.phone } : {}),
      address: customerAddress,
    },
    metadata: { order_id: orderId },
    tax: { validate_location: "immediately" },
  };
}

export async function getOrCreateStripeCustomerId({
  existingCustomerId,
  address,
  orderId,
  createCustomer,
}: {
  existingCustomerId: string | null;
  address: NormalizedShippingAddress;
  orderId: string;
  createCustomer: CustomerCreator;
}): Promise<string> {
  if (existingCustomerId) {
    if (!/^cus_[A-Za-z0-9]+$/.test(existingCustomerId)) {
      throw new TypeError("The order has an invalid Stripe Customer ID.");
    }
    return existingCustomerId;
  }

  const customer = await createCustomer(
    buildStripeCustomerParams(address, orderId),
    { idempotencyKey: `checkout-customer:${orderId}` },
  );
  if (!/^cus_[A-Za-z0-9]+$/.test(customer.id)) {
    throw new TypeError("Stripe returned an invalid Customer ID.");
  }
  return customer.id;
}

function stripeDeliveryEstimate(
  rate: ShippingRate,
): Stripe.Checkout.SessionCreateParams.ShippingOption.ShippingRateData.DeliveryEstimate | undefined {
  if (!rate.minDeliveryDays && !rate.maxDeliveryDays) return undefined;
  return {
    ...(rate.minDeliveryDays
      ? { minimum: { unit: "business_day" as const, value: rate.minDeliveryDays } }
      : {}),
    ...(rate.maxDeliveryDays
      ? { maximum: { unit: "business_day" as const, value: rate.maxDeliveryDays } }
      : {}),
  };
}

export function buildStripeCheckoutSessionParams({
  order,
  lines,
  shippingRate,
  customerId,
  siteUrl,
}: CheckoutSessionInput): Stripe.Checkout.SessionCreateParams {
  const successUrl = `${new URL("/checkout/success", siteUrl).href}?session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl = new URL("/cart?checkout=cancelled", siteUrl).href;

  return {
    mode: "payment",
    customer: customerId,
    automatic_tax: { enabled: true },
    client_reference_id: order.id,
    metadata: {
      order_id: order.id,
      order_number: String(order.order_number),
    },
    line_items: lines.map((line) => ({
      quantity: line.request.quantity,
      price_data: {
        currency: "usd",
        unit_amount: line.orderItem.unit_amount_cents,
        tax_behavior: "exclusive",
        product_data: {
          name: line.stripeName,
          description: line.stripeDescription,
          images: line.stripeImageUrl ? [line.stripeImageUrl] : undefined,
          ...(line.stripeTaxCode ? { tax_code: line.stripeTaxCode } : {}),
        },
      },
    })),
    shipping_options: [
      {
        shipping_rate_data: {
          type: "fixed_amount",
          fixed_amount: {
            amount: shippingRate.amountCents,
            currency: "usd",
          },
          display_name: shippingRate.name,
          delivery_estimate: stripeDeliveryEstimate(shippingRate),
          metadata: { printful_shipping_method_id: shippingRate.id },
          tax_code: STRIPE_SHIPPING_TAX_CODE,
          tax_behavior: "exclusive",
        },
      },
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
  };
}

function isSafeNonNegativeInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && (value as number) >= 0;
}

export function reconcileStripeCheckoutTax(
  session: Pick<
    Stripe.Checkout.Session,
    | "amount_subtotal"
    | "amount_total"
    | "automatic_tax"
    | "currency"
    | "total_details"
  >,
  order: Pick<
    DatabaseOrder,
    "currency" | "subtotal_cents" | "shipping_cents"
  >,
): StripeTaxReconciliation {
  const status = session.automatic_tax.status;
  const taxCents = session.total_details?.amount_tax ?? null;
  const shippingCents = session.total_details?.amount_shipping ?? null;
  const discountCents = session.total_details?.amount_discount ?? null;
  const subtotalCents = session.amount_subtotal;
  const totalCents = session.amount_total;

  const amountsReconciled =
    session.automatic_tax.enabled &&
    status === "complete" &&
    session.currency?.toLowerCase() === order.currency.toLowerCase() &&
    isSafeNonNegativeInteger(taxCents) &&
    isSafeNonNegativeInteger(shippingCents) &&
    isSafeNonNegativeInteger(discountCents) &&
    isSafeNonNegativeInteger(subtotalCents) &&
    isSafeNonNegativeInteger(totalCents) &&
    discountCents === 0 &&
    subtotalCents === order.subtotal_cents &&
    shippingCents === order.shipping_cents &&
    totalCents === subtotalCents + shippingCents + taxCents;

  if (amountsReconciled) {
    return {
      automaticTaxStatus: "complete",
      taxCents,
      totalCents,
      amountsReconciled: true,
    };
  }

  return {
    automaticTaxStatus: status,
    taxCents: isSafeNonNegativeInteger(taxCents) ? taxCents : null,
    totalCents: isSafeNonNegativeInteger(totalCents) ? totalCents : null,
    amountsReconciled: false,
  };
}
