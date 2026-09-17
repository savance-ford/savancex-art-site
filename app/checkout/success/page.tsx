import type { Metadata } from "next";
import Link from "next/link";

import { ClearPaidCart } from "@/components/checkout/ClearPaidCart";
import type { DatabaseOrder } from "@/lib/orders/types";
import { formatMoney } from "@/lib/formatting/money";
import { getStripeClient } from "@/lib/stripe/client";
import { resolveOrderForCheckoutSession } from "@/lib/stripe/session-orders";

export const metadata: Metadata = {
  title: "Checkout status",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type CheckoutSuccessPageProps = {
  searchParams: Promise<{ session_id?: string | string[] }>;
};

type SuccessPageState = {
  order: DatabaseOrder | null;
  title: string;
  message: string;
};

function isTestCheckoutSessionId(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length <= 255 &&
    /^cs_test_[A-Za-z0-9]+$/.test(value)
  );
}

function describeOrder(order: DatabaseOrder): SuccessPageState {
  if (order.payment_status === "paid") {
    return {
      order,
      title: "Thank you.",
      message: "Your payment has been confirmed.",
    };
  }

  if (order.status === "payment_review") {
    return {
      order,
      title: "Payment under review.",
      message:
        "We received the payment update, but the order needs verification.",
    };
  }

  if (order.status === "payment_failed") {
    return {
      order,
      title: "Payment unsuccessful.",
      message: "Your cart has been kept so you can try checkout again.",
    };
  }

  if (order.status === "expired") {
    return {
      order,
      title: "Checkout expired.",
      message: "Your cart has been kept so you can start a new checkout.",
    };
  }

  return {
    order,
    title: "Thank you.",
    message:
      "Your payment confirmation is still processing. Refresh this page shortly.",
  };
}

async function loadSuccessState(
  sessionId: unknown,
): Promise<SuccessPageState> {
  if (!isTestCheckoutSessionId(sessionId)) {
    return {
      order: null,
      title: "Checkout status unavailable.",
      message: "This Checkout Session link is invalid or incomplete.",
    };
  }

  try {
    const session = await getStripeClient().checkout.sessions.retrieve(
      sessionId,
    );
    const order = await resolveOrderForCheckoutSession(session);
    return describeOrder(order);
  } catch {
    return {
      order: null,
      title: "Checkout status unavailable.",
      message: "We could not verify this Checkout Session.",
    };
  }
}

export default async function CheckoutSuccessPage({
  searchParams,
}: CheckoutSuccessPageProps) {
  const { session_id: sessionId } = await searchParams;
  const state = await loadSuccessState(sessionId);
  const isPaid = state.order?.payment_status === "paid";

  return (
    <main id="main">
      <ClearPaidCart paymentConfirmed={isPaid} />
      <section className="cart-page">
        <div className="container empty-state">
          <div>
            <span className="kicker">Checkout status</span>
            <h2>{state.title}</h2>
            <p>{state.message}</p>
            {state.order ? (
              <div>
                <div className="summary-row">
                  <span>Order number</span>
                  <strong>#{state.order.order_number}</strong>
                </div>
                <div className="summary-row">
                  <span>Payment status</span>
                  <strong>{state.order.payment_status}</strong>
                </div>
                <div className="summary-row">
                  <span>Subtotal</span>
                  <strong>
                    {formatMoney(
                      state.order.subtotal_cents / 100,
                      state.order.currency.toUpperCase(),
                    )}
                  </strong>
                </div>
                <div className="summary-row">
                  <span>Shipping</span>
                  <strong>
                    {formatMoney(
                      state.order.shipping_cents / 100,
                      state.order.currency.toUpperCase(),
                    )}
                  </strong>
                </div>
                <div className="summary-row">
                  <span>Tax</span>
                  <strong>
                    {formatMoney(
                      state.order.tax_cents / 100,
                      state.order.currency.toUpperCase(),
                    )}
                  </strong>
                </div>
                <div className="summary-row summary-row--total">
                  <span>Total</span>
                  <strong>
                    {formatMoney(
                      state.order.total_cents / 100,
                      state.order.currency.toUpperCase(),
                    )}
                  </strong>
                </div>
              </div>
            ) : null}
            <Link href={isPaid ? "/shop" : "/cart"} className="btn">
              {isPaid ? "Continue shopping" : "Return to cart"}
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
