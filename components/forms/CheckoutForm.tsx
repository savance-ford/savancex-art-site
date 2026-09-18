"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import { CartPageClient } from "@/components/cart/CartPageClient";
import { useCart } from "@/components/cart/CartProvider";
import { useToast } from "@/components/overlays/ToastProvider";
import { formatCommercePrice } from "@/lib/commerce/pricing";
import { formatMoney } from "@/lib/formatting/money";
import {
  normalizeAddressAutofill,
  US_STATES,
  type ShippingAddressInput,
} from "@/lib/shipping/address";
import type {
  ShippingQuoteErrorResponse,
  ShippingQuoteRequest,
  ShippingQuoteResponse,
  ShippingRate,
} from "@/lib/shipping/quote-types";
import type {
  CheckoutErrorResponse,
  CheckoutRequest,
  CheckoutResponse,
} from "@/lib/stripe/checkout-types";

function formString(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

function readShippingAddress(form: HTMLFormElement): ShippingAddressInput {
  const data = new FormData(form);
  return {
    name: formString(data, "name"),
    email: formString(data, "email"),
    addressLine1: formString(data, "addressLine1"),
    addressLine2: formString(data, "addressLine2"),
    city: formString(data, "city"),
    stateCode: formString(data, "stateCode"),
    postalCode: formString(data, "postalCode"),
    countryCode: "US",
  };
}

function deliveryLabel(rate: ShippingRate): string | null {
  if (rate.minDeliveryDate && rate.maxDeliveryDate) {
    return `Estimated ${rate.minDeliveryDate} to ${rate.maxDeliveryDate}`;
  }
  if (rate.minDeliveryDays && rate.maxDeliveryDays) {
    return `Estimated ${rate.minDeliveryDays}-${rate.maxDeliveryDays} business days`;
  }
  return null;
}

export function CheckoutForm() {
  const { catalog, lines, subtotal } = useCart();
  const { showToast } = useToast();
  const [isQuoting, setIsQuoting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rates, setRates] = useState<ShippingRate[]>([]);
  const [shippingMethodId, setShippingMethodId] = useState("");
  const [quoteMessage, setQuoteMessage] = useState(
    "Enter your address to load live shipping methods.",
  );
  const [addressLine1Error, setAddressLine1Error] = useState<string | null>(null);

  if (!lines.length) return <CartPageClient />;

  const items = lines.map((line) => ({
    variantId: line.variantId,
    quantity: line.quantity,
  }));
  const selectedRate = rates.find((rate) => rate.id === shippingMethodId) ?? null;

  function invalidateQuote() {
    if (!rates.length && !shippingMethodId) return;
    setRates([]);
    setShippingMethodId("");
    setQuoteMessage("Address changed. Refresh shipping methods.");
  }

  function prepareShippingAddress(
    form: HTMLFormElement,
  ): ShippingAddressInput | null {
    const line1Input = form.elements.namedItem("addressLine1");
    const line2Input = form.elements.namedItem("addressLine2");
    if (!(line1Input instanceof HTMLInputElement) || !(line2Input instanceof HTMLInputElement)) {
      return null;
    }

    line1Input.setCustomValidity("");
    setAddressLine1Error(null);
    if (!form.reportValidity()) return null;

    const address = readShippingAddress(form);
    const normalized = normalizeAddressAutofill({
      addressLine1: address.addressLine1,
      addressLine2: address.addressLine2 ?? "",
      city: address.city,
      stateCode: address.stateCode,
      postalCode: address.postalCode,
    });
    if (normalized.error) {
      line1Input.setCustomValidity(normalized.error);
      setAddressLine1Error(normalized.error);
      line1Input.reportValidity();
      return null;
    }

    if (normalized.repaired) {
      line1Input.value = normalized.addressLine1;
      line2Input.value = normalized.addressLine2;
    }
    return {
      ...address,
      addressLine1: normalized.addressLine1,
      addressLine2: normalized.addressLine2,
    };
  }

  function handleAddressChange(event: React.ChangeEvent<HTMLDivElement>) {
    invalidateQuote();
    setAddressLine1Error(null);
    const form = event.currentTarget.closest("form");
    const line1Input = form?.elements.namedItem("addressLine1");
    if (line1Input instanceof HTMLInputElement) line1Input.setCustomValidity("");
  }

  async function requestShippingRates(form: HTMLFormElement) {
    if (isQuoting || isSubmitting) return;
    const address = prepareShippingAddress(form);
    if (!address) return;
    const requestBody: ShippingQuoteRequest = {
      items,
      address,
    };

    setIsQuoting(true);
    setQuoteMessage("Loading live shipping methods...");
    try {
      const response = await fetch("/api/shipping/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });
      const body: unknown = await response.json();
      if (!response.ok) {
        const error = body as ShippingQuoteErrorResponse | null;
        throw new Error(error?.error || "Shipping rates are temporarily unavailable.");
      }
      const nextRates = (body as ShippingQuoteResponse | null)?.rates;
      if (!Array.isArray(nextRates) || nextRates.length === 0) {
        setRates([]);
        setShippingMethodId("");
        setQuoteMessage("No shipping methods are available for this address.");
        return;
      }
      setRates(nextRates);
      setShippingMethodId(nextRates.length === 1 ? nextRates[0].id : "");
      setQuoteMessage(
        nextRates.length === 1
          ? "The available shipping method has been selected."
          : "Select a shipping method.",
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Shipping rates are temporarily unavailable.";
      setRates([]);
      setShippingMethodId("");
      setQuoteMessage(message);
      showToast(message);
    } finally {
      setIsQuoting(false);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting || isQuoting) return;
    const shippingAddress = prepareShippingAddress(event.currentTarget);
    if (!shippingAddress) return;
    if (!shippingMethodId) {
      showToast("Load and select a shipping method before continuing.");
      return;
    }

    const checkoutRequest: CheckoutRequest = {
      items,
      shippingAddress,
      shippingMethodId,
    };

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(checkoutRequest),
      });
      const responseBody: unknown = await response.json();

      if (!response.ok) {
        const error = responseBody as CheckoutErrorResponse | null;
        if (error?.code === "shipping_method_unavailable") {
          setRates([]);
          setShippingMethodId("");
          setQuoteMessage("Shipping methods changed. Refresh rates to continue.");
        }
        throw new Error(error?.error || "Checkout is temporarily unavailable.");
      }

      const checkoutUrl = (responseBody as CheckoutResponse | null)?.checkoutUrl;
      if (typeof checkoutUrl !== "string" || !checkoutUrl) {
        throw new Error("Checkout returned an invalid redirect URL.");
      }
      window.location.assign(checkoutUrl);
    } catch (error) {
      showToast(
        error instanceof Error
          ? error.message
          : "Checkout is temporarily unavailable.",
      );
      setIsSubmitting(false);
    }
  }

  return (
    <main className="checkout-shell" id="main">
      <form className="checkout-main" autoComplete="shipping" onSubmit={handleSubmit}>
        <Link href="/" className="checkout-logo">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/assets/logo.svg" alt="NOCTRA" />
        </Link>
        <div className="checkout-steps" aria-label="Checkout steps">
          <span>Information</span><span>Shipping</span><span>Payment</span>
        </div>
        <h1 className="section-title">Shipping information</h1>
        <div className="form-grid" onChange={handleAddressChange}>
          <div className="field field--full">
            <label htmlFor="checkout-name">Full name</label>
            <input id="checkout-name" name="name" autoComplete="name" required />
          </div>
          <div className="field field--full">
            <label htmlFor="checkout-email">Email</label>
            <input id="checkout-email" name="email" type="email" autoComplete="email" required />
          </div>
          <div className="field field--full">
            <label htmlFor="checkout-address-1">Street address</label>
            <input
              id="checkout-address-1"
              name="addressLine1"
              autoComplete="address-line1"
              aria-invalid={addressLine1Error ? "true" : undefined}
              aria-describedby={addressLine1Error ? "checkout-address-1-error" : undefined}
              required
            />
            {addressLine1Error ? (
              <small className="field-error" id="checkout-address-1-error" role="alert">
                {addressLine1Error}
              </small>
            ) : null}
          </div>
          <div className="field field--full">
            <label htmlFor="checkout-address-2">Apartment, suite, unit, etc. (optional)</label>
            <input id="checkout-address-2" name="addressLine2" autoComplete="address-line2" />
          </div>
          <div className="field">
            <label htmlFor="checkout-city">City</label>
            <input id="checkout-city" name="city" autoComplete="address-level2" required />
          </div>
          <div className="field">
            <label htmlFor="checkout-state">State</label>
            <select id="checkout-state" name="stateCode" autoComplete="address-level1" defaultValue="" required>
              <option value="" disabled>Select state</option>
              {US_STATES.map(([code, name]) => <option value={code} key={code}>{name}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="checkout-zip">ZIP code</label>
            <input id="checkout-zip" name="postalCode" autoComplete="postal-code" pattern="[0-9]{5}(-[0-9]{4})?" required />
          </div>
          <div className="field">
            <label htmlFor="checkout-country">Country</label>
            <select id="checkout-country" name="countryCode" autoComplete="country" defaultValue="US" required>
              <option value="US">United States</option>
            </select>
          </div>
        </div>

        <h2>Shipping method</h2>
        <div className="checkout-box shipping-options" aria-live="polite">
          <p className="checkout-note">{quoteMessage}</p>
          {rates.map((rate) => (
            <label className="shipping-option" key={rate.id}>
              <input type="radio" name="shippingMethodId" value={rate.id} checked={shippingMethodId === rate.id} onChange={() => setShippingMethodId(rate.id)} />
              <span><strong>{rate.name}</strong>{deliveryLabel(rate) ? <small>{deliveryLabel(rate)}</small> : null}</span>
              <b>{formatMoney(rate.amountCents / 100)}</b>
            </label>
          ))}
          <button className="btn btn--wide" type="button" disabled={isQuoting || isSubmitting} onClick={(event) => {
            const form = event.currentTarget.form;
            if (form) void requestShippingRates(form);
          }}>
            {isQuoting ? "Loading shipping..." : rates.length ? "Refresh shipping" : "Get shipping methods"}
          </button>
        </div>

        <h2>Payment</h2>
        <div className="checkout-placeholder"><strong>Secure Stripe Checkout</strong><br />Payment information is collected securely by Stripe.</div>
        <button className="btn btn--wide" type="submit" style={{ marginTop: 22 }} disabled={isSubmitting || isQuoting || !shippingMethodId} aria-busy={isSubmitting}>
          {isSubmitting ? "Opening secure checkout..." : "Continue to payment"}
        </button>
        <p className="checkout-note">Stripe test mode only. Tax is not charged during this test phase.</p>
      </form>

      <aside className="checkout-side">
        <h2>Order summary</h2>
        <div className="mini-order">
          {lines.map((line) => {
            const product = catalog.find((item) => item.id === line.productId);
            if (!product) return null;
            return (
              <div className="mini-order__line" key={`${line.productId}::${line.variantId}`}>
                <Image src={product.image} alt={product.name} width={72} height={88} unoptimized />
                <div><strong>{product.name}</strong><small>{line.color} / {line.size} x {line.quantity}</small></div>
                <b>{formatCommercePrice({ ...line.displayPrice, amount: line.displayPrice.amount * line.quantity })}</b>
              </div>
            );
          })}
        </div>
        <div style={{ marginTop: 32 }}>
          <div className="summary-row"><span>Subtotal</span><strong>{formatMoney(subtotal)}</strong></div>
          <div className="summary-row"><span>Shipping</span><span>{selectedRate ? formatMoney(selectedRate.amountCents / 100) : "Calculated from address"}</span></div>
          <div className="summary-row summary-row--total"><span>Total</span><span>{formatMoney(subtotal + (selectedRate?.amountCents ?? 0) / 100)}</span></div>
        </div>
      </aside>
    </main>
  );
}
