import type { RestaurantCardData } from "@/components/restaurant/restaurant-card";
import { distanceTo } from "@/lib/geo";
import { isOpenNow } from "@/lib/hours";
import type { Address, Restaurant } from "@/types";

/** Enriquecer restaurantes com distância e status aberto/fechado para os cards. */
export function toCardData(restaurants: Restaurant[], address: Address | null): RestaurantCardData[] {
  const now = new Date();
  return restaurants.map((restaurant) => ({
    restaurant,
    distanceKm: distanceTo(restaurant, address),
    isOpen: isOpenNow(restaurant, now),
  }));
}

/** Abertos primeiro, preservando a ordem original. */
export function openFirst(items: RestaurantCardData[]) {
  return [...items].sort((a, b) => Number(b.isOpen) - Number(a.isOpen));
}
