import Link from "next/link";

export function ReviewProofSection() {
  return (
    <section className="reference-proof">
      <div className="container reference-proof__grid">
        <div className="reference-proof__intro">
          <h2>What our customers say.</h2>
          <Link href="/reviews">Read the reviews →</Link>
        </div>
        <div className="reference-proof__stat">
          <div className="reference-proof__stars">★★★★★</div>
          <strong>4.9/5</strong>
          <p>Average score from more than 1,250 verified-style reviews.</p>
        </div>
        <div className="reference-proof__stat">
          <div className="reference-proof__stars">★★★★★</div>
          <strong>99%</strong>
          <p>Would recommend NOCTRA to a friend.</p>
        </div>
      </div>
    </section>
  );
}
