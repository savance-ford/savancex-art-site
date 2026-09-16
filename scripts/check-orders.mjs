import nextEnv from "@next/env";
import { createClient } from "@supabase/supabase-js";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !secretKey) {
  console.error(
    "Order diagnostics require NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY.",
  );
  process.exitCode = 1;
} else {
  const supabase = createClient(supabaseUrl, secretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const [ordersResponse, eventsResponse] = await Promise.all([
    supabase
      .from("orders")
      .select(
        "order_number,status,payment_status,total_cents,currency,created_at",
      )
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("stripe_webhook_events")
      .select(
        "stripe_event_id,event_type,status,error_message,received_at,processed_at",
      )
      .order("received_at", { ascending: false })
      .limit(1_000),
  ]);

  if (ordersResponse.error || eventsResponse.error) {
    console.error("Unable to load order diagnostics from Supabase.");
    process.exitCode = 1;
  } else {
    const orders = ordersResponse.data ?? [];
    const events = eventsResponse.data ?? [];
    const eventIds = new Set();
    let duplicateEventCount = 0;

    for (const event of events) {
      if (eventIds.has(event.stripe_event_id)) duplicateEventCount += 1;
      eventIds.add(event.stripe_event_id);
    }

    console.log("SAVANCEX order diagnostics");
    console.log(`Generated: ${new Date().toISOString()}`);
    console.log(`Recent orders: ${orders.length}`);
    for (const order of orders) {
      console.log(
        `  #${order.order_number}: ${order.status}/${order.payment_status} ${order.total_cents} ${order.currency} (${order.created_at})`,
      );
    }

    const failures = events.filter((event) => event.status === "failed");
    const reviews = orders.filter((order) => order.status === "payment_review");
    console.log(`Webhook events inspected: ${events.length}`);
    console.log(`Duplicate Stripe event IDs: ${duplicateEventCount}`);
    console.log(`Webhook failures: ${failures.length}`);
    console.log(`Orders requiring amount/payment review: ${reviews.length}`);

    for (const event of failures.slice(0, 20)) {
      console.log(
        `  ${event.stripe_event_id} ${event.event_type}: ${event.error_message ?? "No safe error recorded"}`,
      );
    }
  }
}
