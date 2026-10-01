import { Check, X } from "lucide-react";
import { ORDER_FLOW } from "@/lib/constants";
import type { OrderStatus, OrderStatusHistory } from "@/types";
import { formatTime } from "@/utils/format";
import { cn } from "@/utils/cn";

const STEP_LABEL: Record<string, string> = {
  placed: "Pedido realizado",
  pending: "Aguardando confirmação",
  confirmed: "Confirmado",
  preparing: "Preparando seu pedido",
  ready: "Pronto para entrega",
  out_for_delivery: "Saiu para entrega",
  delivered: "Entregue",
};

export function OrderTimeline({
  status,
  history,
  cancelReason,
}: {
  status: OrderStatus;
  history: OrderStatusHistory[];
  cancelReason?: string | null;
}) {
  const when = (s: OrderStatus) => history.find((h) => h.status === s)?.created_at;
  const cancelled = status === "cancelled" || status === "rejected";
  const currentIndex = cancelled
    ? ORDER_FLOW.findIndex((s) => !when(s)) - 1
    : ORDER_FLOW.indexOf(status);

  const steps = [
    { key: "placed", done: true, time: when("pending") },
    ...ORDER_FLOW.map((s, i) => ({
      key: s,
      done: i < currentIndex || (i === currentIndex && (cancelled || s === "delivered")),
      active: !cancelled && i === currentIndex && s !== "delivered",
      time: when(s),
    })),
  ];

  return (
    <ol className="relative space-y-0" aria-label="Andamento do pedido">
      {steps.map((step, idx) => {
        const isLast = idx === steps.length - 1;
        const active = "active" in step && step.active;
        return (
          <li key={step.key} className="relative flex gap-3 pb-5 last:pb-0">
            {!isLast && (
              <span
                aria-hidden
                className={cn("absolute left-[15px] top-8 h-[calc(100%-1.5rem)] w-0.5", step.done ? "bg-brand-400" : "bg-ink-100")}
              />
            )}
            <span
              className={cn(
                "relative z-10 grid h-8 w-8 shrink-0 place-items-center rounded-full border-2 text-white transition",
                step.done && "border-brand-500 bg-brand-500",
                active && "border-brand-500 bg-white animate-pulse-ring",
                !step.done && !active && "border-ink-200 bg-white",
              )}
            >
              {step.done && <Check className="h-4 w-4" strokeWidth={3} aria-hidden />}
              {active && <span className="h-2.5 w-2.5 rounded-full bg-brand-500" aria-hidden />}
            </span>
            <div className="pt-1">
              <p className={cn("text-sm font-semibold", step.done || active ? "text-ink-900" : "text-ink-400")}>
                {STEP_LABEL[step.key]}
              </p>
              {step.time && <p className="text-xs text-ink-500">{formatTime(step.time)}</p>}
            </div>
          </li>
        );
      })}
      {cancelled && (
        <li className="relative mt-4 flex gap-3 rounded-2xl bg-red-50 p-3">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-red-600 text-white">
            <X className="h-4 w-4" strokeWidth={3} aria-hidden />
          </span>
          <div className="pt-1">
            <p className="text-sm font-bold text-red-700">
              {status === "rejected" ? "Pedido recusado pelo restaurante" : "Pedido cancelado"}
            </p>
            {cancelReason && <p className="text-xs text-red-600">{cancelReason}</p>}
          </div>
        </li>
      )}
    </ol>
  );
}
