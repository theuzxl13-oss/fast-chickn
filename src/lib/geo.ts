import { DEFAULT_COORDS } from "@/lib/env";

export interface Coords {
  lat: number;
  lng: number;
}

/** Distância em km entre dois pontos (fórmula de Haversine). */
export function haversineKm(a: Coords, b: Coords) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Distância do restaurante até o cliente (ou até o ponto padrão da cidade). */
export function distanceTo(
  restaurant: { latitude: number | null; longitude: number | null },
  origin?: { latitude: number | null; longitude: number | null } | null,
) {
  if (restaurant.latitude == null || restaurant.longitude == null) return null;
  const from =
    origin?.latitude != null && origin?.longitude != null
      ? { lat: origin.latitude, lng: origin.longitude }
      : DEFAULT_COORDS;
  return haversineKm(from, { lat: restaurant.latitude, lng: restaurant.longitude });
}
