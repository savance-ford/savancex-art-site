import Link from "next/link";

export default function NotFound() {
  return (
    <main id="main" className="empty-state">
      <div>
        <span className="kicker">404</span>
        <h1>Signal lost.</h1>
        <p>The page you requested is not part of this storefront.</p>
        <Link href="/" className="btn">
          Return home
        </Link>
      </div>
    </main>
  );
}
