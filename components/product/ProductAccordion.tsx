"use client";

import { useState } from "react";

const ACCORDION_ITEMS = [
  {
    title: "Shipping & delivery",
    body: "Orders are prepared in 2–5 business days. Estimated US delivery is 3–7 business days after dispatch. This prototype does not calculate live rates.",
    open: true,
  },
  {
    title: "90-day quality warranty",
    body: "Placeholder policy: manufacturing defects are eligible for replacement for 90 days after fulfillment.",
    open: false,
  },
  {
    title: "Size chart",
    body: "Standard US unisex sizing. T-shirts use a boxy cut; hoodies are intentionally oversized. Visit the full size guide for garment measurements.",
    open: false,
  },
  {
    title: "Climate commitment",
    body: "Placeholder sustainability section for ethical production, lower-waste made-to-order workflows, recyclable packaging, and carbon-aware shipping.",
    open: false,
  },
  {
    title: "Returns",
    body: "Placeholder policy: unworn items may be requested for return within 14 days. Final terms should be replaced before launch.",
    open: false,
  },
] as const;

export function ProductAccordion() {
  const [openItems, setOpenItems] = useState<ReadonlySet<number>>(
    () => new Set(ACCORDION_ITEMS.flatMap((item, index) => (item.open ? [index] : []))),
  );

  function toggleItem(index: number) {
    setOpenItems((current) => {
      const next = new Set(current);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  return (
    <div className="accordion">
      {ACCORDION_ITEMS.map((item, index) => {
        const isOpen = openItems.has(index);

        return (
          <div
            className={`accordion__item${isOpen ? " is-open" : ""}`}
            key={item.title}
          >
            <button
              type="button"
              className="accordion__trigger"
              data-action="accordion"
              aria-expanded={isOpen}
              onClick={() => toggleItem(index)}
            >
              <span>{item.title}</span>
              <span>+</span>
            </button>
            <div className="accordion__panel">{item.body}</div>
          </div>
        );
      })}
    </div>
  );
}
