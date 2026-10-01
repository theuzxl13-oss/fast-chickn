"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Banknote, Bike, Check, CreditCard, HandCoins, MapPin, QrCode } from "lucide-react";
import { useCart } from "@/components/cart/cart-provider";
import { CouponBox } from "@/components/cart/coupon-box";
import { OrderSummary } from "@/components/cart/order-summary";
import { placeOrderAction } from "@/app/actions/orders";
import { Button, LinkButton } from "@/components/ui/button";
import { Card, EmptyState, Skeleton } from "@/components/ui/misc";
import { FormMessage, Input, Textarea } from "@/components/ui/form";
import { useToast } from "@/components/ui/toast";
import { ADDRESS_LABEL, PAYMENT_METHOD_HINT, PAYMENT_METHOD_LABEL } from "@/lib/constants";
import type { Address, PaymentMethod } from "@/types";
import { formatCurrency, formatTime } from "@/utils/format";
import { cn } from "@/utils/cn";

const METHODS: { value: PaymentMethod; icon: typeof QrCode; group: "online" | "delivery" }[] = [
  { value: "pix", icon: QrCode, group: "online" },
  { value: "credit_card", icon: CreditCard, group: "delivery" },
  { value: "debit_card", icon: CreditCard, group: "delivery" },
  { value: "cash", icon: Banknote, group: "delivery" },
  { value: "on_delivery", icon: HandCoins, group: "delivery" },
];

export function CheckoutForm({
  addresses,
  preferredPayment,
  demoPayments,
}: {
  addresses: Address[];
  preferredPayment: PaymentMethod | null;
  demoPayments: boolean;
}) {
  const cart = useCart();
  const router = useRouter();
  const toast = useToast();
  const [addressId, setAddressId] = useState(addresses.find((a) => a.is_default)?.id ?? addresses[0]?.id ?? "");
  const [method, setMethod] = useState<PaymentMethod | null>(preferredPayment);
  const [needsChange, setNeedsChange] = useState(false);
  const [changeFor, setChangeFor] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [placedCode, setPlacedCode] = useState<string | null>(null);

  if (placedCode) {
    return (
      <EmptyState
        emoji="✅"
        title={`Pedido #${placedCode} realizado!`}
        description="Abrindo o acompanhamento do seu pedido…"
      />
    );
  }
  if (!cart.ready) return <Skeleton className="h-96" />;
  if (!cart.restaurant || cart.lines.length === 0) {
    return (
      <EmptyState
        emoji="🛒"
        title="Seu carrinho está vazio"
        action={<LinkButton href="/">Explorar restaurantes</LinkButton>}
      />
    );
  }

  const now = Date.now();
  const etaFrom = formatTime(new Date(now + cart.restaurant.delivery_time_min * 60_000));
  const etaTo = formatTime(new Date(now + cart.restaurant.delivery_time_max * 60_000));
  const changeValue = Number(changeFor.replace(",", "."));

  function submit() {
    setError(null);
    if (!addressId) return setError("Cadastre ou selecione um endereço de entrega.");
    if (!method) return setError("Escolha a forma de pagamento.");
    if (method === "cash" && needsChange && !(changeValue > cart.total)) {
      return setError(`Informe um valor de troco maior que ${formatCurrency(cart.total)}.`);
    }
    start(async () => {
      const res = await placeOrderAction({
        restaurant_id: cart.restaurant!.id,
        address_id: addressId,
        items: cart.lines.map((l) => ({
          product_id: l.product_id,
          quantity: l.quantity,
          option_item_ids: l.option_item_ids,
          removed_ingredients: l.removed_ingredients,
          notes: l.notes,
        })),
        payment_method: method,
        change_for: method === "cash" && needsChange ? changeValue : null,
        coupon_code: cart.coupon?.code ?? null,
        notes: notes.trim() || null,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setPlacedCode(res.data!.code);
      cart.clear();
      toast(`Pedido #${res.data!.code} realizado!`);
      router.push(`/pedido/${res.data!.id}?novo=1`);
    });
  }

  return (
    <div className="mx-auto max-w-4xl animate-fade-up">
      <h1 className="mb-4 text-2xl font-extrabold tracking-tight">Finalizar pedido</h1>
      <div className="grid gap-4 md:grid-cols-[1fr_340px]">
        <div className="space-y-4">
          {/* Endereço */}
          <Card className="p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-bold">
                <MapPin className="h-5 w-5 text-brand-500" aria-hidden /> Endereço de entrega
              </h2>
              <Link href="/conta/enderecos?next=/checkout" className="text-sm font-semibold text-brand-600 hover:underline">
                {addresses.length ? "Gerenciar" : "Adicionar"}
              </Link>
            </div>
            {addresses.length === 0 ? (
              <LinkButton href="/conta/enderecos?novo=1&next=/checkout" variant="soft" className="w-full">
                Cadastrar endereço
              </LinkButton>
            ) : (
              <div className="space-y-2" role="radiogroup" aria-label="Endereço de entrega">
                {addresses.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    role="radio"
                    aria-checked={addressId === a.id}
                    onClick={() => setAddressId(a.id)}
                    className={cn(
                      "flex w-full items-start gap-3 rounded-2xl border p-3 text-left transition",
                      addressId === a.id ? "border-brand-400 bg-brand-50" : "border-ink-100 hover:border-ink-200",
                    )}
                  >
                    <span className="text-xl" aria-hidden>{ADDRESS_LABEL[a.label].icon}</span>
                    <span className="flex-1 text-sm">
                      <span className="block font-bold">{a.label_custom || ADDRESS_LABEL[a.label].label}</span>
                      <span className="block text-ink-600">
                        {a.street}, {a.number}
                        {a.complement ? ` - ${a.complement}` : ""}
                      </span>
                      <span className="block text-xs text-ink-500">
                        {a.neighborhood}, {a.city}/{a.state}
                      </span>
                    </span>
                    {addressId === a.id && <Check className="h-5 w-5 text-brand-600" aria-hidden />}
                  </button>
                ))}
              </div>
            )}
            <p className="mt-3 flex items-center gap-2 rounded-2xl bg-ink-50 px-3 py-2 text-sm text-ink-700">
              <Bike className="h-4 w-4 text-brand-500" aria-hidden />
              Entrega estimada: <strong>hoje, {etaFrom} – {etaTo}</strong>
            </p>
          </Card>

          {/* Pagamento */}
          <Card className="p-4">
            <h2 className="mb-3 font-bold">Forma de pagamento</h2>
            {(["online", "delivery"] as const).map((group) => (
              <div key={group} className="mb-3 last:mb-0">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-500">
                  {group === "online" ? "Pague pelo app" : "Pague na entrega"}
                </p>
                <div className="grid gap-2" role="radiogroup">
                  {METHODS.filter((m) => m.group === group).map(({ value, icon: Icon }) => (
                    <button
                      key={value}
                      type="button"
                      role="radio"
                      aria-checked={method === value}
                      onClick={() => setMethod(value)}
                      className={cn(
                        "flex items-center gap-3 rounded-2xl border p-3 text-left transition",
                        method === value ? "border-brand-400 bg-brand-50" : "border-ink-100 hover:border-ink-200",
                      )}
                    >
                      <span className="grid h-10 w-10 place-items-center rounded-xl bg-white shadow-soft">
                        <Icon className="h-5 w-5 text-brand-600" aria-hidden />
                      </span>
                      <span className="flex-1">
                        <span className="block text-sm font-bold">{PAYMENT_METHOD_LABEL[value]}</span>
                        <span className="block text-xs text-ink-500">{PAYMENT_METHOD_HINT[value]}</span>
                      </span>
                      {method === value && <Check className="h-5 w-5 text-brand-600" aria-hidden />}
                    </button>
                  ))}
                </div>
              </div>
            ))}

            {method === "pix" && demoPayments && (
              <p className="mt-2 rounded-2xl bg-sky-50 px-3 py-2 text-xs text-sky-800">
                Ambiente de demonstração: o QR Code PIX gerado é fictício e nenhuma cobrança real será feita.
              </p>
            )}

            {method === "cash" && (
              <div className="mt-3 space-y-2 rounded-2xl bg-ink-50 p-3">
                <label className="flex items-center gap-2 text-sm font-semibold">
                  <input
                    type="checkbox"
                    checked={needsChange}
                    onChange={(e) => setNeedsChange(e.target.checked)}
                    className="h-4 w-4 accent-brand-500"
                  />
                  Preciso de troco
                </label>
                {needsChange && (
                  <div>
                    <label htmlFor="change" className="mb-1 block text-sm font-semibold">
                      Troco para quanto?
                    </label>
                    <Input
                      id="change"
                      inputMode="decimal"
                      placeholder={`Ex.: ${Math.ceil(cart.total / 10) * 10 + 10}`}
                      value={changeFor}
                      onChange={(e) => setChangeFor(e.target.value.replace(/[^0-9,\.]/g, ""))}
                    />
                  </div>
                )}
              </div>
            )}
          </Card>

          <Card className="p-4">
            <label htmlFor="order-notes" className="mb-2 block font-bold">
              Observações para o restaurante
            </label>
            <Textarea
              id="order-notes"
              maxLength={280}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex.: Interfone com defeito, me ligue ao chegar."
            />
          </Card>
        </div>

        {/* Resumo */}
        <div className="space-y-4 md:sticky md:top-24 md:self-start">
          <Card className="p-4">
            <h2 className="mb-3 font-bold">Resumo do pedido</h2>
            <p className="mb-2 text-sm font-semibold text-ink-700">{cart.restaurant.name}</p>
            <ul className="mb-4 space-y-2 text-sm">
              {cart.lines.map((l) => (
                <li key={l.key} className="flex justify-between gap-2">
                  <span className="text-ink-700">
                    <strong>{l.quantity}×</strong> {l.name}
                    {l.options.length > 0 && <span className="block text-xs text-ink-500">{l.options.map((o) => o.name).join(", ")}</span>}
                  </span>
                  <span className="shrink-0 font-semibold">{formatCurrency(l.unit_price * l.quantity)}</span>
                </li>
              ))}
            </ul>
            <div className="mb-4 border-t border-ink-100 pt-4">
              <CouponBox />
            </div>
            <OrderSummary subtotal={cart.subtotal} deliveryFee={cart.deliveryFee} discount={cart.discount} total={cart.total} />
          </Card>
          <FormMessage error={error} />
          <Button size="lg" className="w-full" loading={pending} onClick={submit}>
            Fazer pedido · {formatCurrency(cart.total)}
          </Button>
          <p className="text-center text-xs text-ink-400">
            Os valores são confirmados pelo servidor no momento do pedido.
          </p>
        </div>
      </div>
    </div>
  );
}
