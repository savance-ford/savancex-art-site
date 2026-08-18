"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { useCart } from "@/components/cart/CartProvider";
import { useStorefrontOverlay } from "@/components/overlays/OverlayProvider";
import { usePortalRoot } from "@/components/overlays/usePortalRoot";
import { ArrowIcon, CloseIcon } from "@/components/ui/Icons";
import {
  formatCommercePrice,
  hasVariableVariantPrices,
} from "@/lib/commerce/pricing";
import type { CatalogProduct } from "@/lib/commerce/types";

function getColorCount(product: CatalogProduct): number {
  return new Set(
    product.variants.map((variant) => variant.options.color),
  ).size;
}

function SearchProductCard({ product }: { readonly product: CatalogProduct }) {
  const { addItem } = useCart();
  const { closeOverlay } = useStorefrontOverlay();
  const badgeClass = !product.available ? " product-card__badge--sold" : "";
  const badge = !product.available ? "Sold out" : product.badge;
  const colorCount = getColorCount(product);

  return (
    <article className="product-card" data-product-card={product.id}>
      <div className="product-card__media">
        <Link
          href={`/products/${product.slug}`}
          className="product-card__image-link"
          aria-label={`View ${product.name}`}
          onClick={closeOverlay}
        >
          <span className={`product-card__badge${badgeClass}`}>{badge}</span>
          <Image
            src={product.image}
            alt={`${product.name} front placeholder`}
            width={800}
            height={1000}
            unoptimized
          />
          <Image
            src={product.alternateImage}
            alt={`${product.name} back placeholder`}
            width={800}
            height={1000}
            unoptimized
          />
        </Link>
        <button
          type="button"
          className="quick-add"
          data-action="quick-add"
          data-product={product.id}
          disabled={!product.available}
          onClick={() => addItem({ productId: product.id })}
        >
          {!product.available ? "Sold out" : "Quick add"}
        </button>
      </div>
      <div className="product-card__body">
        <h3 className="product-card__name">
          <Link href={`/products/${product.slug}`} onClick={closeOverlay}>
            {product.name}
          </Link>
        </h3>
        <div className="product-card__reviews">
          <span>★★★★★</span> <small>{product.reviewCount} reviews</small>
        </div>
        <div className="product-card__meta">
          <div className="product-card__price">
            <span className="product-card__compare">
              {product.compareAtPrice
                ? formatCommercePrice(product.compareAtPrice)
                : null}
            </span>
            <strong>
              {hasVariableVariantPrices(product.variants) ? "From " : ""}
              {formatCommercePrice(product.defaultPrice)}
            </strong>
          </div>
          <div
            className="product-card__dots"
            aria-label={`${colorCount} colors`}
          >
            <span />
            {colorCount > 1 ? <span /> : null}
          </div>
        </div>
      </div>
    </article>
  );
}

interface SearchOverlayProps {
  readonly products: readonly CatalogProduct[];
  readonly catalogAvailable: boolean;
}

export function SearchOverlay({
  products,
  catalogAvailable,
}: SearchOverlayProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const {
    activeOverlay,
    searchQuery,
    setSearchQuery,
    closeOverlay,
  } = useStorefrontOverlay();
  const isOpen = activeOverlay === "search";
  const normalizedQuery = searchQuery.trim().toLowerCase();
  const results = useMemo(
    () =>
      normalizedQuery
        ? products.filter((product) =>
            `${product.name} ${product.category} ${product.collection} ${product.description}`
              .toLowerCase()
              .includes(normalizedQuery),
          )
        : products.slice(0, 5),
    [normalizedQuery, products],
  );
  const overlayRoot = usePortalRoot("overlay-root");

  useEffect(() => {
    if (!isOpen) return;

    const animationFrame = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(animationFrame);
  }, [isOpen]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
    closeOverlay();
  }

  if (!overlayRoot) return null;

  return createPortal(
    <section
      className={`search-overlay${isOpen ? " is-open" : ""}`}
      aria-hidden={!isOpen}
      inert={!isOpen}
    >
      <div className="container search-overlay__head">
        <form className="search-overlay__form" onSubmit={handleSubmit}>
          <input
            ref={inputRef}
            name="q"
            type="search"
            value={searchQuery}
            placeholder="Search the store"
            aria-label="Search the store"
            autoComplete="off"
            onChange={(event) => setSearchQuery(event.target.value)}
          />
          <button
            type="button"
            className="icon-button"
            data-action="close-search"
            aria-label="Close search"
            onClick={closeOverlay}
          >
            <CloseIcon />
          </button>
        </form>
      </div>
      <div className="container search-results" id="overlay-search-results">
        <div className="section-head">
          <div>
            <span className="kicker">
              {normalizedQuery
                ? `${results.length} results`
                : "Popular searches"}
            </span>
            <h2 className="section-title">
              {normalizedQuery
                ? `Results for “${searchQuery}”`
                : "Start with a signal."}
            </h2>
          </div>
          {normalizedQuery ? (
            <Link
              href={`/search?q=${encodeURIComponent(searchQuery)}`}
              className="text-link"
              onClick={closeOverlay}
            >
              View results <ArrowIcon />
            </Link>
          ) : null}
        </div>
        {results.length ? (
          <div className={normalizedQuery ? "product-grid" : "product-rail"}>
            {results.slice(0, 8).map((product) => (
              <SearchProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <div>
              <h2>{catalogAvailable ? "No signal." : "Signal interrupted."}</h2>
              <p>
                {catalogAvailable
                  ? "Try another phrase."
                  : "The storefront catalog is temporarily unavailable."}
              </p>
            </div>
          </div>
        )}
      </div>
    </section>,
    overlayRoot,
  );
}
