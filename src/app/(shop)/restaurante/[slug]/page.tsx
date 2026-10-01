import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Bike, Clock, MapPin, ShoppingBag, Star } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getDefaultAddress, getSession } from "@/lib/auth";
import { getMenu, getRestaurantBySlug } from "@/services/catalog";
import { distanceTo } from "@/lib/geo";
import { isOpenNow, todayLabel, weeklySchedule } from "@/lib/hours";
import { RestaurantLogo } from "@/components/ui/food-image";
import { Badge, RatingStars } from "@/components/ui/misc";
import { FavoriteButton } from "@/components/restaurant/favorite-button";
import { RestaurantMenu } from "@/components/restaurant/restaurant-menu";
import { formatCurrency, formatDate, formatDistance, formatRating } from "@/utils/format";
import type { Review } from "@/types";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ produto?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();
  const restaurant = await getRestaurantBySlug(supabase, slug);
  return { title: restaurant?.name ?? "Restaurante", description: restaurant?.description ?? undefined };
}

export default async function RestaurantPage({ params, searchParams }: Props) {
  const [{ slug }, { produto }] = await Promise.all([params, searchParams]);
  const supabase = await createClient();
  const restaurant = await getRestaurantBySlug(supabase, slug);
  if (!restaurant || restaurant.status !== "active") notFound();

  const [{ user }, address, menu, { data: reviews }] = await Promise.all([
    getSession(),
    getDefaultAddress(),
    getMenu(supabase, restaurant.id),
    supabase
      .from("reviews")
      .select("id, rating, comment, reply, created_at")
      .eq("restaurant_id", restaurant.id)
      .not("comment", "is", null)
      .order("created_at", { ascending: false })
      .limit(4),
  ]);

  let isFavorite = false;
  if (user) {
    const { data } = await supabase
      .from("favorites")
      .select("restaurant_id")
      .eq("user_id", user.id)
      .eq("restaurant_id", restaurant.id)
      .maybeSingle();
    isFavorite = !!data;
  }

  const open = isOpenNow(restaurant);
  const distance = distanceTo(restaurant, address);
  const free = Number(restaurant.delivery_fee) === 0;

  return (
    <div className="animate-fade-up">
      {/* Banner */}
      <div
        className="speed-lines relative -mx-4 h-40 overflow-hidden md:mx-0 md:h-56 md:rounded-4xl"
        style={{ backgroundColor: restaurant.brand_color }}
      >
        {restaurant.banner_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={restaurant.banner_url} alt="" className="h-full w-full object-cover" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-ink-900/40 to-transparent" />
        <div className="absolute right-3 top-3">
          <FavoriteButton restaurantId={restaurant.id} initial={isFavorite} loggedIn={!!user} />
        </div>
      </div>

      {/* Cabeçalho */}
      <div className="relative -mt-12 rounded-4xl border border-ink-100 bg-white p-5 shadow-soft md:mx-6">
        <div className="flex items-start gap-4">
          <RestaurantLogo
            src={restaurant.logo_url}
            name={restaurant.name}
            color={restaurant.brand_color}
            className="h-20 w-20 shrink-0 border-4 border-white text-2xl shadow-soft md:h-24 md:w-24"
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-extrabold tracking-tight md:text-2xl">{restaurant.name}</h1>
              {open ? <Badge tone="success">Aberto</Badge> : <Badge tone="danger">Restaurante fechado</Badge>}
            </div>
            <p className="mt-1 flex flex-wrap items-center gap-x-2 text-sm text-ink-500">
              <span className="inline-flex items-center gap-1 font-bold text-accent-600">
                <Star className="h-4 w-4 fill-accent-400 text-accent-400" aria-hidden />
                {restaurant.rating_count ? formatRating(restaurant.rating_avg) : "Novo"}
                {restaurant.rating_count > 0 && (
                  <span className="font-medium text-ink-400">({restaurant.rating_count})</span>
                )}
              </span>
              <span aria-hidden>•</span>
              <span>
                {restaurant.category?.icon} {[restaurant.category?.name, ...restaurant.tags].filter(Boolean).join(" • ")}
              </span>
            </p>
            {restaurant.description && <p className="mt-2 text-sm text-ink-600">{restaurant.description}</p>}
          </div>
        </div>

        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
          <div className="rounded-2xl bg-ink-50 p-3">
            <dt className="flex items-center gap-1 text-xs text-ink-500"><Clock className="h-3.5 w-3.5" aria-hidden /> Tempo</dt>
            <dd className="font-bold">{restaurant.delivery_time_min}–{restaurant.delivery_time_max} min</dd>
          </div>
          <div className="rounded-2xl bg-ink-50 p-3">
            <dt className="flex items-center gap-1 text-xs text-ink-500"><Bike className="h-3.5 w-3.5" aria-hidden /> Entrega</dt>
            <dd className={free ? "font-bold text-emerald-600" : "font-bold"}>{free ? "Grátis" : formatCurrency(restaurant.delivery_fee)}</dd>
          </div>
          <div className="rounded-2xl bg-ink-50 p-3">
            <dt className="flex items-center gap-1 text-xs text-ink-500"><ShoppingBag className="h-3.5 w-3.5" aria-hidden /> Pedido mínimo</dt>
            <dd className="font-bold">{Number(restaurant.min_order) > 0 ? formatCurrency(restaurant.min_order) : "Sem mínimo"}</dd>
          </div>
          <div className="rounded-2xl bg-ink-50 p-3">
            <dt className="flex items-center gap-1 text-xs text-ink-500"><MapPin className="h-3.5 w-3.5" aria-hidden /> Distância</dt>
            <dd className="font-bold">{distance != null ? formatDistance(distance) : "—"}</dd>
          </div>
        </dl>

        <details className="group mt-3 rounded-2xl bg-ink-50 px-4 py-3 text-sm">
          <summary className="flex cursor-pointer list-none items-center justify-between font-semibold">
            <span>Hoje: {todayLabel(restaurant)}</span>
            <span className="text-xs text-brand-600 group-open:hidden">Ver horários</span>
          </summary>
          <ul className="mt-2 space-y-1">
            {weeklySchedule(restaurant.opening_hours).map((d) => (
              <li key={d.dow} className="flex justify-between text-ink-600">
                <span>{d.name}</span>
                <span className={d.text === "Fechado" ? "text-red-600" : "font-medium"}>{d.text}</span>
              </li>
            ))}
          </ul>
        </details>

        {restaurant.promo_label && (
          <div className="mt-3 rounded-2xl bg-accent-100 px-4 py-3 text-sm font-bold text-ink-900">🔥 {restaurant.promo_label}</div>
        )}
        {!open && (
          <div className="mt-3 rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            O restaurante está fechado agora. Você pode ver o cardápio, mas novos pedidos estão indisponíveis.
          </div>
        )}
      </div>

      <RestaurantMenu
        restaurant={restaurant}
        categories={menu.categories}
        products={menu.products}
        isOpen={open}
        initialProductId={produto ?? null}
      />

      {reviews && reviews.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-3 text-lg font-extrabold">O que dizem os clientes</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {(reviews as Pick<Review, "id" | "rating" | "comment" | "reply" | "created_at">[]).map((r) => (
              <article key={r.id} className="rounded-3xl border border-ink-100 bg-white p-4 shadow-soft">
                <div className="flex items-center justify-between">
                  <RatingStars value={r.rating} />
                  <span className="text-xs text-ink-400">{formatDate(r.created_at)}</span>
                </div>
                <p className="mt-2 text-sm text-ink-700">{r.comment}</p>
                {r.reply && (
                  <p className="mt-2 rounded-2xl bg-ink-50 p-3 text-xs text-ink-600">
                    <strong>Resposta do restaurante:</strong> {r.reply}
                  </p>
                )}
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
