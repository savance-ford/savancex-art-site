"use client";

import Link from "next/link";
import { CartLine } from "@/components/cart/CartLine";
import { CartProgress } from "@/components/cart/CartProgress";
import { getCartLineKey, useCart } from "@/components/cart/CartProvider";
import { ProductRail } from "@/components/catalog/ProductRail";
import { AnnouncementMarquee } from "@/components/layout/AnnouncementMarquee";
import { brand } from "@/data/brand";
import { formatMoney } from "@/lib/formatting/money";

export function CartPageClient() {
  const { catalog, catalogAvailable, lines, cartCount, subtotal } = useCart();
  const popularProducts = catalog.slice(0, 5);

  if (!lines.length) {
    return (
      <main id="main">
        <AnnouncementMarquee />
        <section className="cart-page">
          <div className="container empty-state">
            <div>
              <span className="kicker">Cart (0)</span>
              <h2>
                {catalogAvailable ? "Your bag is empty." : "Signal interrupted."}
              </h2>
              <p>
                {catalogAvailable
                  ? "Start with the latest drop or browse the full catalog."
                  : "The storefront catalog is temporarily unavailable."}
              </p>
              <Link href="/shop" className="btn">
                Continue shopping
              </Link>
            </div>
          </div>
        </section>
        <section className="section section--dark">
          <div className="container">
            <div className="section-head">
              <div>
                <span className="kicker">Popular picks</span>
                <h2 className="section-title">Start here.</h2>
              </div>
            </div>
            <ProductRail products={popularProducts} />
          </div>
        </section>
      </main>
    );
  }

  return (
    <main id="main">
      <AnnouncementMarquee />
      <section className="cart-page">
        <div className="container">
          <div className="section-head">
            <h1 className="display">Your bag.</h1>
            <span>
              {cartCount} item{cartCount === 1 ? "" : "s"}
            </span>
          </div>
          <div className="cart-page__layout">
            <div className="cart-list">
              {lines.map((line) => (
                <CartLine
                  key={getCartLineKey(line)}
                  line={line}
                />
              ))}
            </div>
            <aside className="cart-summary">
              <CartProgress subtotal={subtotal} />
              <h2>Order summary</h2>
              <div className="summary-row">
                <span>Subtotal</span>
                <strong>{formatMoney(subtotal)}</strong>
              </div>
              <div className="summary-row">
                <span>Shipping</span>
                <span>
                  {subtotal >= brand.shippingThreshold
                    ? "Free"
                    : "Calculated next"}
                </span>
              </div>
              <div className="summary-row">
                <span>Taxes</span>
                <span>Calculated next</span>
              </div>
              <div className="summary-row summary-row--total">
                <span>Total</span>
                <span>{formatMoney(subtotal)}</span>
              </div>
              <Link href="/checkout" className="btn btn--wide btn--accent">
                Secure checkout
              </Link>
              <p className="checkout-note">
                Stripe test mode only. Shipping and taxes are not charged in
                this test phase.
              </p>
            </aside>
          </div>
        </div>
      </section>
    </main>
  );
}
