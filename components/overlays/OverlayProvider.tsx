"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

export type StorefrontOverlay = "cart" | "search" | "mobile" | "filter";

interface OverlayContextValue {
  readonly activeOverlay: StorefrontOverlay | null;
  readonly searchQuery: string;
  readonly setSearchQuery: (query: string) => void;
  readonly openCartDrawer: () => void;
  readonly openSearchOverlay: () => void;
  readonly openMobileNavigation: () => void;
  readonly openFilterDrawer: () => void;
  readonly closeOverlay: () => void;
}

const OverlayContext = createContext<OverlayContextValue | undefined>(undefined);

export function OverlayProvider({ children }: { readonly children: ReactNode }) {
  const [activeOverlay, setActiveOverlay] =
    useState<StorefrontOverlay | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const openerRef = useRef<HTMLElement | null>(null);

  const rememberOpener = useCallback(() => {
    openerRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
  }, []);

  const closeOverlay = useCallback(() => {
    setActiveOverlay(null);

    const opener = openerRef.current;
    openerRef.current = null;
    if (opener) requestAnimationFrame(() => opener.focus());
  }, []);
  const openCartDrawer = useCallback(() => {
    rememberOpener();
    setActiveOverlay("cart");
  }, [rememberOpener]);
  const openMobileNavigation = useCallback(() => {
    rememberOpener();
    setActiveOverlay("mobile");
  }, [rememberOpener]);
  const openFilterDrawer = useCallback(() => {
    rememberOpener();
    setActiveOverlay("filter");
  }, [rememberOpener]);
  const openSearchOverlay = useCallback(() => {
    rememberOpener();
    setSearchQuery("");
    setActiveOverlay("search");
  }, [rememberOpener]);

  useEffect(() => {
    document.body.classList.toggle("is-locked", activeOverlay !== null);

    return () => document.body.classList.remove("is-locked");
  }, [activeOverlay]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") closeOverlay();
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [closeOverlay]);

  const value = useMemo<OverlayContextValue>(
    () => ({
      activeOverlay,
      searchQuery,
      setSearchQuery,
      openCartDrawer,
      openSearchOverlay,
      openMobileNavigation,
      openFilterDrawer,
      closeOverlay,
    }),
    [
      activeOverlay,
      searchQuery,
      openCartDrawer,
      openSearchOverlay,
      openMobileNavigation,
      openFilterDrawer,
      closeOverlay,
    ],
  );

  return (
    <OverlayContext.Provider value={value}>{children}</OverlayContext.Provider>
  );
}

export function useStorefrontOverlay(): OverlayContextValue {
  const context = useContext(OverlayContext);

  if (!context) {
    throw new Error("useStorefrontOverlay must be used within OverlayProvider");
  }

  return context;
}
