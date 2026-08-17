interface ProductRatingProps {
  readonly rating: number;
  readonly reviews: number;
  readonly className?: string;
}

export function ProductRating({
  rating,
  reviews,
  className,
}: ProductRatingProps) {
  const classes = ["product-rating", className].filter(Boolean).join(" ");

  return (
    <div className={classes}>
      <span className="stars" aria-hidden="true">
        ★★★★★
      </span>
      <span>
        {rating} ({reviews})
      </span>
    </div>
  );
}
