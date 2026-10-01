"use client";

import { useMemo, useState } from "react";
import { Check, Minus, Plus } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/form";
import { FoodImage } from "@/components/ui/food-image";
import { Badge } from "@/components/ui/misc";
import { useToast } from "@/components/ui/toast";
import { buildLine, toCartRestaurant, useCart } from "@/components/cart/cart-provider";
import type { Product, ProductOption, Restaurant } from "@/types";
import { formatCurrency } from "@/utils/format";
import { cn } from "@/utils/cn";

function ruleText(o: ProductOption) {
  if (o.min_select > 0 && o.max_select === 1) return "Escolha 1 opção";
  if (o.min_select > 0) return `Escolha de ${o.min_select} a ${o.max_select}`;
  if (o.max_select === 1) return "Opcional · até 1";
  return `Opcional · até ${o.max_select}`;
}

export function ProductModal({
  product,
  restaurant,
  isOpen,
  emoji,
  onClose,
}: {
  product: Product;
  restaurant: Restaurant;
  isOpen: boolean;
  emoji: string;
  onClose: () => void;
}) {
  const cart = useCart();
  const toast = useToast();
  const options = product.options ?? [];

  // Pré-seleciona o primeiro item disponível de grupos obrigatórios de escolha única
  const [selected, setSelected] = useState<string[]>(() =>
    options
      .filter((o) => o.min_select === 1 && o.max_select === 1)
      .map((o) => o.items.find((i) => i.is_available)?.id)
      .filter((id): id is string => !!id),
  );
  const [removed, setRemoved] = useState<string[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState("");
  const [conflict, setConflict] = useState(false);

  const line = useMemo(
    () => buildLine(product, selected, removed, quantity, notes.trim() ? notes.trim().slice(0, 280) : null),
    [product, selected, removed, quantity, notes],
  );

  const missing = options.filter((o) => o.items.filter((i) => selected.includes(i.id)).length < o.min_select);
  const canAdd = isOpen && product.is_available && missing.length === 0;

  function toggle(option: ProductOption, itemId: string) {
    setSelected((prev) => {
      const inGroup = prev.filter((id) => option.items.some((i) => i.id === id));
      if (prev.includes(itemId)) {
        return option.min_select === 1 && option.max_select === 1 ? prev : prev.filter((id) => id !== itemId);
      }
      if (option.max_select === 1) {
        return [...prev.filter((id) => !inGroup.includes(id)), itemId];
      }
      if (inGroup.length >= option.max_select) return prev;
      return [...prev, itemId];
    });
  }

  function add() {
    const cartRestaurant = toCartRestaurant(restaurant);
    const result = cart.addLine(cartRestaurant, line);
    if (result === "conflict") {
      setConflict(true);
      return;
    }
    toast(`${quantity}× ${product.name} adicionado ao carrinho`);
    onClose();
  }

  const total = line.unit_price * quantity;

  return (
    <Modal
      open
      onClose={onClose}
      title={product.name}
      footer={
        conflict ? (
          <div className="space-y-3">
            <p className="text-sm text-ink-700">
              Seu carrinho tem itens de <strong>{cart.restaurant?.name}</strong>. Deseja limpar o carrinho e adicionar este item?
            </p>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setConflict(false)}>
                Manter carrinho
              </Button>
              <Button
                className="flex-1"
                onClick={() => {
                  cart.replaceWith(toCartRestaurant(restaurant), line);
                  toast("Carrinho atualizado");
                  onClose();
                }}
              >
                Limpar e adicionar
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <div className="flex items-center rounded-2xl border border-ink-200">
              <button
                type="button"
                className="grid h-12 w-11 place-items-center text-brand-600 disabled:text-ink-300"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                disabled={quantity <= 1}
                aria-label="Diminuir quantidade"
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="w-6 text-center font-bold" aria-live="polite">{quantity}</span>
              <button
                type="button"
                className="grid h-12 w-11 place-items-center text-brand-600 disabled:text-ink-300"
                onClick={() => setQuantity((q) => Math.min(99, q + 1))}
                disabled={quantity >= 99}
                aria-label="Aumentar quantidade"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            <Button size="lg" className="flex-1 justify-between" disabled={!canAdd} onClick={add}>
              <span>{!isOpen ? "Restaurante fechado" : !product.is_available ? "Indisponível" : "Adicionar"}</span>
              <span>{formatCurrency(total)}</span>
            </Button>
          </div>
        )
      }
    >
      <FoodImage src={product.image_url} alt={product.name} seed={product.id} emoji={emoji} className="h-52 w-full text-5xl md:h-60" rounded="rounded-none" />
      <div className="space-y-6 p-5">
        <div>
          {product.description && <p className="text-sm text-ink-600">{product.description}</p>}
          <p className="mt-2 text-lg font-extrabold">
            {product.promo_price ? (
              <>
                <span className="text-emerald-700">{formatCurrency(product.promo_price)}</span>{" "}
                <span className="text-sm font-medium text-ink-400 line-through">{formatCurrency(product.price)}</span>
              </>
            ) : (
              formatCurrency(product.price)
            )}
          </p>
        </div>

        {options.map((o) => {
          const count = o.items.filter((i) => selected.includes(i.id)).length;
          const isMissing = count < o.min_select;
          return (
            <fieldset key={o.id}>
              <legend className="flex w-full items-center justify-between rounded-2xl bg-ink-50 px-4 py-3">
                <span>
                  <span className="block text-sm font-bold">{o.name}</span>
                  <span className="block text-xs text-ink-500">{ruleText(o)}</span>
                </span>
                {o.min_select > 0 && <Badge tone={isMissing ? "dark" : "success"}>{isMissing ? "Obrigatório" : "OK"}</Badge>}
              </legend>
              <ul className="mt-1 divide-y divide-ink-100">
                {o.items.map((item) => {
                  const checked = selected.includes(item.id);
                  const disabled = !item.is_available || (!checked && o.max_select > 1 && count >= o.max_select);
                  return (
                    <li key={item.id}>
                      <label className={cn("flex cursor-pointer items-center gap-3 px-1 py-3", disabled && !checked && "cursor-not-allowed opacity-50")}>
                        <span className="flex-1">
                          <span className="block text-sm font-medium">{item.name}</span>
                          {Number(item.price) > 0 && <span className="block text-xs text-ink-500">+ {formatCurrency(item.price)}</span>}
                          {!item.is_available && <span className="block text-xs text-red-600">Indisponível</span>}
                        </span>
                        <input
                          type={o.max_select === 1 ? "radio" : "checkbox"}
                          name={`opt-${o.id}`}
                          className="sr-only"
                          checked={checked}
                          disabled={disabled}
                          onChange={() => toggle(o, item.id)}
                        />
                        <span
                          aria-hidden
                          className={cn(
                            "grid h-6 w-6 place-items-center border-2 transition",
                            o.max_select === 1 ? "rounded-full" : "rounded-lg",
                            checked ? "border-brand-500 bg-brand-500 text-white" : "border-ink-300",
                          )}
                        >
                          {checked && <Check className="h-4 w-4" strokeWidth={3} />}
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            </fieldset>
          );
        })}

        {product.ingredients.length > 0 && (
          <fieldset>
            <legend className="w-full rounded-2xl bg-ink-50 px-4 py-3">
              <span className="block text-sm font-bold">Remover ingredientes</span>
              <span className="block text-xs text-ink-500">Desmarque o que você não quer</span>
            </legend>
            <div className="mt-3 flex flex-wrap gap-2">
              {product.ingredients.map((ing) => {
                const isRemoved = removed.includes(ing);
                return (
                  <button
                    key={ing}
                    type="button"
                    aria-pressed={!isRemoved}
                    onClick={() => setRemoved((prev) => (isRemoved ? prev.filter((x) => x !== ing) : [...prev, ing]))}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-sm font-medium transition",
                      isRemoved ? "border-ink-200 bg-white text-ink-400 line-through" : "border-brand-200 bg-brand-50 text-brand-700",
                    )}
                  >
                    {isRemoved ? "Sem " : ""}
                    {ing}
                  </button>
                );
              })}
            </div>
          </fieldset>
        )}

        <div>
          <label htmlFor="notes" className="mb-2 block text-sm font-bold">
            Alguma observação?
          </label>
          <Textarea
            id="notes"
            value={notes}
            maxLength={280}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Ex.: Sem cebola, por favor."
          />
          <p className="mt-1 text-right text-xs text-ink-400">{notes.length}/280</p>
        </div>
      </div>
    </Modal>
  );
}
