import Link from "next/link";

export function UtilityBar() {
  return (
    <div className="utility-bar">
      <div className="utility-bar__inner utility-bar__inner--reference">
        <span>Free U.S. shipping on orders over $75</span>
        <div className="utility-links">
          <Link href="/track-order">Track order</Link>
          <Link href="/contact">Contact</Link>
          <Link href="/reviews">Reviews</Link>
        </div>
      </div>
    </div>
  );
}
