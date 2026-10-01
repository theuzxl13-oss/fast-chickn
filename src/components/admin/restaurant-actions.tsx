"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Star } from "lucide-react";
import { setRestaurantFeaturedAction, setRestaurantStatusAction } from "@/app/actions/admin";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import type { RestaurantStatus } from "@/types";
import { cn } from "@/utils/cn";

const ACTIONS: Record<RestaurantStatus, { status: RestaurantStatus; label: string; variant: "success" | "outline" | "danger" }[]> = {
  pending: [
    { status: "active", label: "Aprovar", variant: "success" },
    { status: "rejected", label: "Reprovar", variant: "danger" },
  ],
  active: [
    { status: "suspended", label: "Suspender", variant: "outline" },
    { status: "blocked", label: "Bloquear", variant: "danger" },
  ],
  suspended: [
    { status: "active", label: "Ativar", variant: "success" },
    { status: "blocked", label: "Bloquear", variant: "danger" },
  ],
  blocked: [{ status: "active", label: "Liberar", variant: "success" }],
  rejected: [{ status: "pending", label: "Reabrir análise", variant: "outline" }],
};

export function RestaurantActions({ id, status, featured }: { id: string; status: RestaurantStatus; featured: boolean }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const toast = useToast();

  const run = (fn: () => ReturnType<typeof setRestaurantStatusAction>) =>
    start(async () => {
      const res = await fn();
      toast(res.ok ? res.message! : res.error, res.ok ? "success" : "error");
      router.refresh();
    });

  return (
    <div className="flex flex-wrap items-center justify-end gap-1">
      {status === "active" && (
        <button
          type="button"
          disabled={pending}
          onClick={() => run(() => setRestaurantFeaturedAction(id, !featured))}
          className="grid h-9 w-9 place-items-center rounded-full hover:bg-ink-100"
          aria-label={featured ? "Remover destaque" : "Destacar na home"}
          title={featured ? "Remover destaque" : "Destacar na home"}
        >
          <Star className={cn("h-4 w-4", featured ? "fill-accent-400 text-accent-400" : "text-ink-400")} />
        </button>
      )}
      {ACTIONS[status].map((a) => (
        <Button
          key={a.status}
          size="sm"
          variant={a.variant}
          disabled={pending}
          onClick={() => {
            if (a.variant === "danger" && !confirm(`Confirmar: ${a.label.toLowerCase()} este restaurante?`)) return;
            run(() => setRestaurantStatusAction(id, a.status));
          }}
        >
          {a.label}
        </Button>
      ))}
    </div>
  );
}
