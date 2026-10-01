import type { OpeningHours, Restaurant } from "@/types";
import { WEEKDAYS } from "@/lib/constants";

type DayKey = keyof OpeningHours;

function toMinutes(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

function localParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const weekday = parts.find((p) => p.type === "weekday")?.value ?? "Sun";
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? 0) % 24;
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  const dow = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(weekday);
  return { dow, minutes: hour * 60 + minute };
}

/**
 * Espelha a função SQL public.restaurant_is_open — usada apenas para exibição.
 * A validação que impede pedidos fora do horário acontece no banco.
 */
export function isOpenNow(
  restaurant: Pick<Restaurant, "opening_hours" | "timezone" | "accepting_orders" | "status">,
  at: Date = new Date(),
) {
  if (restaurant.status !== "active" || !restaurant.accepting_orders) return false;
  const hours = restaurant.opening_hours ?? {};
  const { dow, minutes } = localParts(at, restaurant.timezone || "America/Sao_Paulo");

  const today = hours[String(dow) as DayKey];
  if (today) {
    const o = toMinutes(today.open);
    const c = toMinutes(today.close);
    if (c > o && minutes >= o && minutes < c) return true;
    if (c <= o && minutes >= o) return true;
  }
  const yesterday = hours[String((dow + 6) % 7) as DayKey];
  if (yesterday) {
    const o = toMinutes(yesterday.open);
    const c = toMinutes(yesterday.close);
    if (c <= o && minutes < c) return true;
  }
  return false;
}

export function describeDay(hours: OpeningHours, dow: number) {
  const day = hours[String(dow) as DayKey];
  if (!day) return "Fechado";
  if (day.open === day.close) return "24 horas";
  return `${day.open} – ${day.close}`;
}

export function weeklySchedule(hours: OpeningHours) {
  return WEEKDAYS.map((name, dow) => ({ dow, name, text: describeDay(hours, dow) }));
}

export function todayLabel(restaurant: Pick<Restaurant, "opening_hours" | "timezone">) {
  const { dow } = localParts(new Date(), restaurant.timezone || "America/Sao_Paulo");
  return describeDay(restaurant.opening_hours ?? {}, dow);
}
