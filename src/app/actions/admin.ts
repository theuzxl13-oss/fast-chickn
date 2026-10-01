"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth";
import {
  bannerSchema,
  categorySchema,
  couponSchema,
  firstError,
  localInputToIso,
  toFieldErrors,
} from "@/lib/validation";
import { slugify } from "@/utils/sanitize";
import type { ActionResult, RestaurantStatus, UserRole } from "@/types";

const uuid = z.uuid();

/** Toda action administrativa confirma o papel no servidor (o RLS também exige). */
async function adminCtx() {
  const { profile } = await getSession();
  if (!profile || profile.role !== "admin" || profile.is_blocked) return null;
  return { supabase: await createClient(), adminId: profile.id };
}

const DENIED: ActionResult = { ok: false, error: "Acesso negado." };

function dbError(error: { message?: string; code?: string } | null, fallback: string) {
  if (error?.code === "P0001" && error.message) return error.message;
  if (error?.code === "23505") return "Já existe um registro com esses dados.";
  if (error?.code === "23503") return "Registro em uso — não pode ser excluído.";
  return fallback;
}

// --- Restaurantes -----------------------------------------------------------

export async function setRestaurantStatusAction(id: string, status: RestaurantStatus): Promise<ActionResult> {
  const ctx = await adminCtx();
  if (!ctx) return DENIED;
  const parsed = z.object({ id: uuid, status: z.enum(["pending", "active", "suspended", "blocked", "rejected"]) }).safeParse({ id, status });
  if (!parsed.success) return { ok: false, error: "Requisição inválida." };
  const { error } = await ctx.supabase.from("restaurants").update({ status: parsed.data.status }).eq("id", parsed.data.id);
  if (error) return { ok: false, error: "Não foi possível atualizar o status." };
  revalidatePath("/admin/restaurantes", "layout");
  revalidatePath("/");
  return { ok: true, message: "Status do restaurante atualizado." };
}

export async function setRestaurantFeaturedAction(id: string, featured: boolean): Promise<ActionResult> {
  const ctx = await adminCtx();
  if (!ctx || !uuid.safeParse(id).success) return DENIED;
  const { error } = await ctx.supabase.from("restaurants").update({ is_featured: !!featured }).eq("id", id);
  if (error) return { ok: false, error: "Não foi possível atualizar." };
  revalidatePath("/admin/restaurantes", "layout");
  revalidatePath("/");
  return { ok: true, message: featured ? "Restaurante em destaque." : "Destaque removido." };
}

const adminRestaurantSchema = z.object({
  name: z.string().trim().min(2).max(80),
  slug: z.string().trim().toLowerCase().regex(/^[a-z0-9-]{3,60}$/, "Slug: letras minúsculas, números e hífen."),
  description: z.string().trim().max(500).optional().transform((v) => v || null),
  delivery_fee: z.coerce.number().min(0).max(1000),
  min_order: z.coerce.number().min(0).max(10000),
  delivery_time_min: z.coerce.number().int().min(5).max(240),
  delivery_time_max: z.coerce.number().int().min(5).max(300),
  promo_label: z.string().trim().max(40).optional().transform((v) => v || null),
});

export async function adminUpdateRestaurantAction(_: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const ctx = await adminCtx();
  if (!ctx) return DENIED;
  const id = formData.get("id");
  if (typeof id !== "string" || !uuid.safeParse(id).success) return { ok: false, error: "Restaurante inválido." };
  const raw = Object.fromEntries(formData);
  const parsed = adminRestaurantSchema.safeParse({
    ...raw,
    delivery_fee: String(raw.delivery_fee ?? "0").replace(",", "."),
    min_order: String(raw.min_order ?? "0").replace(",", "."),
  });
  if (!parsed.success) return { ok: false, error: firstError(parsed.error), fieldErrors: toFieldErrors(parsed.error) };
  if (parsed.data.delivery_time_max < parsed.data.delivery_time_min) {
    return { ok: false, error: "O tempo máximo deve ser maior que o mínimo." };
  }
  const { error } = await ctx.supabase
    .from("restaurants")
    .update({ ...parsed.data, name: parsed.data.name.replace(/[<>]/g, "") })
    .eq("id", id);
  if (error) return { ok: false, error: dbError(error, "Não foi possível salvar.") };
  revalidatePath("/admin/restaurantes", "layout");
  return { ok: true, message: "Restaurante atualizado." };
}

// --- Usuários ---------------------------------------------------------------

export async function setUserBlockedAction(id: string, blocked: boolean): Promise<ActionResult> {
  const ctx = await adminCtx();
  if (!ctx || !uuid.safeParse(id).success) return DENIED;
  if (id === ctx.adminId) return { ok: false, error: "Você não pode bloquear a própria conta." };
  const { error } = await ctx.supabase.from("profiles").update({ is_blocked: !!blocked }).eq("id", id);
  if (error) return { ok: false, error: "Não foi possível atualizar." };
  revalidatePath("/admin/clientes");
  return { ok: true, message: blocked ? "Usuário bloqueado." : "Usuário liberado." };
}

export async function setUserRoleAction(id: string, role: UserRole): Promise<ActionResult> {
  const ctx = await adminCtx();
  if (!ctx || !uuid.safeParse(id).success) return DENIED;
  if (id === ctx.adminId) return { ok: false, error: "Você não pode alterar o próprio papel." };
  const parsed = z.enum(["client", "restaurant", "admin"]).safeParse(role);
  if (!parsed.success) return { ok: false, error: "Papel inválido." };
  const { error } = await ctx.supabase.from("profiles").update({ role: parsed.data }).eq("id", id);
  if (error) return { ok: false, error: "Não foi possível atualizar." };
  revalidatePath("/admin/clientes");
  return { ok: true, message: "Papel atualizado." };
}

// --- Pedidos -----------------------------------------------------------------

export async function adminCancelOrderAction(orderId: string, reason: string): Promise<ActionResult> {
  const ctx = await adminCtx();
  if (!ctx || !uuid.safeParse(orderId).success) return DENIED;
  const { error } = await ctx.supabase.rpc("update_order_status", {
    p_order_id: orderId,
    p_status: "cancelled",
    p_note: (reason || "Cancelado pela administração").slice(0, 200),
  });
  if (error) return { ok: false, error: dbError(error, "Não foi possível cancelar.") };
  revalidatePath("/admin/pedidos");
  return { ok: true, message: "Pedido cancelado." };
}

// --- Categorias ----------------------------------------------------------------

export async function saveCategoryAction(_: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const ctx = await adminCtx();
  if (!ctx) return DENIED;
  const parsed = categorySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: firstError(parsed.error), fieldErrors: toFieldErrors(parsed.error) };
  const payload = { ...parsed.data, slug: slugify(parsed.data.name) };
  const id = formData.get("id");
  const { error } =
    typeof id === "string" && uuid.safeParse(id).success
      ? await ctx.supabase.from("categories").update(payload).eq("id", id)
      : await ctx.supabase.from("categories").insert(payload);
  if (error) return { ok: false, error: dbError(error, "Não foi possível salvar.") };
  revalidatePath("/admin/categorias");
  revalidatePath("/");
  return { ok: true, message: "Categoria salva!" };
}

export async function deleteCategoryAction(id: string): Promise<ActionResult> {
  const ctx = await adminCtx();
  if (!ctx || !uuid.safeParse(id).success) return DENIED;
  const { error } = await ctx.supabase.from("categories").delete().eq("id", id);
  if (error) return { ok: false, error: dbError(error, "Não foi possível excluir.") };
  revalidatePath("/admin/categorias");
  revalidatePath("/");
  return { ok: true, message: "Categoria excluída." };
}

// --- Cupons ----------------------------------------------------------------------

export async function saveAdminCouponAction(_: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const ctx = await adminCtx();
  if (!ctx) return DENIED;
  const parsed = couponSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: firstError(parsed.error), fieldErrors: toFieldErrors(parsed.error) };

  const restaurantIds = formData.getAll("restaurant_ids").filter((v): v is string => typeof v === "string" && uuid.safeParse(v).success);
  const payload = {
    ...parsed.data,
    starts_at: localInputToIso(parsed.data.starts_at, formData.get("tz_offset")),
    ends_at: parsed.data.ends_at ? localInputToIso(parsed.data.ends_at, formData.get("tz_offset")) : null,
  };

  const id = formData.get("id");
  const isEdit = typeof id === "string" && uuid.safeParse(id).success;
  const { data, error } = isEdit
    ? await ctx.supabase.from("coupons").update(payload).eq("id", id).select("id").single()
    : await ctx.supabase.from("coupons").insert({ ...payload, created_by: ctx.adminId }).select("id").single();
  if (error || !data) return { ok: false, error: dbError(error, "Não foi possível salvar o cupom.") };

  await ctx.supabase.from("coupon_restaurants").delete().eq("coupon_id", data.id);
  if (restaurantIds.length) {
    await ctx.supabase.from("coupon_restaurants").insert(restaurantIds.map((rid) => ({ coupon_id: data.id, restaurant_id: rid })));
  }
  revalidatePath("/admin/cupons");
  return { ok: true, message: "Cupom salvo!" };
}

export async function deleteAdminCouponAction(id: string): Promise<ActionResult> {
  const ctx = await adminCtx();
  if (!ctx || !uuid.safeParse(id).success) return DENIED;
  const { error } = await ctx.supabase.from("coupons").delete().eq("id", id);
  if (error) return { ok: false, error: dbError(error, "Não foi possível excluir.") };
  revalidatePath("/admin/cupons");
  return { ok: true, message: "Cupom excluído." };
}

// --- Banners -----------------------------------------------------------------------

export async function saveBannerAction(_: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const ctx = await adminCtx();
  if (!ctx) return DENIED;
  const parsed = bannerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: firstError(parsed.error), fieldErrors: toFieldErrors(parsed.error) };
  const id = formData.get("id");
  const { error } =
    typeof id === "string" && uuid.safeParse(id).success
      ? await ctx.supabase.from("banners").update(parsed.data).eq("id", id)
      : await ctx.supabase.from("banners").insert(parsed.data);
  if (error) return { ok: false, error: dbError(error, "Não foi possível salvar o banner.") };
  revalidatePath("/admin/banners");
  revalidatePath("/");
  return { ok: true, message: "Banner salvo!" };
}

export async function deleteBannerAction(id: string): Promise<ActionResult> {
  const ctx = await adminCtx();
  if (!ctx || !uuid.safeParse(id).success) return DENIED;
  const { error } = await ctx.supabase.from("banners").delete().eq("id", id);
  if (error) return { ok: false, error: "Não foi possível excluir." };
  revalidatePath("/admin/banners");
  revalidatePath("/");
  return { ok: true, message: "Banner excluído." };
}

// --- Configurações -------------------------------------------------------------------

const settingsSchema = z.object({
  platform_fee_percent: z.coerce.number().min(0).max(100),
  demo_payments: z.preprocess((v) => v === "on" || v === "true", z.boolean()),
  support_email: z.union([z.email("E-mail inválido."), z.literal("")]).transform((v) => v || null),
  support_phone: z
    .string()
    .transform((v) => v.replace(/\D/g, ""))
    .refine((v) => v === "" || /^\d{10,13}$/.test(v), "Telefone inválido.")
    .transform((v) => v || null),
});

export async function updateSettingsAction(_: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const ctx = await adminCtx();
  if (!ctx) return DENIED;
  const raw = Object.fromEntries(formData);
  const parsed = settingsSchema.safeParse({ ...raw, platform_fee_percent: String(raw.platform_fee_percent ?? "").replace(",", ".") });
  if (!parsed.success) return { ok: false, error: firstError(parsed.error), fieldErrors: toFieldErrors(parsed.error) };
  const { error } = await ctx.supabase.from("app_settings").update(parsed.data).eq("id", 1);
  if (error) return { ok: false, error: "Não foi possível salvar." };
  revalidatePath("/admin/configuracoes");
  return { ok: true, message: "Configurações salvas!" };
}
