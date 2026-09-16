"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function StorefrontError({
  error,
  reset,
}: {
  readonly error: Error & { digest?: string };
  readonly reset: () => void;
}) {
  useEffect(() => {
    console.error("Storefront route failed.", error);
  }, [error]);

  return (
    <main id="main">
      <section className="content-page">
        <div className="container empty-state">
          <div>
            <h1>Signal interrupted.</h1>
            <p>The storefront catalog is temporarily unavailable.</p>
            <button type="button" className="btn" onClick={reset}>
              Try again
            </button>
            <Link href="/" className="text-link" style={{ marginTop: 16 }}>
              Return home
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
