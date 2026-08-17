"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { CartPageClient } from "@/components/cart/CartPageClient";
import { useCart } from "@/components/cart/CartProvider";
import { useToast } from "@/components/overlays/ToastProvider";
import { brand } from "@/data/products";
import { getAllProducts } from "@/lib/commerce/catalog";
import { formatMoney } from "@/lib/formatting/money";

const PRODUCTS_BY_ID = new Map(
  getAllProducts().map((product) => [product.id, product] as const),
);

export function CheckoutForm() {
  const { lines, subtotal } = useCart();
  const { showToast } = useToast();
  const [isConfirmed, setIsConfirmed] = useState(false);

  if (!lines.length) return <CartPageClient />;

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsConfirmed(true);
    showToast("Demo order confirmed — no payment was processed");
  }

  return (
    <main className="checkout-shell" id="main">
      <form className="checkout-main" onSubmit={handleSubmit}>
        <Link href="/" className="checkout-logo">
          {/* The legacy SVG's intrinsic sizing is required for exact checkout spacing. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/assets/logo.svg" alt="NOCTRA" />
        </Link>
        <div className="checkout-steps" aria-label="Checkout steps">
          <span>Information</span>
          <span>Shipping</span>
          <span>Payment</span>
        </div>
        <h1 className="section-title">Contact information</h1>
        <div className="checkout-box">
          <div className="field">
            <label htmlFor="checkout-email">Email</label>
            <input
              id="checkout-email"
              name="email"
              type="email"
              placeholder="you@example.com"
              required
            />
          </div>
        </div>
        <h2>Delivery address</h2>
        <div className="form-grid">
          <div className="field">
            <label htmlFor="checkout-first-name">First name</label>
            <input
              id="checkout-first-name"
              name="firstName"
              autoComplete="given-name"
              required
            />
          </div>
          <div className="field">
            <label htmlFor="checkout-last-name">Last name</label>
            <input
              id="checkout-last-name"
              name="lastName"
              autoComplete="family-name"
              required
            />
          </div>
          <div className="field field--full">
            <label htmlFor="checkout-address">Address</label>
            <input
              id="checkout-address"
              name="address"
              autoComplete="street-address"
              required
            />
          </div>
          <div className="field">
            <label htmlFor="checkout-city">City</label>
            <input
              id="checkout-city"
              name="city"
              autoComplete="address-level2"
              required
            />
          </div>
          <div className="field">
            <label htmlFor="checkout-state">State</label>
            <select
              id="checkout-state"
              name="state"
              autoComplete="address-level1"
              defaultValue=""
              required
            >
              <option value="" disabled>
                Select state
              </option>
              <option>Wisconsin</option>
              <option>Illinois</option>
              <option>California</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="checkout-zip">ZIP code</label>
            <input
              id="checkout-zip"
              name="zip"
              autoComplete="postal-code"
              required
            />
          </div>
          <div className="field">
            <label htmlFor="checkout-country">Country</label>
            <select
              id="checkout-country"
              name="country"
              autoComplete="country-name"
              defaultValue="United States"
              required
            >
              <option>United States</option>
            </select>
          </div>
        </div>
        <h2>Payment</h2>
        <div className="checkout-placeholder">
          <strong>Payment placeholder</strong>
          <br />
          Connect Shopify, Stripe, or another commerce backend here.
        </div>
        <button
          className="btn btn--wide"
          type="submit"
          style={{ marginTop: 22 }}
        >
          Complete demo order
        </button>
        <p className="checkout-note" aria-live="polite">
          {isConfirmed
            ? "Demo order confirmed in this session — no payment was processed and no order was sent."
            : "This button only displays a prototype confirmation."}
        </p>
      </form>
      <aside className="checkout-side">
        <h2>Order summary</h2>
        <div className="mini-order">
          {lines.map((line) => {
            const product = PRODUCTS_BY_ID.get(line.productId);
            if (!product) return null;

            return (
              <div
                className="mini-order__line"
                key={`${line.productId}::${line.color}::${line.size}`}
              >
                <Image
                  src={product.image}
                  alt={product.name}
                  width={72}
                  height={88}
                />
                <div>
                  <strong>{product.name}</strong>
                  <small>
                    {line.color} / {line.size} × {line.qty}
                  </small>
                </div>
                <b>{formatMoney(product.price * line.qty)}</b>
              </div>
            );
          })}
        </div>
        <div style={{ marginTop: 32 }}>
          <div className="summary-row">
            <span>Subtotal</span>
            <strong>{formatMoney(subtotal)}</strong>
          </div>
          <div className="summary-row">
            <span>Shipping</span>
            <span>
              {subtotal >= brand.shippingThreshold ? "Free" : "Calculated"}
            </span>
          </div>
          <div className="summary-row summary-row--total">
            <span>Total</span>
            <span>{formatMoney(subtotal)}</span>
          </div>
        </div>
      </aside>
    </main>
  );
}
