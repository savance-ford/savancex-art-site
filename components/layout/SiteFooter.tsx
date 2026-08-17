import Image from "next/image";
import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-grid">
          <div className="footer-col">
            <h3>About</h3>
            <ul>
              <li>
                <Link href="/about">Our story</Link>
              </li>
              <li>
                <Link href="/reviews">Reviews</Link>
              </li>
              <li>
                <a href="#">Community</a>
              </li>
            </ul>
          </div>
          <div className="footer-col">
            <h3>Customer care</h3>
            <ul>
              <li>
                <Link href="/contact">Contact us</Link>
              </li>
              <li>
                <Link href="/track-order">Track your order</Link>
              </li>
              <li>
                <Link href="/shipping">Shipping &amp; returns</Link>
              </li>
              <li>
                <Link href="/size-guide">Size guide</Link>
              </li>
              <li>
                <Link href="/wash-guide">Wash guide</Link>
              </li>
            </ul>
          </div>
          <div className="footer-col">
            <h3>Quick links</h3>
            <ul>
              <li>
                <Link href="/shop">Shop all</Link>
              </li>
              <li>
                <Link href="/shop/t-shirts">T-Shirts</Link>
              </li>
              <li>
                <Link href="/shop/hoodies">Hoodies</Link>
              </li>
              <li>
                <Link href="/shop/crewnecks">Crewnecks</Link>
              </li>
            </ul>
          </div>
          <div className="footer-brand">
              <Image
                src="/assets/logo.svg"
                alt="NOCTRA"
                width={700}
                height={180}
                style={{ height: "auto" }}
              />
            <p>
              An original placeholder streetwear brand used to demonstrate the
              reference store&apos;s UX pattern without copying its identity or
              artwork.
            </p>
            <div className="footer-country">
              <span>Country/region</span>
              <button type="button">United States (USD $)⌄</button>
            </div>
            <div className="socials">
              <a href="#">Instagram</a>
              <a href="#">TikTok</a>
              <a href="#">Pinterest</a>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© 2026 NOCTRA</span>
          <div>
            <a href="#">Privacy</a>
            <a href="#">Terms</a>
            <a href="#">Accessibility</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
