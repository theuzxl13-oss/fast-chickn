"use client";

import { useState, useTransition } from "react";
import { Check } from "lucide-react";
import { updatePreferencesAction } from "@/app/actions/account";
import { useToast } from "@/components/ui/toast";
import { PAYMENT_METHOD_HINT, PAYMENT_METHOD_LABEL } from "@/lib/constants";
import type { PaymentMethod } from "@/types";
import { cn } from "@/utils/cn";

export function PaymentPreferences({ current }: { current: PaymentMethod | null }) {
  const [value, setValue] = useState(current);
  const [pending, start] = useTransition();
  const toast = useToast();

  return (
    <div className="space-y-2" role="radiogroup" aria-label="Forma de pagamento preferida">
      {(Object.keys(PAYMENT_METHOD_LABEL) as PaymentMethod[]).map((m) => (
        <button
          key={m}
          type="button"
          role="radio"
          aria-checked={value === m}
          disabled={pending}
          onClick={() => {
            const next = value === m ? null : m;
            setValue(next);
            start(async () => {
              const res = await updatePreferencesAction({ preferred_payment_method: next });
              toast(res.ok ? "Preferência salva" : res.error, res.ok ? "success" : "error");
            });
          }}
          className={cn(
            "flex w-full items-center gap-3 rounded-2xl border bg-white p-4 text-left transition",
            value === m ? "border-brand-400 bg-brand-50" : "border-ink-100 hover:border-ink-200",
          )}
        >
          <span className="flex-1">
            <span className="block font-bold">{PAYMENT_METHOD_LABEL[m]}</span>
            <span className="block text-xs text-ink-500">{PAYMENT_METHOD_HINT[m]}</span>
          </span>
          {value === m && <Check className="h-5 w-5 text-brand-600" aria-hidden />}
        </button>
      ))}
    </div>
  );
}
