import { formatCurrency } from "@/utils/format";

export function OrderSummary({
  subtotal,
  deliveryFee,
  discount,
  total,
}: {
  subtotal: number;
  deliveryFee: number;
  discount: number;
  total: number;
}) {
  return (
    <dl className="space-y-2 text-sm">
      <div className="flex justify-between text-ink-600">
        <dt>Subtotal</dt>
        <dd>{formatCurrency(subtotal)}</dd>
      </div>
      <div className="flex justify-between text-ink-600">
        <dt>Taxa de entrega</dt>
        <dd className={deliveryFee === 0 ? "font-semibold text-emerald-600" : undefined}>
          {deliveryFee === 0 ? "Grátis" : formatCurrency(deliveryFee)}
        </dd>
      </div>
      {discount > 0 && (
        <div className="flex justify-between font-semibold text-emerald-700">
          <dt>Descontos</dt>
          <dd>− {formatCurrency(discount)}</dd>
        </div>
      )}
      <div className="flex justify-between border-t border-ink-100 pt-3 text-base font-extrabold text-ink-900">
        <dt>Total</dt>
        <dd>{formatCurrency(total)}</dd>
      </div>
    </dl>
  );
}
