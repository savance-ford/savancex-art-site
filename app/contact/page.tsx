import type { Metadata } from "next";
import Link from "next/link";
import { ContactForm } from "@/components/forms/ContactForm";
import { AnnouncementMarquee } from "@/components/layout/AnnouncementMarquee";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";

export const metadata: Metadata = {
  title: "Contact",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <main id="main">
      <AnnouncementMarquee />
      <section className="content-page">
        <div className="container">
          <div className="contact-layout">
            <div className="prose">
              <Breadcrumbs
                items={[{ label: "Home", href: "/" }, { label: "Contact" }]}
              />
              <h1>Get in touch.</h1>
              <p>
                Questions about sizing, an order, a product, or a future drop?
                This form demonstrates the support flow and success state.
              </p>
              <div className="support-cards">
                <div className="support-card">
                  <div>
                    <h3>Email support</h3>
                    <p>Response within 24 hours</p>
                  </div>
                  <strong>support@example.com</strong>
                </div>
                <div className="support-card">
                  <div>
                    <h3>Instagram</h3>
                    <p>Response within 48 hours</p>
                  </div>
                  <strong>@noctra.placeholder</strong>
                </div>
                <div className="support-card">
                  <div>
                    <h3>Order status</h3>
                    <p>Use your order number and email</p>
                  </div>
                  <Link href="/track-order">Track →</Link>
                </div>
              </div>
            </div>
            <ContactForm />
          </div>
        </div>
      </section>
    </main>
  );
}
