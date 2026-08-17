"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const TOAST_MESSAGE = "Newsletter signup saved in prototype";

export function NewsletterSection() {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isToastMounted, setIsToastMounted] = useState(false);
  const [isToastVisible, setIsToastVisible] = useState(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const removeTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const animationFrame = useRef<number>(undefined);
  const toastRoot =
    typeof document === "undefined"
      ? null
      : document.getElementById("toast-root");

  useEffect(() => {
    return () => {
      if (animationFrame.current) cancelAnimationFrame(animationFrame.current);
      if (hideTimer.current) clearTimeout(hideTimer.current);
      if (removeTimer.current) clearTimeout(removeTimer.current);
    };
  }, []);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitted(true);
    setIsToastMounted(true);
    setIsToastVisible(false);

    animationFrame.current = requestAnimationFrame(() => {
      setIsToastVisible(true);
    });
    hideTimer.current = setTimeout(() => setIsToastVisible(false), 2600);
    removeTimer.current = setTimeout(() => setIsToastMounted(false), 3000);
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
      {toastRoot && isToastMounted
        ? createPortal(
            <div className={`toast${isToastVisible ? " is-visible" : ""}`}>
              {TOAST_MESSAGE}
            </div>,
            toastRoot,
          )
        : null}
    </>
  );
}
