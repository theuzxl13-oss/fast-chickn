"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Heart } from "lucide-react";
import { toggleFavoriteAction } from "@/app/actions/account";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/utils/cn";

export function FavoriteButton({
  restaurantId,
  initial,
  loggedIn,
}: {
  restaurantId: string;
  initial: boolean;
  loggedIn: boolean;
}) {
  const [favorite, setFavorite] = useState(initial);
  const [pending, start] = useTransition();
  const router = useRouter();
  const toast = useToast();

  return (
    <button
      type="button"
      disabled={pending}
      aria-pressed={favorite}
      aria-label={favorite ? "Remover dos favoritos" : "Adicionar aos favoritos"}
      onClick={() => {
        if (!loggedIn) {
          router.push(`/login?next=${encodeURIComponent(window.location.pathname)}`);
          return;
        }
        setFavorite((v) => !v);
        start(async () => {
          const res = await toggleFavoriteAction(restaurantId);
          if (!res.ok) {
            setFavorite((v) => !v);
            toast(res.error, "error");
          } else {
            toast(res.data?.favorite ? "Adicionado aos favoritos ❤️" : "Removido dos favoritos");
          }
        });
      }}
      className="grid h-11 w-11 place-items-center rounded-full bg-white/95 shadow-soft transition hover:scale-105"
    >
      <Heart className={cn("h-5 w-5 transition", favorite ? "fill-brand-500 text-brand-500" : "text-ink-700")} />
    </button>
  );
}
