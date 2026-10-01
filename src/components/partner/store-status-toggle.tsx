"use client";

import { useState, useTransition } from "react";
import { setAcceptingOrdersAction } from "@/app/actions/partner";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/utils/cn";

/** Abrir/pausar a loja manualmente (além do horário de funcionamento). */
export function StoreStatusToggle({ accepting, openBySchedule }: { accepting: boolean; openBySchedule: boolean }) {
  const [on, setOn] = useState(accepting);
  const [pending, start] = useTransition();
  const toast = useToast();

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-ink-100 bg-white px-4 py-2 shadow-soft">
      <span className="text-sm">
        <span className="block font-bold">{on ? (openBySchedule ? "Loja aberta" : "Fora do horário") : "Loja pausada"}</span>
        <span className="block text-xs text-ink-500">{on ? "Recebendo pedidos no horário" : "Clientes não podem pedir"}</span>
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label="Receber pedidos"
        disabled={pending}
        onClick={() => {
          const next = !on;
          setOn(next);
          start(async () => {
            const res = await setAcceptingOrdersAction(next);
            if (!res.ok) setOn(!next);
            toast(res.ok ? res.message! : res.error, res.ok ? "success" : "error");
          });
        }}
        className={cn("relative h-7 w-12 rounded-full transition", on ? "bg-emerald-500" : "bg-ink-200")}
      >
        <span className={cn("absolute left-1 top-1 h-5 w-5 rounded-full bg-white shadow transition", on && "translate-x-5")} />
      </button>
    </div>
  );
}
