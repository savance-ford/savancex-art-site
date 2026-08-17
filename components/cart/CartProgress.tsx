import { brand } from "@/data/products";
import { formatMoney } from "@/lib/formatting/money";

interface CartProgressProps {
  readonly subtotal: number;
}

export function CartProgress({ subtotal }: CartProgressProps) {
  const remaining = Math.max(0, brand.shippingThreshold - subtotal);
  const width = Math.min(100, (subtotal / brand.shippingThreshold) * 100);

  return (
    <div className="shipping-progress">
      <strong>
        {remaining > 0
          ? `Spend ${formatMoney(remaining)} more for free shipping`
          : "You unlocked free shipping 🎉"}
      </strong>
      <div className="shipping-progress__track">
        <div
          className="shipping-progress__bar"
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}
