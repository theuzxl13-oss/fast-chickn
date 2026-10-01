"use client";

import Link from "next/link";
import { Minus, Plus, Trash2 } from "lucide-react";
import { useCart } from "@/components/cart/cart-provider";
import { CouponBox } from "@/components/cart/coupon-box";
import { OrderSummary } from "@/components/cart/order-summary";
import { LinkButton } from "@/components/ui/button";
import { Card, EmptyState, Skeleton } from "@/components/ui/misc";
import { FoodImage, RestaurantLogo } from "@/components/ui/food-image";
import { formatCurrency } from "@/utils/format";

export default function CartPage() {
  const cart = useCart();

  if (!cart.ready) return <Skeleton className="h-64" />;

  if (!cart.restaurant || cart.lines.length === 0) {
    return (
      <EmptyState
        emoji="🛒"
        title="Seu carrinho está vazio"
        description="Que tal escolher algo gostoso agora?"
        action={<LinkButton href="/">Explorar restaurantes</LinkButton>}
      />
    );
  }

  const belowMinimum = cart.subtotal < cart.restaurant.min_order;

  return (
    <div className="mx-auto max-w-3xl animate-fade-up">
      <h1 className="mb-4 text-2xl font-extrabold tracking-tight">Carrinho</h1>

      <div className="grid gap-4 md:grid-cols-[1fr_320px]">
        <Card className="p-4">
          <Link href={`/restaurante/${cart.restaurant.slug}`} className="flex items-center gap-3 border-b border-ink-100 pb-4">
            <RestaurantLogo src={cart.restaurant.logo_url} name={cart.restaurant.name} color={cart.restaurant.brand_color} className="h-12 w-12" />
            <div>
              <p className="font-bold">{cart.restaurant.name}</p>
              <p className="text-xs text-ink-500">
                Entrega em {cart.restaurant.delivery_time_min}–{cart.restaurant.delivery_time_max} min
              </p>
            </div>
          </Link>

          <ul className="divide-y divide-ink-100">
            {cart.lines.map((line) => (
              <li key={line.key} className="flex gap-3 py-4">
                <FoodImage src={line.image_url} alt={line.name} seed={line.product_id} className="h-16 w-16 shrink-0 text-sm" />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{line.name}</p>
                  {line.options.length > 0 && (
                    <p className="text-xs text-ink-500">{line.options.map((o) => o.name).join(", ")}</p>
                  )}
                  {line.removed_ingredients.length > 0 && (
                    <p className="text-xs text-ink-500">Sem: {line.removed_ingredients.join(", ")}</p>
                  )}
                  {line.notes && <p className="text-xs italic text-ink-500">“{line.notes}”</p>}
                  <div className="mt-2 flex items-center justify-between">
                    <span className="font-bold">{formatCurrency(line.unit_price * line.quantity)}</span>
                    <div className="flex items-center gap-1 rounded-xl border border-ink-200">
                      {line.quantity === 1 ? (
                        <button
                          type="button"
                          className="grid h-9 w-9 place-items-center text-red-600"
                          onClick={() => cart.removeLine(line.key)}
                          aria-label={`Remover ${line.name}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="grid h-9 w-9 place-items-center text-brand-600"
                          onClick={() => cart.setQuantity(line.key, line.quantity - 1)}
                          aria-label="Diminuir quantidade"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                      )}
                      <span className="w-5 text-center text-sm font-bold">{line.quantity}</span>
                      <button
                        type="button"
                        className="grid h-9 w-9 place-items-center text-brand-600"
                        onClick={() => cart.setQuantity(line.key, line.quantity + 1)}
                        aria-label="Aumentar quantidade"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          <Link
            href={`/restaurante/${cart.restaurant.slug}`}
            className="block rounded-2xl py-3 text-center text-sm font-bold text-brand-600 hover:bg-brand-50"
          >
            + Adicionar mais itens
          </Link>
        </Card>

        <div className="space-y-4 md:sticky md:top-24 md:self-start">
          <Card className="p-4">
            <CouponBox />
          </Card>
          <Card className="space-y-4 p-4">
            <OrderSummary subtotal={cart.subtotal} deliveryFee={cart.deliveryFee} discount={cart.discount} total={cart.total} />
            {belowMinimum && (
              <p className="rounded-2xl bg-accent-100 px-3 py-2 text-xs font-semibold text-ink-800">
                Pedido mínimo de {formatCurrency(cart.restaurant.min_order)}. Faltam{" "}
                {formatCurrency(cart.restaurant.min_order - cart.subtotal)}.
              </p>
            )}
            {belowMinimum ? (
              <span className="flex h-14 w-full items-center justify-center rounded-2xl bg-ink-100 font-semibold text-ink-400">
                Continuar
              </span>
            ) : (
              <LinkButton href="/checkout" size="lg" className="w-full">
                Continuar
              </LinkButton>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
