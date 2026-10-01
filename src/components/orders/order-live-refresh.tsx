"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * Escuta mudanças do pedido e do pagamento via Supabase Realtime e atualiza
 * a página (Server Component) sempre que o restaurante altera o status.
 */
export function OrderLiveRefresh({ orderId }: { orderId: string }) {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`order:${orderId}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "orders", filter: `id=eq.${orderId}` }, () =>
        router.refresh(),
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "payments", filter: `order_id=eq.${orderId}` },
        () => router.refresh(),
      )
      .subscribe();

    // Fallback caso o Realtime esteja indisponível
    const poll = setInterval(() => router.refresh(), 30_000);
    return () => {
      clearInterval(poll);
      supabase.removeChannel(channel);
    };
  }, [orderId, router]);

  return null;
}
