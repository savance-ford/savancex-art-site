import type {
  CreateFulfillmentOrderInput,
  EstimateShippingInput,
  FulfillmentOrder,
  FulfillmentStatus,
  ShippingEstimate,
} from "@/lib/commerce/types";

/**
 * Contract for a future server-only fulfillment adapter. Implementations that
 * read credentials must be protected with `server-only` and called only from
 * trusted server code.
 */
export interface FulfillmentProvider {
  estimateShipping(
    input: EstimateShippingInput,
  ): Promise<readonly ShippingEstimate[]>;
  createOrder(input: CreateFulfillmentOrderInput): Promise<FulfillmentOrder>;
  getOrderStatus(id: string): Promise<FulfillmentStatus | null>;
}
