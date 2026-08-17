import type { Metadata } from "next";
import { AccountForm } from "@/components/forms/AccountForm";
import { AnnouncementMarquee } from "@/components/layout/AnnouncementMarquee";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";

export const metadata: Metadata = {
  title: "Account",
  robots: { index: false, follow: false },
};

export default function AccountPage() {
  return (
    <main id="main">
      <AnnouncementMarquee />
      <section className="content-page">
        <div className="container">
          <div className="contact-layout">
            <div className="prose">
              <Breadcrumbs
                items={[{ label: "Home", href: "/" }, { label: "Account" }]}
              />
              <h1>Welcome back.</h1>
              <p>
                This placeholder account page demonstrates entry into order
                history, saved addresses, returns, and faster checkout.
              </p>
              <p>No authentication service is connected.</p>
            </div>
            <AccountForm />
          </div>
        </div>
      </section>
    </main>
  );
}
