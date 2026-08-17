"use client";

import { useState } from "react";

export function TrackingForm() {
  const [hasResult, setHasResult] = useState(false);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setHasResult(true);
  }

  return (
    <form className="form-grid" data-form="tracking" onSubmit={handleSubmit}>
      <div className="field field--full">
        <label htmlFor="tracking-order">Order number</label>
        <input
          id="tracking-order"
          name="order"
          placeholder="#10042"
          required
        />
      </div>
      <div className="field field--full">
        <label htmlFor="tracking-email">Email address</label>
        <input
          id="tracking-email"
          type="email"
          name="email"
          placeholder="you@example.com"
          required
        />
      </div>
      <div className="field field--full">
        <button className="btn btn--wide" type="submit">
          Check status
        </button>
      </div>
      <div
        className="field field--full"
        id="tracking-result"
        aria-live="polite"
      >
        {hasResult ? (
          <div className="callout">
            <strong>Status: In transit</strong>
            <br />
            Sample update: Your order left the Los Angeles fulfillment studio
            and is moving toward the destination hub.
          </div>
        ) : null}
      </div>
    </form>
  );
}
