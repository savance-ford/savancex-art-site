"use client";

import Link from "next/link";
import { createPortal } from "react-dom";
import { CartLine } from "@/components/cart/CartLine";
import { CartProgress } from "@/components/cart/CartProgress";
import { useCart } from "@/components/cart/CartProvider";
import { OverlayBackdrop } from "@/components/overlays/OverlayBackdrop";
import { useStorefrontOverlay } from "@/components/overlays/OverlayProvider";
import { usePortalRoot } from "@/components/overlays/usePortalRoot";
import { CloseIcon } from "@/components/ui/Icons";
import { formatMoney } from "@/lib/formatting/money";

export function CartDrawer() {
  const { lines, cartCount, subtotal, isCartDrawerOpen } = useCart();
  const { closeOverlay } = useStorefrontOverlay();
  const overlayRoot = usePortalRoot("overlay-root");

  if (!overlayRoot) return null;

  return createPortal(
    <>
      <OverlayBackdrop isOpen={isCartDrawerOpen} onClose={closeOverlay} />
      <aside
        className={`drawer${isCartDrawerOpen ? " is-open" : ""}`}
        aria-label="Shopping cart"
        aria-hidden={!isCartDrawerOpen}
        inert={!isCartDrawerOpen}
      >
        <div className="drawer__head">
          <h2>Your cart ({cartCount})</h2>
          <button
            type="button"
            className="icon-button"
            data-action="close-cart"
            aria-label="Close cart"
            onClick={closeOverlay}
          >
            <CloseIcon />
          </button>
        </div>
        <div className="drawer__body">
          <CartProgress subtotal={subtotal} />
          {lines.length ? (
            lines.map((line) => (
              <CartLine
                key={`${line.productId}::${line.color}::${line.size}`}
                line={line}
              />
            ))
          ) : (
            <div className="empty-state" style={{ minHeight: 360 }}>
              <div>
                <h2>Your bag is empty.</h2>
                <p>Browse the latest signal.</p>
                <Link href="/shop" className="btn" onClick={closeOverlay}>
                  Continue shopping
                </Link>
              </div>
            </div>
          )}
        </div>
        {lines.length ? (
          <div className="drawer__foot">
            <div className="summary-row summary-row--total">
              <span>Subtotal</span>
              <span>{formatMoney(subtotal)}</span>
            </div>
            <Link
              href="/checkout"
              className="btn btn--wide btn--accent"
              onClick={closeOverlay}
            >
              Secure checkout
            </Link>
            <Link
              href="/cart"
              className="text-link"
              style={{ marginTop: 16 }}
              onClick={closeOverlay}
            >
              View cart
            </Link>
          </div>
        ) : null}
      </aside>
    </>,
    overlayRoot,
  );
}
