const ANNOUNCEMENT = "🚀 FREE SHIPPING OVER $75 📦";
const ANNOUNCEMENT_COUNT = 8;

function AnnouncementGroup({ hidden = false }: { readonly hidden?: boolean }) {
  return (
    <div className="marquee__group" aria-hidden={hidden || undefined}>
      {Array.from({ length: ANNOUNCEMENT_COUNT }, (_, index) => (
        <span key={index}>{ANNOUNCEMENT}</span>
      ))}
    </div>
  );
}

export function AnnouncementMarquee() {
  return (
    <div className="announcement" aria-label="Store announcement">
      <div className="marquee">
        <AnnouncementGroup />
        <AnnouncementGroup hidden />
      </div>
    </div>
  );
}
