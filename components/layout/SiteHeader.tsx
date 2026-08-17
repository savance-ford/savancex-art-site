"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { MainNavigation } from "@/components/layout/MainNavigation";
import { MegaMenu } from "@/components/layout/MegaMenu";
import { MobileNavigation } from "@/components/layout/MobileNavigation";
import { BagIcon, MenuIcon, SearchIcon } from "@/components/ui/Icons";

export function SiteHeader() {
  const [isMegaMenuOpen, setIsMegaMenuOpen] = useState(false);
  const [isMobileNavigationOpen, setIsMobileNavigationOpen] = useState(false);

  const closeNavigation = useCallback(() => {
    setIsMegaMenuOpen(false);
    setIsMobileNavigationOpen(false);
  }, []);

  useEffect(() => {
    document.body.classList.toggle("is-locked", isMobileNavigationOpen);

    return () => document.body.classList.remove("is-locked");
  }, [isMobileNavigationOpen]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") closeNavigation();
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [closeNavigation]);

  function toggleMegaMenu() {
    setIsMegaMenuOpen((isOpen) => !isOpen);
    setIsMobileNavigationOpen(false);
  }

  function openMobileNavigation() {
    setIsMegaMenuOpen(false);
    setIsMobileNavigationOpen(true);
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
            onClick={openMobileNavigation}
          >
            <MenuIcon />
          </button>
          <MainNavigation
            isMegaMenuOpen={isMegaMenuOpen}
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
            >
              Cart <span className="cart-count" data-cart-count>0</span>
            </button>
            <button
              type="button"
              className="icon-button header-icon-search"
              data-action="open-search"
              aria-label="Search"
            >
              <SearchIcon />
            </button>
            <button
              type="button"
              className="icon-button header-icon-cart"
              data-action="open-cart"
              aria-label="Open cart"
            >
              <BagIcon />
              <span className="cart-count" data-cart-count>0</span>
            </button>
          </div>
        </div>
      </header>
      <MegaMenu isOpen={isMegaMenuOpen} onNavigate={closeNavigation} />
      <MobileNavigation
        isOpen={isMobileNavigationOpen}
        onClose={closeNavigation}
      />
    </>
  );
}
