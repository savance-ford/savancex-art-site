const TRUST_ITEMS = [
  {
    icon: "✦",
    title: "Printed to last",
    body: "Durable, soft-hand artwork designed to resist cracking.",
  },
  {
    icon: "☁",
    title: "Heavyweight blanks",
    body: "Structured cotton and fleece with deliberate drape.",
  },
  {
    icon: "↺",
    title: "Lower-waste runs",
    body: "Small-batch and made-to-order compatible product flow.",
  },
  {
    icon: "✓",
    title: "Quality warranty",
    body: "Clear reassurance directly on the product page.",
  },
] as const;

export function ProductTrustRow() {
  return (
    <div className="trust-row">
      {TRUST_ITEMS.map((item) => (
        <div className="trust-card" key={item.title}>
          <span className="trust-card__icon">{item.icon}</span>
          <strong>{item.title}</strong>
          <p>{item.body}</p>
        </div>
      ))}
    </div>
  );
}
