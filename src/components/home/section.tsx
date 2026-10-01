import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { RestaurantCard, type RestaurantCardData } from "@/components/restaurant/restaurant-card";

export function RestaurantRow({
  title,
  emoji,
  href,
  items,
}: {
  title: string;
  emoji?: string;
  href?: string;
  items: RestaurantCardData[];
}) {
  if (!items.length) return null;
  return (
    <section className="mt-8">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-extrabold tracking-tight md:text-xl">
          {emoji && <span aria-hidden>{emoji} </span>}
          {title}
        </h2>
        {href && (
          <Link href={href} className="inline-flex items-center text-sm font-semibold text-brand-600 hover:underline">
            Ver todos <ChevronRight className="h-4 w-4" aria-hidden />
          </Link>
        )}
      </div>
      <div className="no-scrollbar -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 md:mx-0 md:px-0">
        {items.map((item) => (
          <RestaurantCard key={item.restaurant.id} {...item} compact />
        ))}
      </div>
    </section>
  );
}

export function RestaurantGrid({ items }: { items: RestaurantCardData[] }) {
  return (
    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <RestaurantCard key={item.restaurant.id} {...item} />
      ))}
    </div>
  );
}
