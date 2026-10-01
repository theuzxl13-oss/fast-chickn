"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { adminCancelOrderAction } from "@/app/actions/admin";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

export function AdminCancelOrder({ orderId, code }: { orderId: string; code: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const toast = useToast();
  return (
    <Button
      size="sm"
      variant="ghost"
      className="text-red-600 hover:bg-red-50"
      loading={pending}
      onClick={() => {
        const reason = prompt(`Motivo do cancelamento do pedido #${code}:`);
        if (reason === null) return;
        start(async () => {
          const res = await adminCancelOrderAction(orderId, reason);
          toast(res.ok ? res.message! : res.error, res.ok ? "success" : "error");
          router.refresh();
        });
      }}
    >
      Cancelar
    </Button>
  );
}
