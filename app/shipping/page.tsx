import type { Metadata } from "next";
import { AnnouncementMarquee } from "@/components/layout/AnnouncementMarquee";
import { CustomerCareNavigation } from "@/components/layout/CustomerCareNavigation";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";

export const metadata: Metadata = {
  title: "Shipping Information",
  alternates: { canonical: "/shipping" },
};

export default function ShippingPage() {
  return (
    <main id="main">
      <AnnouncementMarquee />
      <section className="content-page">
        <div className="container content-grid">
          <CustomerCareNavigation />
          <article className="prose">
            <Breadcrumbs
              items={[
                { label: "Home", href: "/" },
                { label: "Shipping information" },
              ]}
            />
            <h1>Shipping information</h1>
            <p>
              This page demonstrates the information architecture for shipping
              expectations. It does not connect to a real carrier or fulfillment
              service.
            </p>
            <h2>Production time</h2>
            <p>
              Placeholder estimate: 2–5 business days before dispatch.
              Pre-orders and limited drops may require additional time.
            </p>
            <h2>United States</h2>
            <p>
              Standard delivery: 3–7 business days after dispatch. Free standard
              shipping is shown for orders over $75.
            </p>
            <h2>International</h2>
            <p>
              Placeholder estimate: 7–18 business days. Duties, taxes, and
              import fees may be collected by the destination country.
            </p>
            <h2>Tracking</h2>
            <p>
              Customers would normally receive a shipping confirmation email
              containing a carrier tracking link.
            </p>
            <h2>Lost or damaged packages</h2>
            <p>
              Provide a clear contact path and list the evidence required, such
              as an order number and package photos.
            </p>
          </article>
        </div>
      </section>
    </main>
  );
}
