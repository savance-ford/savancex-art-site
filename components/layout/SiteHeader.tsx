"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useCart } from "@/components/cart/CartProvider";
import { MainNavigation } from "@/components/layout/MainNavigation";
import { MegaMenu } from "@/components/layout/MegaMenu";
import { useStorefrontOverlay } from "@/components/overlays/OverlayProvider";
import { BagIcon, MenuIcon, SearchIcon } from "@/components/ui/Icons";

export function SiteHeader() {
  const [isMegaMenuOpen, setIsMegaMenuOpen] = useState(false);
  const megaMenuTriggerRef = useRef<HTMLButtonElement>(null);
  const { cartCount, openCartDrawer } = useCart();
  const {
    openSearchOverlay,
    openMobileNavigation,
    closeOverlay,
  } = useStorefrontOverlay();

  const closeNavigation = useCallback(() => {
    setIsMegaMenuOpen(false);
    closeOverlay();
  }, [closeOverlay]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape" || !isMegaMenuOpen) return;

      setIsMegaMenuOpen(false);
      requestAnimationFrame(() => megaMenuTriggerRef.current?.focus());
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isMegaMenuOpen]);

  function toggleMegaMenu() {
    setIsMegaMenuOpen((isOpen) => !isOpen);
    closeOverlay();
  }

  function handleOpenMobileNavigation() {
    setIsMegaMenuOpen(false);
    openMobileNavigation();
  }

  function handleOpenSearchOverlay() {
    setIsMegaMenuOpen(false);
    openSearchOverlay();
  }

  function handleOpenCartDrawer() {
    setIsMegaMenuOpen(false);
    openCartDrawer();
  }

  return (
    <>
      <header className="site-header">
        <div className="site-header__inner">
          <button
            type="button"
            className="icon-button mobile-menu-button"
            data-action="open-mobile"
            aria-label="Open menu"
            onClick={handleOpenMobileNavigation}
          >
            <MenuIcon />
          </button>
          <MainNavigation
            isMegaMenuOpen={isMegaMenuOpen}
            triggerRef={megaMenuTriggerRef}
            onNavigate={closeNavigation}
            onToggleMegaMenu={toggleMegaMenu}
          />
          <Link href="/" className="wordmark" onClick={closeNavigation}>
            <Image
              src="/assets/logo.svg"
              alt="NOCTRA"
              width={700}
              height={180}
              priority
            />
          </Link>
          <div className="header-actions">
            <button
              type="button"
              className="header-text-action"
              data-action="open-search"
              aria-label="Search"
              onClick={handleOpenSearchOverlay}
            >
              Search
            </button>
            <Link
              href="/account"
              className="header-text-action account-action"
              onClick={closeNavigation}
            >
              Log in
            </Link>
            <button
              type="button"
              className="header-text-action cart-button"
              data-action="open-cart"
              aria-label="Open cart"
              onClick={handleOpenCartDrawer}
            >
              Cart <span className="cart-count" data-cart-count>{cartCount}</span>
            </button>
            <button
              type="button"
              className="icon-button header-icon-search"
              data-action="open-search"
              aria-label="Search"
              onClick={handleOpenSearchOverlay}
            >
              <SearchIcon />
            </button>
            <button
              type="button"
              className="icon-button header-icon-cart"
              data-action="open-cart"
              aria-label="Open cart"
              onClick={handleOpenCartDrawer}
            >
              <BagIcon />
              <span className="cart-count" data-cart-count>{cartCount}</span>
            </button>
          </div>
        </div>
      </header>
      <MegaMenu isOpen={isMegaMenuOpen} onNavigate={closeNavigation} />
    </>
  );
}
