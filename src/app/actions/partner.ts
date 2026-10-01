"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getPartnerRestaurant, getSession } from "@/lib/auth";
import {
  couponSchema,
  firstError,
  localInputToIso,
  menuCategorySchema,
  openingHoursSchema,
  optionGroupSchema,
  productSchema,
  restaurantSettingsSchema,
  restaurantSignupSchema,
  toFieldErrors,
} from "@/lib/validation";
import { SUPABASE_URL } from "@/lib/env";
import { slugify } from "@/utils/sanitize";
import type { ActionResult, OrderStatus } from "@/types";

const uuid = z.uuid();

function dbError(error: { message?: string; code?: string } | null, fallback: string) {
  if (error?.code === "P0001" && error.message) return error.message;
  if (error?.code === "23505") return "Já existe um registro com esses dados.";
  return fallback;
}

/** Só aceita imagens do bucket público do próprio projeto. */
function validImageUrl(value: unknown, restaurantId: string): string | null {
  if (typeof value !== "string" || !value) return null;
  const prefix = `${SUPABASE_URL}/storage/v1/object/public/images/restaurants/${restaurantId}/`;
  return value.startsWith(prefix) ? value : null;
}

async function ctx() {
  const restaurant = await getPartnerRestaurant();
  const supabase = await createClient();
  return { restaurant, supabase };
}

function revalidateMenu(slug: string) {
  revalidatePath("/parceiro/cardapio");
  revalidatePath("/parceiro/promocoes");
  revalidatePath("/parceiro/categorias");
  revalidatePath(`/restaurante/${slug}`);
}

// --- Cadastro e configurações ------------------------------------------------

export async function registerRestaurantAction(_: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const { profile } = await getSession();
  if (profile?.role !== "restaurant") return { ok: false, error: "Apenas contas de parceiro." };

  const parsed = restaurantSignupSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: firstError(parsed.error), fieldErrors: toFieldErrors(parsed.error) };

  const d = parsed.data;
  const base = slugify(d.name) || "restaurante";
  const slug = `${base}-${Math.random().toString(36).slice(2, 6)}`;

  const supabase = await createClient();
  const { error } = await supabase.rpc("create_restaurant", {
    p_name: d.name,
    p_slug: slug,
    p_category_id: d.category_id,
    p_phone: d.phone,
    p_document: d.document,
    p_cep: d.cep,
    p_street: d.street,
    p_number: d.number,
    p_neighborhood: d.neighborhood,
    p_city: d.city,
    p_state: d.state,
    p_description: d.description,
  });
  if (error) return { ok: false, error: dbError(error, "Não foi possível cadastrar o restaurante.") };
  redirect("/parceiro");
}

export async function updateRestaurantSettingsAction(_: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const { restaurant, supabase } = await ctx();
  if (!restaurant) return { ok: false, error: "Restaurante não encontrado." };

  const parsed = restaurantSettingsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: firstError(parsed.error), fieldErrors: toFieldErrors(parsed.error) };

  const { error } = await supabase
    .from("restaurants")
    .update({
      ...parsed.data,
      logo_url: validImageUrl(formData.get("logo_url"), restaurant.id),
      banner_url: validImageUrl(formData.get("banner_url"), restaurant.id),
    })
    .eq("id", restaurant.id);
  if (error) return { ok: false, error: dbError(error, "Não foi possível salvar.") };

  revalidatePath("/parceiro", "layout");
  revalidatePath(`/restaurante/${restaurant.slug}`);
  return { ok: true, message: "Configurações salvas!" };
}

export async function updateOpeningHoursAction(hours: unknown): Promise<ActionResult> {
  const { restaurant, supabase } = await ctx();
  if (!restaurant) return { ok: false, error: "Restaurante não encontrado." };
  const parsed = openingHoursSchema.safeParse(hours);
  if (!parsed.success) return { ok: false, error: "Horários inválidos. Use o formato HH:MM." };

  const { error } = await supabase.from("restaurants").update({ opening_hours: parsed.data }).eq("id", restaurant.id);
  if (error) return { ok: false, error: "Não foi possível salvar os horários." };
  revalidatePath("/parceiro/configuracoes");
  revalidatePath(`/restaurante/${restaurant.slug}`);
  return { ok: true, message: "Horários atualizados!" };
}

export async function setAcceptingOrdersAction(accepting: boolean): Promise<ActionResult> {
  const { restaurant, supabase } = await ctx();
  if (!restaurant) return { ok: false, error: "Restaurante não encontrado." };
  const { error } = await supabase.from("restaurants").update({ accepting_orders: !!accepting }).eq("id", restaurant.id);
  if (error) return { ok: false, error: "Não foi possível atualizar." };
  revalidatePath("/parceiro", "layout");
  return { ok: true, message: accepting ? "Loja aberta para pedidos." : "Loja pausada." };
}

// --- Categorias do cardápio --------------------------------------------------

export async function saveMenuCategoryAction(_: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const { restaurant, supabase } = await ctx();
  if (!restaurant) return { ok: false, error: "Restaurante não encontrado." };
  const parsed = menuCategorySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: firstError(parsed.error), fieldErrors: toFieldErrors(parsed.error) };

  const id = formData.get("id");
  const { error } =
    typeof id === "string" && uuid.safeParse(id).success
      ? await supabase.from("menu_categories").update(parsed.data).eq("id", id).eq("restaurant_id", restaurant.id)
      : await supabase.from("menu_categories").insert({ ...parsed.data, restaurant_id: restaurant.id });
  if (error) return { ok: false, error: dbError(error, "Não foi possível salvar a categoria.") };
  revalidateMenu(restaurant.slug);
  return { ok: true, message: "Categoria salva!" };
}

export async function deleteMenuCategoryAction(id: string): Promise<ActionResult> {
  const { restaurant, supabase } = await ctx();
  if (!restaurant || !uuid.safeParse(id).success) return { ok: false, error: "Requisição inválida." };
  const { error } = await supabase.from("menu_categories").delete().eq("id", id).eq("restaurant_id", restaurant.id);
  if (error) return { ok: false, error: "Não foi possível excluir." };
  revalidateMenu(restaurant.slug);
  return { ok: true, message: "Categoria excluída. Os produtos dela ficaram em “Outros”." };
}

// --- Produtos ------------------------------------------------------------------

const optionsPayloadSchema = z.array(
  optionGroupSchema.and(
    z.object({
      id: z.uuid().optional(),
      items: z.array(z.object({ id: z.uuid().optional() }).passthrough()),
    }),
  ),
).max(10);

export async function saveProductAction(_: ActionResult<{ id: string }> | null, formData: FormData): Promise<ActionResult<{ id: string }>> {
  const { restaurant, supabase } = await ctx();
  if (!restaurant) return { ok: false, error: "Restaurante não encontrado." };

  const parsed = productSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: firstError(parsed.error), fieldErrors: toFieldErrors(parsed.error) };

  let groups: z.infer<typeof optionsPayloadSchema> = [];
  try {
    const raw = JSON.parse(String(formData.get("options") ?? "[]"));
    const parsedGroups = optionsPayloadSchema.safeParse(raw);
    if (!parsedGroups.success) return { ok: false, error: `Adicionais: ${firstError(parsedGroups.error)}` };
    groups = parsedGroups.data;
  } catch {
    return { ok: false, error: "Adicionais inválidos." };
  }

  const payload = {
    ...parsed.data,
    image_url: validImageUrl(formData.get("image_url"), restaurant.id),
    restaurant_id: restaurant.id,
  };

  const idRaw = formData.get("id");
  const isEdit = typeof idRaw === "string" && uuid.safeParse(idRaw).success;
  const { data: product, error } = isEdit
    ? await supabase.from("products").update(payload).eq("id", idRaw).eq("restaurant_id", restaurant.id).select("id").single()
    : await supabase.from("products").insert(payload).select("id").single();
  if (error || !product) return { ok: false, error: dbError(error, "Não foi possível salvar o produto.") };

  // Sincroniza grupos de opções preservando IDs existentes
  const { data: existing } = await supabase
    .from("product_options")
    .select("id, items:product_option_items(id)")
    .eq("product_id", product.id);
  const keepGroupIds = new Set(groups.map((g) => g.id).filter(Boolean));
  const removeGroups = (existing ?? []).filter((g) => !keepGroupIds.has(g.id)).map((g) => g.id);
  if (removeGroups.length) await supabase.from("product_options").delete().in("id", removeGroups);

  for (const [gi, group] of groups.entries()) {
    const groupRow = { product_id: product.id, name: group.name, min_select: group.min_select, max_select: group.max_select, sort_order: gi };
    const known = group.id && (existing ?? []).some((g) => g.id === group.id);
    const { data: savedGroup, error: gErr } = known
      ? await supabase.from("product_options").update(groupRow).eq("id", group.id!).select("id").single()
      : await supabase.from("product_options").insert(groupRow).select("id").single();
    if (gErr || !savedGroup) return { ok: false, error: "Erro ao salvar os adicionais." };

    const existingItems = ((existing ?? []).find((g) => g.id === savedGroup.id)?.items ?? []) as { id: string }[];
    const keepItemIds = new Set(group.items.map((i) => (i as { id?: string }).id).filter(Boolean));
    const removeItems = existingItems.filter((i) => !keepItemIds.has(i.id)).map((i) => i.id);
    if (removeItems.length) await supabase.from("product_option_items").delete().in("id", removeItems);

    for (const [ii, item] of group.items.entries()) {
      const itemId = (item as { id?: string }).id;
      const row = { option_id: savedGroup.id, name: item.name, price: item.price, is_available: item.is_available, sort_order: ii };
      const { error: iErr } =
        itemId && existingItems.some((e) => e.id === itemId)
          ? await supabase.from("product_option_items").update(row).eq("id", itemId)
          : await supabase.from("product_option_items").insert(row);
      if (iErr) return { ok: false, error: "Erro ao salvar um item adicional." };
    }
  }

  revalidateMenu(restaurant.slug);
  return { ok: true, data: { id: product.id }, message: isEdit ? "Produto atualizado!" : "Produto criado!" };
}

export async function deleteProductAction(id: string): Promise<ActionResult> {
  const { restaurant, supabase } = await ctx();
  if (!restaurant || !uuid.safeParse(id).success) return { ok: false, error: "Requisição inválida." };
  const { error } = await supabase.from("products").delete().eq("id", id).eq("restaurant_id", restaurant.id);
  if (error) return { ok: false, error: "Não foi possível excluir." };
  revalidateMenu(restaurant.slug);
  return { ok: true, message: "Produto excluído." };
}

export async function toggleProductAction(id: string, available: boolean): Promise<ActionResult> {
  const { restaurant, supabase } = await ctx();
  if (!restaurant || !uuid.safeParse(id).success) return { ok: false, error: "Requisição inválida." };
  const { error } = await supabase
    .from("products")
    .update({ is_available: !!available })
    .eq("id", id)
    .eq("restaurant_id", restaurant.id);
  if (error) return { ok: false, error: "Não foi possível atualizar." };
  revalidateMenu(restaurant.slug);
  return { ok: true, message: available ? "Produto ativado." : "Produto desativado." };
}

export async function duplicateProductAction(id: string): Promise<ActionResult> {
  const { restaurant, supabase } = await ctx();
  if (!restaurant || !uuid.safeParse(id).success) return { ok: false, error: "Requisição inválida." };

  const { data: src } = await supabase
    .from("products")
    .select("*, options:product_options(*, items:product_option_items(*))")
    .eq("id", id)
    .eq("restaurant_id", restaurant.id)
    .single();
  if (!src) return { ok: false, error: "Produto não encontrado." };

  const { data: copy, error } = await supabase
    .from("products")
    .insert({
      restaurant_id: restaurant.id,
      menu_category_id: src.menu_category_id,
      name: `${src.name} (cópia)`.slice(0, 80),
      description: src.description,
      image_url: src.image_url,
      price: src.price,
      promo_price: src.promo_price,
      ingredients: src.ingredients,
      is_available: false,
      sort_order: src.sort_order + 1,
    })
    .select("id")
    .single();
  if (error || !copy) return { ok: false, error: "Não foi possível duplicar." };

  for (const group of src.options ?? []) {
    const { data: g } = await supabase
      .from("product_options")
      .insert({ product_id: copy.id, name: group.name, min_select: group.min_select, max_select: group.max_select, sort_order: group.sort_order })
      .select("id")
      .single();
    if (g && group.items?.length) {
      await supabase.from("product_option_items").insert(
        group.items.map((i: { name: string; price: number; is_available: boolean; sort_order: number }) => ({
          option_id: g.id,
          name: i.name,
          price: i.price,
          is_available: i.is_available,
          sort_order: i.sort_order,
        })),
      );
    }
  }
  revalidateMenu(restaurant.slug);
  return { ok: true, message: "Produto duplicado (desativado até você revisar)." };
}

// --- Promoções ---------------------------------------------------------------

export async function setPromoPriceAction(id: string, promoPrice: number | null): Promise<ActionResult> {
  const { restaurant, supabase } = await ctx();
  if (!restaurant || !uuid.safeParse(id).success) return { ok: false, error: "Requisição inválida." };
  const parsed = z.number().positive().max(100000).nullable().safeParse(promoPrice);
  if (!parsed.success) return { ok: false, error: "Preço inválido." };

  const { error } = await supabase
    .from("products")
    .update({ promo_price: parsed.data })
    .eq("id", id)
    .eq("restaurant_id", restaurant.id);
  if (error) return { ok: false, error: "O preço promocional deve ser menor que o preço original." };
  revalidateMenu(restaurant.slug);
  return { ok: true, message: parsed.data ? "Promoção aplicada!" : "Promoção removida." };
}

export async function setPromoLabelAction(label: string | null): Promise<ActionResult> {
  const { restaurant, supabase } = await ctx();
  if (!restaurant) return { ok: false, error: "Restaurante não encontrado." };
  const parsed = z.string().trim().max(40).nullable().safeParse(label ? label.replace(/[<>]/g, "") : null);
  if (!parsed.success) return { ok: false, error: "Máximo de 40 caracteres." };
  const { error } = await supabase.from("restaurants").update({ promo_label: parsed.data || null }).eq("id", restaurant.id);
  if (error) return { ok: false, error: "Não foi possível salvar." };
  revalidatePath("/parceiro/promocoes");
  revalidatePath("/");
  return { ok: true, message: "Selo de promoção atualizado." };
}

// --- Pedidos -----------------------------------------------------------------

export async function updateOrderStatusAction(orderId: string, status: OrderStatus, note?: string): Promise<ActionResult> {
  const parsed = z
    .object({
      orderId: z.uuid(),
      status: z.enum(["confirmed", "preparing", "ready", "out_for_delivery", "delivered", "cancelled", "rejected"]),
      note: z.string().max(200).optional(),
    })
    .safeParse({ orderId, status, note });
  if (!parsed.success) return { ok: false, error: "Requisição inválida." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("update_order_status", {
    p_order_id: parsed.data.orderId,
    p_status: parsed.data.status,
    p_note: parsed.data.note ?? null,
  });
  if (error) return { ok: false, error: dbError(error, "Não foi possível atualizar o pedido.") };
  revalidatePath("/parceiro/pedidos");
  revalidatePath("/parceiro");
  return { ok: true, message: "Status atualizado." };
}

// --- Cupons do restaurante -----------------------------------------------------

export async function savePartnerCouponAction(_: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const { restaurant, supabase } = await ctx();
  if (!restaurant) return { ok: false, error: "Restaurante não encontrado." };
  const parsed = couponSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: firstError(parsed.error), fieldErrors: toFieldErrors(parsed.error) };

  const payload = {
    ...parsed.data,
    starts_at: localInputToIso(parsed.data.starts_at, formData.get("tz_offset")),
    ends_at: parsed.data.ends_at ? localInputToIso(parsed.data.ends_at, formData.get("tz_offset")) : null,
    owner_restaurant_id: restaurant.id,
  };
  const id = formData.get("id");
  const { error } =
    typeof id === "string" && uuid.safeParse(id).success
      ? await supabase.from("coupons").update(payload).eq("id", id).eq("owner_restaurant_id", restaurant.id)
      : await supabase.from("coupons").insert(payload);
  if (error) return { ok: false, error: dbError(error, "Não foi possível salvar o cupom.") };
  revalidatePath("/parceiro/cupons");
  return { ok: true, message: "Cupom salvo!" };
}

export async function deletePartnerCouponAction(id: string): Promise<ActionResult> {
  const { restaurant, supabase } = await ctx();
  if (!restaurant || !uuid.safeParse(id).success) return { ok: false, error: "Requisição inválida." };
  const { error } = await supabase.from("coupons").delete().eq("id", id).eq("owner_restaurant_id", restaurant.id);
  if (error) return { ok: false, error: "Cupons já utilizados não podem ser excluídos — desative-o." };
  revalidatePath("/parceiro/cupons");
  return { ok: true, message: "Cupom excluído." };
}

// --- Avaliações ----------------------------------------------------------------

export async function replyReviewAction(reviewId: string, reply: string): Promise<ActionResult> {
  const parsed = z.object({ reviewId: z.uuid(), reply: z.string().trim().max(1000) }).safeParse({ reviewId, reply });
  if (!parsed.success) return { ok: false, error: "Resposta inválida." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("reply_review", {
    p_review_id: parsed.data.reviewId,
    p_reply: parsed.data.reply.replace(/[<>]/g, ""),
  });
  if (error) return { ok: false, error: dbError(error, "Não foi possível responder.") };
  revalidatePath("/parceiro/avaliacoes");
  return { ok: true, message: "Resposta publicada!" };
}
