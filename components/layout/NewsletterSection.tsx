"use client";

import { useState } from "react";
import { useToast } from "@/components/overlays/ToastProvider";

const TOAST_MESSAGE = "Newsletter signup saved in prototype";

export function NewsletterSection() {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const { showToast } = useToast();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitted(true);
    showToast(TOAST_MESSAGE);
  }

  return (
    <>
      <section className="reference-newsletter">
        <div className="container reference-newsletter__inner">
          <div>
            <span className="reference-newsletter__emoji">🔥</span>
            <h2>Join the Club</h2>
            <p>
              Sign up for 10% off your first order, early drop access, and
              members-only restock alerts.
            </p>
          </div>
          <form
            className="reference-newsletter__form"
            data-form="newsletter"
            onSubmit={handleSubmit}
          >
            {isSubmitted ? (
              <strong style={{ padding: "18px 0" }}>
                You’re on the list. Welcome to the night shift.
              </strong>
            ) : (
              <>
                <label className="sr-only" htmlFor="newsletter-email">
                  Email address
                </label>
                <input
                  id="newsletter-email"
                  type="email"
                  name="email"
                  placeholder="Enter your email address"
                  required
                />
                <button type="submit">Get 10% off</button>
              </>
            )}
          </form>
        </div>
      </section>
    </>
  );
}
