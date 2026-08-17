import Link from "next/link";
import { Fragment } from "react";

export interface BreadcrumbItem {
  readonly label: string;
  readonly href?: string;
}

interface BreadcrumbsProps {
  readonly items: readonly BreadcrumbItem[];
}

export function Breadcrumbs({ items }: BreadcrumbsProps) {
  return (
    <nav className="breadcrumbs" aria-label="Breadcrumb">
      {items.map((item, index) => (
        <Fragment key={`${item.href ?? "current"}-${item.label}`}>
          {index > 0 ? " / " : null}
          {item.href ? <Link href={item.href}>{item.label}</Link> : item.label}
        </Fragment>
      ))}
    </nav>
  );
}
