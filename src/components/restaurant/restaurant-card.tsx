import Link from "next/link";
import { Bike, Clock, MapPin, Star } from "lucide-react";
import { RestaurantLogo } from "@/components/ui/food-image";
import { Badge } from "@/components/ui/misc";
import type { Restaurant } from "@/types";
import { formatCurrency, formatDistance, formatRating } from "@/utils/format";
import { cn } from "@/utils/cn";

export interface RestaurantCardData {
  restaurant: Restaurant;
  distanceKm: number | null;
  isOpen: boolean;
}

export function RestaurantCard({ restaurant: r, distanceKm, isOpen, compact = false }: RestaurantCardData & { compact?: boolean }) {
  const free = Number(r.delivery_fee) === 0;
  const subtitle = [r.category?.name, ...r.tags.slice(0, 1)].filter(Boolean).join(" • ");

  return (
    <Link
      href={`/restaurante/${r.slug}`}
      className={cn(
        "group flex gap-3 rounded-3xl border border-ink-100 bg-white p-3 shadow-soft transition duration-200 hover:-translate-y-0.5 hover:shadow-lift",
        compact ? "w-72 shrink-0 snap-start" : "w-full",
        !isOpen && "opacity-70",
      )}
    >
      <div className="relative shrink-0">
        <RestaurantLogo src={r.logo_url} name={r.name} color={r.brand_color} className="h-20 w-20 text-2xl" />
        {!isOpen && (
          <span className="absolute inset-0 grid place-items-center rounded-2xl bg-ink-900/60 text-[11px] font-bold uppercase text-white">
            Fechado
          </span>
        )}
      </div>
      <div className="min-w-0 flex-1 py-0.5">
        <h3 className="truncate font-bold text-ink-900 group-hover:text-brand-600">{r.name}</h3>
        <p className="mt-0.5 flex items-center gap-1.5 text-xs text-ink-500">
          <span className="inline-flex items-center gap-0.5 font-bold text-accent-600">
            <Star className="h-3.5 w-3.5 fill-accent-400 text-accent-400" aria-hidden />
            {r.rating_count > 0 ? formatRating(r.rating_avg) : "Novo"}
          </span>
          <span aria-hidden>•</span>
          <span className="truncate">
            {r.category?.icon} {subtitle}
          </span>
        </p>
        <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-ink-500">
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" aria-hidden />
            {r.delivery_time_min}–{r.delivery_time_max} min
          </span>
          {distanceKm != null && (
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" aria-hidden />
              {formatDistance(distanceKm)}
            </span>
          )}
          <span className={cn("inline-flex items-center gap-1", free && "font-bold text-emerald-600")}>
            <Bike className="h-3.5 w-3.5" aria-hidden />
            {free ? "Entrega grátis" : `Entrega ${formatCurrency(r.delivery_fee)}`}
          </span>
        </p>
        {r.promo_label && (
          <Badge tone="brand" className="mt-2">
            🔥 {r.promo_label}
          </Badge>
        )}
      </div>
    </Link>
  );
}
