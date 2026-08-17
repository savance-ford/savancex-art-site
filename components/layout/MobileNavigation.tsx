"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useStorefrontOverlay } from "@/components/overlays/OverlayProvider";
import { usePortalRoot } from "@/components/overlays/usePortalRoot";
import { CloseIcon } from "@/components/ui/Icons";

export function MobileNavigation() {
  const { activeOverlay, closeOverlay } = useStorefrontOverlay();
  const isOpen = activeOverlay === "mobile";
  const overlayRoot = usePortalRoot("overlay-root");
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const animationFrame = requestAnimationFrame(() =>
      closeButtonRef.current?.focus(),
    );
    return () => cancelAnimationFrame(animationFrame);
  }, [isOpen]);

  if (!overlayRoot) return null;

  return createPortal(
    <nav
      className={`mobile-nav${isOpen ? " is-open" : ""}`}
      aria-label="Mobile navigation"
      aria-hidden={!isOpen}
      inert={!isOpen}
    >
      <div className="mobile-nav__head">
        <Link href="/" className="wordmark" onClick={closeOverlay}>
          <Image src="/assets/logo.svg" alt="NOCTRA" width={700} height={180} />
        </Link>
        <button
          ref={closeButtonRef}
          type="button"
          className="icon-button"
          data-action="close-mobile"
          aria-label="Close menu"
          onClick={closeOverlay}
        >
          <CloseIcon />
        </button>
      </div>
      <div className="mobile-nav__body">
        <h3>Shop</h3>
        <Link href="/shop" onClick={closeOverlay}>
          Shop all
        </Link>
        <Link href="/shop/t-shirts" onClick={closeOverlay}>
          T-Shirts
        </Link>
        <Link href="/shop/hoodies" onClick={closeOverlay}>
          Hoodies
        </Link>
        <Link href="/shop/crewnecks" onClick={closeOverlay}>
          Crewnecks
        </Link>
        <h3>Collections</h3>
        <Link href="/collections/after-hours" onClick={closeOverlay}>
          After Hours
        </Link>
        <Link href="/collections/static-bloom" onClick={closeOverlay}>
          Static Bloom
        </Link>
        <Link href="/collections/archive-01" onClick={closeOverlay}>
          Archive 01
        </Link>
        <h3>Brand</h3>
        <Link href="/about" onClick={closeOverlay}>
          Our story
        </Link>
        <Link href="/reviews" onClick={closeOverlay}>
          Reviews
        </Link>
        <div className="mobile-nav__utility">
          <Link href="/track-order" onClick={closeOverlay}>
            Order status
          </Link>
          <Link href="/contact" onClick={closeOverlay}>
            Contact
          </Link>
          <Link href="/size-guide" onClick={closeOverlay}>
            Size guide
          </Link>
          <Link href="/account" onClick={closeOverlay}>
            Account
          </Link>
        </div>
      </div>
    </nav>,
    overlayRoot,
  );
}
