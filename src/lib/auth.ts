import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Address, Profile, Restaurant, UserRole } from "@/types";

/** Usuário logado + perfil (memoizado por requisição). */
export const getSession = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { user: null, profile: null };

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle<Profile>();
  return { user, profile };
});

export async function requireUser(next = "/") {
  const session = await getSession();
  if (!session.user || !session.profile) redirect(`/login?next=${encodeURIComponent(next)}`);
  if (session.profile.is_blocked) redirect("/?bloqueado=1");
  return { user: session.user, profile: session.profile };
}

export async function requireRole(roles: UserRole[], next = "/") {
  const session = await requireUser(next);
  if (!roles.includes(session.profile.role)) redirect("/");
  return session;
}

/** Endereço padrão do cliente logado (memoizado por requisição). */
export const getDefaultAddress = cache(async (): Promise<Address | null> => {
  const { user } = await getSession();
  if (!user) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("addresses")
    .select("*")
    .eq("user_id", user.id)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<Address>();
  return data ?? null;
});

/** Restaurante vinculado ao parceiro logado (ou null se ainda não cadastrou). */
export const getPartnerRestaurant = cache(async (): Promise<Restaurant | null> => {
  const { user } = await getSession();
  if (!user) return null;
  const supabase = await createClient();
  const { data: link } = await supabase
    .from("restaurant_users")
    .select("restaurant_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle<{ restaurant_id: string }>();
  if (!link) return null;
  const { data } = await supabase
    .from("restaurants")
    .select("*, category:categories(id,name,icon,slug)")
    .eq("id", link.restaurant_id)
    .maybeSingle<Restaurant>();
  return data ?? null;
});

/** Garante parceiro com restaurante cadastrado; redireciona para o cadastro se não houver. */
export async function requirePartnerRestaurant() {
  await requireRole(["restaurant"], "/parceiro");
  const restaurant = await getPartnerRestaurant();
  if (!restaurant) redirect("/parceiro/cadastro");
  return restaurant;
}
