import Link from "next/link";
import { ChevronIcon } from "@/components/ui/Icons";

interface MainNavigationProps {
  readonly isMegaMenuOpen: boolean;
  readonly onNavigate: () => void;
  readonly onToggleMegaMenu: () => void;
}

export function MainNavigation({
  isMegaMenuOpen,
  onNavigate,
  onToggleMegaMenu,
}: MainNavigationProps) {
  return (
    <nav className="main-nav" aria-label="Primary navigation">
      <Link href="/" className="nav-link" onClick={onNavigate}>
        Home
      </Link>
      <button
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
