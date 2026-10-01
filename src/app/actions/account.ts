"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { addressSchema, firstError, profileSchema, toFieldErrors } from "@/lib/validation";
import type { ActionResult, PaymentMethod } from "@/types";

async function requireUserId() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, userId: user?.id ?? null };
}

export async function updateProfileAction(_: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const { supabase, userId } = await requireUserId();
  if (!userId) return { ok: false, error: "Faça login novamente." };

  const parsed = profileSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: firstError(parsed.error), fieldErrors: toFieldErrors(parsed.error) };

  const { error } = await supabase
    .from("profiles")
    .update({ full_name: parsed.data.full_name, phone: parsed.data.phone || null })
    .eq("id", userId);
  if (error) return { ok: false, error: "Não foi possível salvar o perfil." };

  revalidatePath("/", "layout");
  return { ok: true, message: "Perfil atualizado!" };
}

export async function saveAddressAction(_: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const { supabase, userId } = await requireUserId();
  if (!userId) return { ok: false, error: "Faça login novamente." };

  const parsed = addressSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: firstError(parsed.error), fieldErrors: toFieldErrors(parsed.error) };

  const id = formData.get("id");
  const payload = { ...parsed.data, user_id: userId };

  const { error } =
    typeof id === "string" && z.uuid().safeParse(id).success
      ? await supabase.from("addresses").update(payload).eq("id", id).eq("user_id", userId)
      : await supabase.from("addresses").insert(payload);
  if (error) return { ok: false, error: "Não foi possível salvar o endereço." };

  revalidatePath("/", "layout");
  return { ok: true, message: "Endereço salvo!" };
}

export async function deleteAddressAction(id: string): Promise<ActionResult> {
  const { supabase, userId } = await requireUserId();
  if (!userId || !z.uuid().safeParse(id).success) return { ok: false, error: "Requisição inválida." };
  const { error } = await supabase.from("addresses").delete().eq("id", id).eq("user_id", userId);
  if (error) return { ok: false, error: "Não foi possível remover o endereço." };

  // Garante que continue existindo um endereço padrão
  const { data: rest } = await supabase.from("addresses").select("id, is_default").eq("user_id", userId);
  if (rest?.length && !rest.some((a) => a.is_default)) {
    await supabase.from("addresses").update({ is_default: true }).eq("id", rest[0].id);
  }
  revalidatePath("/", "layout");
  return { ok: true, message: "Endereço removido." };
}

export async function setDefaultAddressAction(id: string): Promise<ActionResult> {
  const { supabase, userId } = await requireUserId();
  if (!userId || !z.uuid().safeParse(id).success) return { ok: false, error: "Requisição inválida." };
  const { error } = await supabase.from("addresses").update({ is_default: true }).eq("id", id).eq("user_id", userId);
  if (error) return { ok: false, error: "Não foi possível definir o endereço padrão." };
  revalidatePath("/", "layout");
  return { ok: true, message: "Endereço padrão atualizado." };
}

export async function toggleFavoriteAction(restaurantId: string): Promise<ActionResult<{ favorite: boolean }>> {
  const { supabase, userId } = await requireUserId();
  if (!userId) return { ok: false, error: "Entre na sua conta para favoritar." };
  if (!z.uuid().safeParse(restaurantId).success) return { ok: false, error: "Restaurante inválido." };

  const { data: existing } = await supabase
    .from("favorites")
    .select("restaurant_id")
    .eq("user_id", userId)
    .eq("restaurant_id", restaurantId)
    .maybeSingle();

  if (existing) {
    await supabase.from("favorites").delete().eq("user_id", userId).eq("restaurant_id", restaurantId);
  } else {
    const { error } = await supabase.from("favorites").insert({ user_id: userId, restaurant_id: restaurantId });
    if (error) return { ok: false, error: "Não foi possível favoritar." };
  }
  revalidatePath("/favoritos");
  return { ok: true, data: { favorite: !existing } };
}

const preferencesSchema = z.object({
  notifications_enabled: z.boolean(),
  preferred_payment_method: z.enum(["pix", "credit_card", "debit_card", "cash", "on_delivery"]).nullable(),
});

export async function updatePreferencesAction(input: {
  notifications_enabled?: boolean;
  preferred_payment_method?: PaymentMethod | null;
}): Promise<ActionResult> {
  const { supabase, userId } = await requireUserId();
  if (!userId) return { ok: false, error: "Faça login novamente." };
  const parsed = preferencesSchema.partial().safeParse(input);
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };
  const { error } = await supabase.from("profiles").update(parsed.data).eq("id", userId);
  if (error) return { ok: false, error: "Não foi possível salvar." };
  revalidatePath("/conta", "layout");
  return { ok: true, message: "Preferências salvas." };
}
