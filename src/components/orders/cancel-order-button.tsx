"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cancelOrderAction } from "@/app/actions/orders";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

export function CancelOrderButton({ orderId }: { orderId: string }) {
  const [confirming, setConfirming] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();
  const toast = useToast();

  if (!confirming) {
    return (
      <Button variant="outline" onClick={() => setConfirming(true)}>
        Cancelar pedido
      </Button>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-red-50 p-2">
      <span className="px-2 text-sm font-semibold text-red-700">Cancelar este pedido?</span>
      <Button variant="ghost" size="sm" onClick={() => setConfirming(false)}>
        Não
      </Button>
      <Button
        variant="danger"
        size="sm"
        loading={pending}
        onClick={() =>
          start(async () => {
            const res = await cancelOrderAction(orderId);
            toast(res.ok ? res.message ?? "Pedido cancelado." : res.error, res.ok ? "success" : "error");
            setConfirming(false);
            router.refresh();
          })
        }
      >
        Sim, cancelar
      </Button>
    </div>
  );
}
