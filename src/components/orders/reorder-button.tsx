"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { RotateCcw } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { buildLine, toCartRestaurant, useCart } from "@/components/cart/cart-provider";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { PRODUCT_SELECT } from "@/services/catalog";
import type { OrderItem, Product, Restaurant } from "@/types";

/** Recria o carrinho a partir de um pedido anterior, com preços atuais. */
export function ReorderButton({ restaurantId, items }: { restaurantId: string; items: OrderItem[] }) {
  const cart = useCart();
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();

  return (
    <Button
      variant="soft"
      size="sm"
      loading={pending}
      onClick={() =>
        start(async () => {
          const supabase = createClient();
          const ids = items.map((i) => i.product_id).filter((id): id is string => !!id);
          const [{ data: restaurant }, { data: products }] = await Promise.all([
            supabase.from("restaurants").select("*").eq("id", restaurantId).maybeSingle<Restaurant>(),
            supabase.from("products").select(PRODUCT_SELECT).in("id", ids),
          ]);
          if (!restaurant || restaurant.status !== "active") {
            toast("Este restaurante não está disponível no momento.", "error");
            return;
          }
          const byId = new Map(((products ?? []) as Product[]).map((p) => [p.id, p]));
          const lines = items.flatMap((item) => {
            const product = item.product_id ? byId.get(item.product_id) : undefined;
            if (!product || !product.is_available) return [];
            const selected = (product.options ?? []).flatMap((group) =>
              group.items
                .filter((opt) => opt.is_available && item.options.some((o) => o.group === group.name && o.name === opt.name))
                .map((opt) => opt.id),
            );
            const removed = item.removed_ingredients.filter((r) => product.ingredients.includes(r));
            return [buildLine(product, selected, removed, item.quantity, item.notes)];
          });
          if (!lines.length) {
            toast("Os itens deste pedido não estão mais disponíveis.", "error");
            return;
          }
          cart.replaceAll(toCartRestaurant(restaurant), lines);
          if (lines.length < items.length) toast("Alguns itens indisponíveis foram removidos.", "info");
          router.push("/carrinho");
        })
      }
    >
      <RotateCcw className="h-4 w-4" aria-hidden /> Pedir novamente
    </Button>
  );
}
