import Link from "next/link";

const CUSTOMER_CARE_LINKS = [
  { href: "/contact", label: "Contact us" },
  { href: "/track-order", label: "Order status" },
  { href: "/size-guide", label: "Size guide" },
  { href: "/wash-guide", label: "Wash guide" },
  { href: "/shipping", label: "Shipping information" },
  { href: "/reviews", label: "Reviews" },
] as const;

export function CustomerCareNavigation() {
  return (
    <aside className="content-nav">
      <h2>Customer care</h2>
      <ul>
        {CUSTOMER_CARE_LINKS.map((link) => (
          <li key={link.href}>
            <Link href={link.href}>{link.label}</Link>
          </li>
        ))}
      </ul>
    </aside>
  );
}
