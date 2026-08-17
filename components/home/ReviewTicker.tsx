import { Fragment } from "react";

const REVIEW_ITEMS = [
  "👾 The weight and fit are perfect — Morgan",
  "❤️‍🔥 The print feels premium, not plasticky — Dani",
  "🏁 Finally an oversized hoodie that holds its shape — Chris",
  "✦ Better in person and still looks new after washing — Taylor",
] as const;

function ReviewTickerGroup({ hidden = false }: { readonly hidden?: boolean }) {
  return (
    <div className="marquee__group" aria-hidden={hidden || undefined}>
      {REVIEW_ITEMS.map((item, index) => (
        <Fragment key={item}>
          {index > 0 ? <span>・</span> : null}
          <span>{item}</span>
        </Fragment>
      ))}
    </div>
  );
}

export function ReviewTicker() {
  return (
    <div className="review-ticker">
      <div className="marquee">
        <ReviewTickerGroup />
        <ReviewTickerGroup hidden />
      </div>
    </div>
  );
}
