import type { OrderItem } from "@/types";
import { formatCurrency } from "@/utils/format";

export function OrderItemsList({ items }: { items: OrderItem[] }) {
  return (
    <ul className="space-y-3 text-sm">
      {items.map((item) => (
        <li key={item.id} className="flex justify-between gap-3">
          <div>
            <p className="font-semibold text-ink-900">
              <span className="text-brand-600">{item.quantity}×</span> {item.product_name}
            </p>
            {item.options?.length > 0 && (
              <p className="text-xs text-ink-500">
                {item.options.map((o) => `${o.name}${Number(o.price) > 0 ? ` (+${formatCurrency(o.price)})` : ""}`).join(", ")}
              </p>
            )}
            {item.removed_ingredients?.length > 0 && (
              <p className="text-xs font-semibold text-red-600">Sem: {item.removed_ingredients.join(", ")}</p>
            )}
            {item.notes && <p className="text-xs italic text-ink-500">Obs.: {item.notes}</p>}
          </div>
          <span className="shrink-0 font-semibold">{formatCurrency(item.total_price)}</span>
        </li>
      ))}
    </ul>
  );
}
