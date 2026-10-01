"use client";

import { useState, useTransition } from "react";
import { updateOpeningHoursAction } from "@/app/actions/partner";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { WEEKDAYS } from "@/lib/constants";
import type { OpeningHours } from "@/types";

type Key = "0" | "1" | "2" | "3" | "4" | "5" | "6";
const ORDER: Key[] = ["1", "2", "3", "4", "5", "6", "0"]; // segunda → domingo

export function OpeningHoursForm({ hours }: { hours: OpeningHours }) {
  const [value, setValue] = useState<Record<Key, { open: string; close: string } | null>>(() =>
    Object.fromEntries(ORDER.map((k) => [k, hours[k] ?? null])) as Record<Key, { open: string; close: string } | null>,
  );
  const [pending, start] = useTransition();
  const toast = useToast();

  const set = (k: Key, patch: Partial<{ open: string; close: string }> | null) =>
    setValue((prev) => ({ ...prev, [k]: patch === null ? null : { open: "18:00", close: "23:00", ...prev[k], ...patch } }));

  return (
    <div className="space-y-2">
      {ORDER.map((k) => {
        const day = value[k];
        return (
          <div key={k} className="flex flex-wrap items-center gap-2 rounded-2xl border border-ink-100 p-2">
            <label className="flex w-28 items-center gap-2 text-sm font-semibold">
              <input type="checkbox" checked={!!day} onChange={(e) => set(k, e.target.checked ? {} : null)} className="h-4 w-4 accent-brand-500" />
              {WEEKDAYS[Number(k)]}
            </label>
            {day ? (
              <div className="flex items-center gap-1 text-sm">
                <input type="time" value={day.open} onChange={(e) => set(k, { open: e.target.value })} className="h-9 rounded-xl border border-ink-200 px-2" aria-label={`Abertura ${WEEKDAYS[Number(k)]}`} />
                <span className="text-ink-400">–</span>
                <input type="time" value={day.close} onChange={(e) => set(k, { close: e.target.value })} className="h-9 rounded-xl border border-ink-200 px-2" aria-label={`Fechamento ${WEEKDAYS[Number(k)]}`} />
                {day.close <= day.open && <span className="text-xs text-ink-500">{day.close === day.open ? "24h" : "até o dia seguinte"}</span>}
              </div>
            ) : (
              <span className="text-sm font-medium text-red-600">Fechado</span>
            )}
          </div>
        );
      })}
      <Button
        className="mt-2 w-full"
        loading={pending}
        onClick={() =>
          start(async () => {
            const res = await updateOpeningHoursAction(value);
            toast(res.ok ? res.message! : res.error, res.ok ? "success" : "error");
          })
        }
      >
        Salvar horários
      </Button>
    </div>
  );
}
