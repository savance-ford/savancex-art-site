"use client";

import Image from "next/image";
import Link from "next/link";
import { createPortal } from "react-dom";
import { CloseIcon } from "@/components/ui/Icons";

interface MobileNavigationProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
}

export function MobileNavigation({ isOpen, onClose }: MobileNavigationProps) {
  const overlayRoot =
    typeof document === "undefined"
      ? null
      : document.getElementById("overlay-root");

  if (!overlayRoot) return null;

  return createPortal(
    <nav
      className={`mobile-nav${isOpen ? " is-open" : ""}`}
      aria-label="Mobile navigation"
      aria-hidden={!isOpen}
      inert={!isOpen}
    >
      <div className="mobile-nav__head">
        <Link href="/" className="wordmark" onClick={onClose}>
          <Image src="/assets/logo.svg" alt="NOCTRA" width={700} height={180} />
        </Link>
        <button
          type="button"
          className="icon-button"
          data-action="close-mobile"
          aria-label="Close menu"
          onClick={onClose}
        >
          <CloseIcon />
        </button>
      </div>
      <div className="mobile-nav__body">
        <h3>Shop</h3>
        <Link href="/shop" onClick={onClose}>
          Shop all
        </Link>
        <Link href="/shop/t-shirts" onClick={onClose}>
          T-Shirts
        </Link>
        <Link href="/shop/hoodies" onClick={onClose}>
          Hoodies
        </Link>
        <Link href="/shop/crewnecks" onClick={onClose}>
          Crewnecks
        </Link>
        <h3>Collections</h3>
        <Link href="/collections/after-hours" onClick={onClose}>
          After Hours
        </Link>
        <Link href="/collections/static-bloom" onClick={onClose}>
          Static Bloom
        </Link>
        <Link href="/collections/archive-01" onClick={onClose}>
          Archive 01
        </Link>
        <h3>Brand</h3>
        <Link href="/about" onClick={onClose}>
          Our story
        </Link>
        <Link href="/reviews" onClick={onClose}>
          Reviews
        </Link>
        <div className="mobile-nav__utility">
          <Link href="/track-order" onClick={onClose}>
            Order status
          </Link>
          <Link href="/contact" onClick={onClose}>
            Contact
          </Link>
          <Link href="/size-guide" onClick={onClose}>
            Size guide
          </Link>
          <Link href="/account" onClick={onClose}>
            Account
          </Link>
        </div>
      </div>
    </nav>,
    overlayRoot,
  );
}
