"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useSession } from "@/components/providers/session-provider";
import type { OrderItemOption, Product, Restaurant } from "@/types";
import { PRODUCT_SELECT } from "@/services/catalog";

export interface CartRestaurant {
  id: string;
  slug: string;
  name: string;
  logo_url: string | null;
  brand_color: string;
  delivery_fee: number;
  min_order: number;
  delivery_time_min: number;
  delivery_time_max: number;
}

export interface CartLine {
  key: string;
  product_id: string;
  name: string;
  image_url: string | null;
  quantity: number;
  unit_price: number; // preço base efetivo + opções (estimativa; o servidor recalcula)
  option_item_ids: string[];
  options: OrderItemOption[];
  removed_ingredients: string[];
  notes: string | null;
}

export interface AppliedCoupon {
  code: string;
  discount: number;
}

interface CartState {
  restaurant: CartRestaurant | null;
  lines: CartLine[];
  coupon: AppliedCoupon | null;
}

interface CartContextValue extends CartState {
  ready: boolean;
  count: number;
  subtotal: number;
  deliveryFee: number;
  discount: number;
  total: number;
  addLine: (restaurant: CartRestaurant, line: Omit<CartLine, "key">) => "added" | "conflict";
  replaceWith: (restaurant: CartRestaurant, line: Omit<CartLine, "key">) => void;
  replaceAll: (restaurant: CartRestaurant, lines: Omit<CartLine, "key">[]) => void;
  setQuantity: (key: string, quantity: number) => void;
  removeLine: (key: string) => void;
  setCoupon: (coupon: AppliedCoupon | null) => void;
  clear: () => void;
}

const STORAGE_KEY = "fastchickn:cart:v1";
const EMPTY: CartState = { restaurant: null, lines: [], coupon: null };

const CartContext = createContext<CartContextValue | null>(null);

function newKey() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : String(Date.now() + Math.random());
}

export function toCartRestaurant(r: Restaurant): CartRestaurant {
  return {
    id: r.id,
    slug: r.slug,
    name: r.name,
    logo_url: r.logo_url,
    brand_color: r.brand_color,
    delivery_fee: Number(r.delivery_fee),
    min_order: Number(r.min_order),
    delivery_time_min: r.delivery_time_min,
    delivery_time_max: r.delivery_time_max,
  };
}

/** Reconstrói uma linha do carrinho a partir do produto e das opções escolhidas. */
export function buildLine(
  product: Product,
  selected: string[],
  removed: string[],
  quantity: number,
  notes: string | null,
): Omit<CartLine, "key"> {
  const options: OrderItemOption[] = [];
  for (const group of product.options ?? []) {
    for (const item of group.items) {
      if (selected.includes(item.id)) options.push({ group: group.name, name: item.name, price: Number(item.price) });
    }
  }
  const base = Number(product.promo_price ?? product.price);
  return {
    product_id: product.id,
    name: product.name,
    image_url: product.image_url,
    quantity,
    unit_price: base + options.reduce((s, o) => s + o.price, 0),
    option_item_ids: selected,
    options,
    removed_ingredients: removed,
    notes,
  };
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { user } = useSession();
  const [state, setState] = useState<CartState>(EMPTY);
  const [ready, setReady] = useState(false);
  const skipSync = useRef(true);

  // 1) Carrega do navegador
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setState(JSON.parse(raw) as CartState);
    } catch {
      /* armazenamento indisponível */
    }
    setReady(true);
  }, []);

  // 2) Se logado e carrinho local vazio, recupera o carrinho salvo na conta
  useEffect(() => {
    if (!ready || !user) return;
    if (state.lines.length > 0) return;
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const { data: cart } = await supabase
        .from("carts")
        .select("restaurant_id, coupon_code, items:cart_items(*)")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!cart?.restaurant_id || !cart.items?.length || cancelled) return;

      const [{ data: restaurant }, { data: products }] = await Promise.all([
        supabase.from("restaurants").select("*").eq("id", cart.restaurant_id).maybeSingle<Restaurant>(),
        supabase.from("products").select(PRODUCT_SELECT).in(
          "id",
          cart.items.map((i: { product_id: string }) => i.product_id),
        ),
      ]);
      if (!restaurant || !products || cancelled) return;

      const byId = new Map((products as Product[]).map((p) => [p.id, p]));
      const lines: CartLine[] = [];
      for (const item of cart.items as {
        product_id: string;
        quantity: number;
        option_item_ids: string[];
        removed_ingredients: string[];
        notes: string | null;
      }[]) {
        const product = byId.get(item.product_id);
        if (!product || !product.is_available) continue;
        lines.push({
          key: newKey(),
          ...buildLine(product, item.option_item_ids, item.removed_ingredients, item.quantity, item.notes),
        });
      }
      if (lines.length) {
        skipSync.current = true;
        setState({ restaurant: toCartRestaurant(restaurant), lines, coupon: null });
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, user?.id]);

  // 3) Persiste localmente e sincroniza com a conta (debounce)
  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* ignore */
    }
    if (!user) return;
    if (skipSync.current) {
      skipSync.current = false;
      return;
    }
    const timer = setTimeout(async () => {
      const supabase = createClient();
      if (!state.restaurant || state.lines.length === 0) {
        await supabase.from("carts").delete().eq("user_id", user.id);
        return;
      }
      const { data: cart, error } = await supabase
        .from("carts")
        .upsert(
          { user_id: user.id, restaurant_id: state.restaurant.id, coupon_code: state.coupon?.code ?? null },
          { onConflict: "user_id" },
        )
        .select("id")
        .single();
      if (error || !cart) return;
      await supabase.from("cart_items").delete().eq("cart_id", cart.id);
      await supabase.from("cart_items").insert(
        state.lines.map((l) => ({
          cart_id: cart.id,
          product_id: l.product_id,
          quantity: l.quantity,
          option_item_ids: l.option_item_ids,
          removed_ingredients: l.removed_ingredients,
          notes: l.notes,
        })),
      );
    }, 900);
    return () => clearTimeout(timer);
  }, [state, ready, user]);

  const addLine = useCallback<CartContextValue["addLine"]>(
    (restaurant, line) => {
      if (state.restaurant && state.restaurant.id !== restaurant.id && state.lines.length > 0) return "conflict";
      setState((prev) => ({
        restaurant,
        coupon: prev.restaurant?.id === restaurant.id ? prev.coupon : null,
        lines: [...(prev.restaurant?.id === restaurant.id ? prev.lines : []), { ...line, key: newKey() }],
      }));
      return "added";
    },
    [state.restaurant, state.lines.length],
  );

  const replaceWith = useCallback<CartContextValue["replaceWith"]>((restaurant, line) => {
    setState({ restaurant, coupon: null, lines: [{ ...line, key: newKey() }] });
  }, []);

  const replaceAll = useCallback<CartContextValue["replaceAll"]>((restaurant, lines) => {
    setState({ restaurant, coupon: null, lines: lines.map((l) => ({ ...l, key: newKey() })) });
  }, []);

  const setQuantity = useCallback((key: string, quantity: number) => {
    setState((prev) => ({
      ...prev,
      lines: prev.lines.map((l) => (l.key === key ? { ...l, quantity: Math.min(99, Math.max(1, quantity)) } : l)),
    }));
  }, []);

  const removeLine = useCallback((key: string) => {
    setState((prev) => {
      const lines = prev.lines.filter((l) => l.key !== key);
      return lines.length ? { ...prev, lines } : EMPTY;
    });
  }, []);

  const setCoupon = useCallback((coupon: AppliedCoupon | null) => setState((prev) => ({ ...prev, coupon })), []);
  const clear = useCallback(() => setState(EMPTY), []);

  const value = useMemo<CartContextValue>(() => {
    const subtotal = state.lines.reduce((s, l) => s + l.unit_price * l.quantity, 0);
    const deliveryFee = state.restaurant ? state.restaurant.delivery_fee : 0;
    const discount = Math.min(state.coupon?.discount ?? 0, subtotal);
    return {
      ...state,
      ready,
      count: state.lines.reduce((s, l) => s + l.quantity, 0),
      subtotal,
      deliveryFee,
      discount,
      total: Math.max(subtotal + deliveryFee - discount, 0),
      addLine,
      replaceWith,
      replaceAll,
      setQuantity,
      removeLine,
      setCoupon,
      clear,
    };
  }, [state, ready, addLine, replaceWith, replaceAll, setQuantity, removeLine, setCoupon, clear]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart deve ser usado dentro de <CartProvider>");
  return ctx;
}
