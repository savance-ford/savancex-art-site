"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { CartLine } from "@/components/cart/CartLine";
import { CartProgress } from "@/components/cart/CartProgress";
import { getCartLineKey, useCart } from "@/components/cart/CartProvider";
import { OverlayBackdrop } from "@/components/overlays/OverlayBackdrop";
import { useStorefrontOverlay } from "@/components/overlays/OverlayProvider";
import { usePortalRoot } from "@/components/overlays/usePortalRoot";
import { CloseIcon } from "@/components/ui/Icons";
import { formatMoney } from "@/lib/formatting/money";

export function CartDrawer() {
  const {
    lines,
    cartCount,
    subtotal,
    isCartDrawerOpen,
    catalogAvailable,
  } = useCart();
  const { closeOverlay } = useStorefrontOverlay();
  const overlayRoot = usePortalRoot("overlay-root");
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isCartDrawerOpen) return;

    const animationFrame = requestAnimationFrame(() =>
      closeButtonRef.current?.focus(),
    );
    return () => cancelAnimationFrame(animationFrame);
  }, [isCartDrawerOpen]);

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
            ref={closeButtonRef}
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
                key={getCartLineKey(line)}
                line={line}
              />
            ))
          ) : (
            <div className="empty-state" style={{ minHeight: 360 }}>
              <div>
                <h2>
                  {catalogAvailable
                    ? "Your bag is empty."
                    : "Signal interrupted."}
                </h2>
                <p>
                  {catalogAvailable
                    ? "Browse the latest signal."
                    : "The storefront catalog is temporarily unavailable."}
                </p>
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
