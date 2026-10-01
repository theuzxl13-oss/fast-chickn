"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BellRing, MapPin, Phone, Wallet } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { updateOrderStatusAction } from "@/app/actions/partner";
import { Button } from "@/components/ui/button";
import { Badge, Card, EmptyState } from "@/components/ui/misc";
import { Input } from "@/components/ui/form";
import { useToast } from "@/components/ui/toast";
import { OrderItemsList } from "@/components/orders/order-items-list";
import {
  ORDER_STATUS_LABEL,
  ORDER_STATUS_TONE,
  PARTNER_NEXT_ACTION,
  PAYMENT_METHOD_LABEL,
  PAYMENT_STATUS_LABEL,
} from "@/lib/constants";
import type { Order, OrderStatus } from "@/types";
import { formatCurrency, formatPhone, formatTime } from "@/utils/format";
import { cn } from "@/utils/cn";

const TABS: { key: string; label: string; statuses: OrderStatus[] }[] = [
  { key: "new", label: "Novos", statuses: ["pending"] },
  { key: "kitchen", label: "Em preparo", statuses: ["confirmed", "preparing"] },
  { key: "delivery", label: "Entrega", statuses: ["ready", "out_for_delivery"] },
  { key: "done", label: "Concluídos", statuses: ["delivered", "cancelled", "rejected"] },
];

function beep() {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AudioCtx();
    [0, 0.18].forEach((t) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.15, ctx.currentTime + t);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.15);
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + t);
      osc.stop(ctx.currentTime + t + 0.16);
    });
  } catch {
    /* áudio bloqueado pelo navegador */
  }
}

function OrderCard({ order, highlight }: { order: Order; highlight: boolean }) {
  const [pending, start] = useTransition();
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const router = useRouter();
  const toast = useToast();
  const next = PARTNER_NEXT_ACTION[order.status];
  const a = order.delivery_address;

  const act = (status: OrderStatus, note?: string) =>
    start(async () => {
      const res = await updateOrderStatusAction(order.id, status, note);
      toast(res.ok ? `#${order.code}: ${ORDER_STATUS_LABEL[status]}` : res.error, res.ok ? "success" : "error");
      setRejecting(false);
      router.refresh();
    });

  return (
    <Card className={cn("overflow-hidden", highlight && "border-brand-400 ring-4 ring-brand-100 animate-fade-up")}>
      {order.status === "pending" && (
        <div className="flex items-center gap-2 bg-brand-500 px-4 py-2 text-sm font-extrabold uppercase tracking-wide text-white">
          <BellRing className="h-4 w-4" aria-hidden /> Novo pedido
        </div>
      )}
      <div className="space-y-4 p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="text-lg font-black">Pedido #{order.code}</p>
            <p className="text-sm text-ink-600">
              Cliente: <strong>{order.customer_name}</strong> · {formatTime(order.created_at)}
            </p>
          </div>
          <div className="text-right">
            <Badge tone={ORDER_STATUS_TONE[order.status]}>{ORDER_STATUS_LABEL[order.status]}</Badge>
            <p className="mt-1 text-lg font-extrabold">{formatCurrency(order.total)}</p>
          </div>
        </div>

        <OrderItemsList items={order.items ?? []} />

        {order.notes && <p className="rounded-2xl bg-accent-50 p-3 text-sm"><strong>Obs. do pedido:</strong> {order.notes}</p>}

        <div className="grid gap-2 text-sm text-ink-700 md:grid-cols-2">
          <p className="flex gap-2">
            <Wallet className="h-4 w-4 shrink-0 text-brand-500" aria-hidden />
            <span>
              {PAYMENT_METHOD_LABEL[order.payment_method]}
              {order.payment && ` · ${PAYMENT_STATUS_LABEL[order.payment.status]}`}
              {order.change_for && <> · Troco para {formatCurrency(order.change_for)}</>}
            </span>
          </p>
          <p className="flex gap-2">
            <MapPin className="h-4 w-4 shrink-0 text-brand-500" aria-hidden />
            <span>
              {a.street}, {a.number}
              {a.complement ? ` - ${a.complement}` : ""} · {a.neighborhood}
              {a.reference && <span className="block text-xs text-ink-500">Ref.: {a.reference}</span>}
            </span>
          </p>
          {order.customer_phone && (
            <a href={`tel:${order.customer_phone}`} className="flex gap-2 font-semibold text-brand-600">
              <Phone className="h-4 w-4" aria-hidden /> {formatPhone(order.customer_phone)}
            </a>
          )}
        </div>

        {rejecting ? (
          <div className="space-y-2 rounded-2xl bg-red-50 p-3">
            <label htmlFor={`reason-${order.id}`} className="text-sm font-semibold text-red-800">
              Motivo da recusa
            </label>
            <Input id={`reason-${order.id}`} value={reason} maxLength={200} onChange={(e) => setReason(e.target.value)} placeholder="Ex.: Item em falta" />
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => setRejecting(false)}>Voltar</Button>
              <Button variant="danger" size="sm" loading={pending} onClick={() => act("rejected", reason)}>
                Confirmar recusa
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {next && (
              <Button
                variant={order.status === "pending" ? "success" : "primary"}
                size="lg"
                className="flex-1 uppercase"
                loading={pending}
                onClick={() => act(next.status)}
              >
                {next.label}
              </Button>
            )}
            {order.status === "pending" && (
              <Button variant="outline" size="lg" className="uppercase text-red-600" onClick={() => setRejecting(true)}>
                Recusar
              </Button>
            )}
            {["confirmed", "preparing", "ready"].includes(order.status) && (
              <Button
                variant="ghost"
                size="lg"
                className="text-red-600"
                disabled={pending}
                onClick={() => confirm(`Cancelar o pedido #${order.code}?`) && act("cancelled", "Cancelado pelo restaurante")}
              >
                Cancelar
              </Button>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}

export function OrdersBoard({ restaurantId, orders }: { restaurantId: string; orders: Order[] }) {
  const [tab, setTab] = useState("new");
  const [fresh, setFresh] = useState<Set<string>>(new Set());
  const router = useRouter();
  const toast = useToast();

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`restaurant-orders:${restaurantId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "orders", filter: `restaurant_id=eq.${restaurantId}` },
        (payload) => {
          const o = payload.new as Order;
          setFresh((prev) => new Set(prev).add(o.id));
          setTab("new");
          beep();
          toast(`Novo pedido #${o.code} — ${formatCurrency(o.total)}`, "info");
          router.refresh();
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "orders", filter: `restaurant_id=eq.${restaurantId}` },
        () => router.refresh(),
      )
      .subscribe();
    const poll = setInterval(() => router.refresh(), 45_000);
    return () => {
      clearInterval(poll);
      supabase.removeChannel(channel);
    };
  }, [restaurantId, router, toast]);

  const grouped = useMemo(
    () => Object.fromEntries(TABS.map((t) => [t.key, orders.filter((o) => t.statuses.includes(o.status))])),
    [orders],
  );
  const list = grouped[tab] ?? [];

  return (
    <div>
      <div className="no-scrollbar mb-4 flex gap-2 overflow-x-auto" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-bold transition",
              tab === t.key ? "bg-ink-900 text-white" : "bg-white text-ink-600 shadow-soft",
            )}
          >
            {t.label}
            <span
              className={cn(
                "grid h-5 min-w-5 place-items-center rounded-full px-1 text-[11px]",
                t.key === "new" && grouped.new?.length ? "bg-brand-500 text-white" : "bg-ink-100 text-ink-600",
              )}
            >
              {grouped[t.key]?.length ?? 0}
            </span>
          </button>
        ))}
      </div>
      {list.length === 0 ? (
        <EmptyState emoji="🧾" title="Nenhum pedido aqui" description="Quando houver pedidos nesta etapa, eles aparecem automaticamente." />
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {list.map((o) => (
            <OrderCard key={o.id} order={o} highlight={fresh.has(o.id)} />
          ))}
        </div>
      )}
    </div>
  );
}
