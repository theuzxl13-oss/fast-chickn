"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShoppingBag } from "lucide-react";
import { useCart } from "@/components/cart/cart-provider";
import { formatCurrency } from "@/utils/format";

/** Barra flutuante "Ver carrinho" exibida enquanto há itens. */
export function CartBar() {
  const { count, subtotal, restaurant, ready } = useCart();
  const pathname = usePathname();
  if (!ready || count === 0 || pathname.startsWith("/carrinho") || pathname.startsWith("/checkout")) return null;

  return (
    <div className="fixed inset-x-0 bottom-[4.75rem] z-30 px-4 md:bottom-6">
      <Link
        href="/carrinho"
        className="mx-auto flex max-w-lg items-center gap-3 rounded-2xl bg-brand-500 px-4 py-3 text-white shadow-glow transition hover:bg-brand-600 animate-fade-up"
      >
        <span className="relative grid h-10 w-10 place-items-center rounded-xl bg-white/15">
          <ShoppingBag className="h-5 w-5" aria-hidden />
          <span className="absolute -right-1.5 -top-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-accent-400 px-1 text-[11px] font-bold text-ink-900">
            {count}
          </span>
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold">Ver carrinho</span>
          <span className="block truncate text-xs text-white/80">{restaurant?.name}</span>
        </span>
        <span className="text-base font-extrabold">{formatCurrency(subtotal)}</span>
      </Link>
    </div>
  );
}
