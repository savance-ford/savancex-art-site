import type {
  CheckoutSession,
  CreateCheckoutSessionInput,
} from "@/lib/commerce/types";

/**
 * Contract for a future server-only checkout adapter. Implementations that read
 * credentials must be protected with `server-only` and must never be imported
 * by Client Components.
 */
export interface CheckoutProvider {
  createCheckoutSession(
    input: CreateCheckoutSessionInput,
  ): Promise<CheckoutSession>;
  retrieveCheckoutSession(id: string): Promise<CheckoutSession | null>;
}
