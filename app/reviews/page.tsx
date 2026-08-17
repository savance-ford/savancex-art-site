import type { Metadata } from "next";
import { AnnouncementMarquee } from "@/components/layout/AnnouncementMarquee";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { reviews } from "@/data/reviews";

export const metadata: Metadata = {
  title: "Reviews",
  alternates: { canonical: "/reviews" },
};

export default function ReviewsPage() {
  return (
    <main id="main">
      <AnnouncementMarquee />
      <section className="content-page">
        <div className="container">
          <Breadcrumbs
            items={[{ label: "Home", href: "/" }, { label: "Reviews" }]}
          />
          <div className="section-head">
            <div>
              <span className="kicker">Verified-style feedback</span>
              <h1 className="display">Customer reviews.</h1>
            </div>
            <p>
              Original placeholder reviews demonstrate the social-proof layout
              and filtering-ready card structure.
            </p>
          </div>
          <div className="review-summary">
            <div style={{ background: "var(--ink)", color: "var(--white)" }}>
              <span className="kicker">Overall rating</span>
              <div className="stats__value">4.9</div>
              <div className="stars" aria-label="5 out of 5 stars">
                ★★★★★
              </div>
            </div>
            <div>
              <span className="eyebrow">Review count</span>
              <div className="stats__value">1,250+</div>
              <p>Verified customer reviews</p>
            </div>
            <div>
              <span className="eyebrow">Recommendation</span>
              <div className="stats__value">99%</div>
              <p>Would recommend to a friend</p>
            </div>
          </div>
          <div className="review-list">
            {reviews.map((review) => (
              <article className="review-card" key={`${review.name}-${review.title}`}>
                <div
                  className="stars"
                  aria-label={`${review.rating} out of 5 stars`}
                >
                  {"★".repeat(review.rating)}
                </div>
                <h3>{review.title}</h3>
                <p>{review.body}</p>
                <div className="review-card__bottom">
                  <strong>{review.name}</strong>
                  <span>{review.product}</span>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
