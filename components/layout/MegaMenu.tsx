import Image from "next/image";
import Link from "next/link";

interface MegaMenuProps {
  readonly isOpen: boolean;
  readonly onNavigate: () => void;
}

export function MegaMenu({ isOpen, onNavigate }: MegaMenuProps) {
  return (
    <div className={`mega-menu${isOpen ? " is-open" : ""}`} id="mega-menu">
      <div className="mega-menu__inner">
        <div>
          <h3>Shop</h3>
          <ul>
            <li>
              <Link href="/shop" onClick={onNavigate}>
                Shop all
              </Link>
            </li>
            <li>
              <Link href="/shop/t-shirts" onClick={onNavigate}>
                T-Shirts
              </Link>
            </li>
            <li>
              <Link href="/shop/hoodies" onClick={onNavigate}>
                Hoodies
              </Link>
            </li>
            <li>
              <Link href="/shop/crewnecks" onClick={onNavigate}>
                Crewnecks
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <h3>Collections</h3>
          <ul>
            <li>
              <Link href="/collections/after-hours" onClick={onNavigate}>
                After Hours
              </Link>
            </li>
            <li>
              <Link href="/collections/static-bloom" onClick={onNavigate}>
                Static Bloom
              </Link>
            </li>
            <li>
              <Link href="/collections/archive-01" onClick={onNavigate}>
                Archive 01
              </Link>
            </li>
          </ul>
        </div>
        <Link
          href="/collections/after-hours"
          className="mega-menu__feature"
          onClick={onNavigate}
        >
          <Image
            src="/assets/editorial/editorial-a.jpg"
            alt="After Hours collection placeholder"
            width={3648}
            height={4560}
          />
          <div className="mega-menu__feature-copy">
            <span className="eyebrow">Newest drop</span>
            <strong>After Hours</strong>
            <span>Shop collection →</span>
          </div>
        </Link>
      </div>
    </div>
  );
}
