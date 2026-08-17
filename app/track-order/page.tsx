import type { Metadata } from "next";
import { TrackingForm } from "@/components/forms/TrackingForm";
import { AnnouncementMarquee } from "@/components/layout/AnnouncementMarquee";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";

export const metadata: Metadata = {
  title: "Track Order",
  alternates: { canonical: "/track-order" },
};

export default function TrackOrderPage() {
  return (
    <main id="main">
      <AnnouncementMarquee />
      <section className="content-page">
        <div className="container">
          <div className="contact-layout">
            <div className="prose">
              <Breadcrumbs
                items={[
                  { label: "Home", href: "/" },
                  { label: "Order status" },
                ]}
              />
              <h1>Track your order.</h1>
              <p>
                Enter an order number and email address to preview the tracking
                flow. This prototype returns a sample status rather than
                contacting a carrier.
              </p>
            </div>
            <TrackingForm />
          </div>
        </div>
      </section>
    </main>
  );
}
