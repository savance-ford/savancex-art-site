import Link from "next/link";
import { AnnouncementMarquee } from "@/components/layout/AnnouncementMarquee";

export default function NotFound() {
  return (
    <main id="main">
      <AnnouncementMarquee />
      <section className="empty-state">
        <div>
          <span className="kicker">404</span>
          <h2>Signal lost.</h2>
          <p>The page you requested is not part of this prototype.</p>
          <Link href="/" className="btn">
            Return home
          </Link>
        </div>
      </section>
    </main>
  );
}
