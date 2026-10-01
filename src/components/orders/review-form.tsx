"use client";

import { useFormAction } from "@/hooks/use-form-action";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Star } from "lucide-react";
import { submitReviewAction } from "@/app/actions/orders";
import { Button } from "@/components/ui/button";
import { FormMessage, Textarea } from "@/components/ui/form";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/utils/cn";

function StarPicker({ name, label, value, onChange }: { name: string; label: string; value: number; onChange: (v: number) => void }) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-bold">{label}</legend>
      <input type="hidden" name={name} value={value || ""} />
      <div className="flex gap-1" role="radiogroup" aria-label={label}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            aria-label={`${n} estrela${n > 1 ? "s" : ""}`}
            onClick={() => onChange(n)}
            className="rounded-xl p-1 transition hover:scale-110"
          >
            <Star className={cn("h-9 w-9", n <= value ? "fill-accent-400 text-accent-400" : "text-ink-200")} />
          </button>
        ))}
      </div>
    </fieldset>
  );
}

export function ReviewForm({ orderId }: { orderId: string }) {
  const { state, onSubmit, pending } = useFormAction(submitReviewAction);
  const [rating, setRating] = useState(0);
  const [food, setFood] = useState(0);
  const [delivery, setDelivery] = useState(0);
  const router = useRouter();
  const toast = useToast();

  useEffect(() => {
    if (state?.ok) {
      toast(state.message ?? "Obrigado!");
      router.push("/pedidos");
    }
  }, [state, router, toast]);

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <input type="hidden" name="order_id" value={orderId} />
      <StarPicker name="rating" label="Nota geral" value={rating} onChange={setRating} />
      <StarPicker name="food_rating" label="Como estava a comida?" value={food} onChange={setFood} />
      <StarPicker name="delivery_rating" label="Como foi a entrega?" value={delivery} onChange={setDelivery} />
      <div>
        <label htmlFor="comment" className="mb-2 block text-sm font-bold">
          Deixe um comentário (opcional)
        </label>
        <Textarea id="comment" name="comment" maxLength={1000} placeholder="Conte como foi sua experiência" />
      </div>
      <FormMessage error={state && !state.ok ? state.error : null} />
      <Button type="submit" size="lg" className="w-full" loading={pending} disabled={!rating}>
        Enviar avaliação
      </Button>
    </form>
  );
}
