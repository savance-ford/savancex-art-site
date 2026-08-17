import Link from "next/link";
import type { Ref } from "react";
import { ChevronIcon } from "@/components/ui/Icons";

interface MainNavigationProps {
  readonly isMegaMenuOpen: boolean;
  readonly triggerRef: Ref<HTMLButtonElement>;
  readonly onNavigate: () => void;
  readonly onToggleMegaMenu: () => void;
}

export function MainNavigation({
  isMegaMenuOpen,
  triggerRef,
  onNavigate,
  onToggleMegaMenu,
}: MainNavigationProps) {
  return (
    <nav className="main-nav" aria-label="Primary navigation">
      <Link href="/" className="nav-link" onClick={onNavigate}>
        Home
      </Link>
      <button
        ref={triggerRef}
        type="button"
        className="nav-trigger"
        data-action="toggle-mega"
        aria-expanded={isMegaMenuOpen}
        onClick={onToggleMegaMenu}
      >
        Shop <ChevronIcon />
      </button>
      <Link
        href="/collections/after-hours"
        className="nav-link"
        onClick={onNavigate}
      >
        Collections
      </Link>
      <Link href="/contact" className="nav-link" onClick={onNavigate}>
        Support
      </Link>
    </nav>
  );
}
