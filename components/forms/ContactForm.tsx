"use client";

import { useState } from "react";
import { useToast } from "@/components/overlays/ToastProvider";

export function ContactForm() {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const { showToast } = useToast();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitted(true);
    showToast("Message received");
  }

  return (
    <form className="form-grid" data-form="contact" onSubmit={handleSubmit}>
      {isSubmitted ? (
        <div className="callout field--full" role="status">
          <strong>Message received.</strong>
          <br />
          This is a prototype success state; no email was sent.
        </div>
      ) : (
        <>
          <div className="field">
            <label htmlFor="contact-name">Name *</label>
            <input
              id="contact-name"
              name="name"
              placeholder="Full name"
              required
            />
          </div>
          <div className="field">
            <label htmlFor="contact-email">Email *</label>
            <input
              id="contact-email"
              type="email"
              name="email"
              placeholder="Email address"
              required
            />
          </div>
          <div className="field field--full">
            <label htmlFor="contact-order">Order number</label>
            <input
              id="contact-order"
              name="order"
              placeholder="Optional"
            />
          </div>
          <div className="field field--full">
            <label htmlFor="contact-message">Message *</label>
            <textarea
              id="contact-message"
              name="message"
              placeholder="How can we help?"
              required
            />
          </div>
          <div className="field field--full">
            <button className="btn btn--wide" type="submit">
              Send message
            </button>
          </div>
        </>
      )}
    </form>
  );
}
