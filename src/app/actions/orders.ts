"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { checkoutSchema, firstError, reviewSchema, toFieldErrors } from "@/lib/validation";
import { getPixGateway } from "@/services/payments";
import { DemoPixGateway } from "@/services/payments/demo-pix";
import type { ActionResult, OrderStatus, Payment } from "@/types";

/** Mensagens das funções SQL (raise exception) já são amigáveis; outras são genéricas. */
function dbError(error: { message?: string; code?: string } | null, fallback: string) {
  if (error?.code === "P0001" && error.message) return error.message;
  return fallback;
}

export async function validateCouponAction(
  code: string,
  restaurantId: string,
  subtotal: number,
): Promise<ActionResult<{ code: string; discount: number }>> {
  const parsed = z
    .object({ code: z.string().trim().toUpperCase().min(3).max(30), restaurantId: z.uuid(), subtotal: z.number().min(0).max(100000) })
    .safeParse({ code, restaurantId, subtotal });
  if (!parsed.success) return { ok: false, error: "Cupom inválido." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Entre na sua conta para usar cupons." };

  const { data, error } = await supabase
    .rpc("validate_coupon", {
      p_code: parsed.data.code,
      p_restaurant_id: parsed.data.restaurantId,
      p_subtotal: parsed.data.subtotal,
    })
    .single<{ coupon_id: string | null; code: string | null; discount: number; message: string }>();
  if (error || !data) return { ok: false, error: "Não foi possível validar o cupom." };
  if (!data.coupon_id || !data.code) return { ok: false, error: data.message };
  return { ok: true, data: { code: data.code, discount: Number(data.discount) }, message: data.message };
}

export async function placeOrderAction(input: unknown): Promise<ActionResult<{ id: string; code: string }>> {
  const parsed = checkoutSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstError(parsed.error), fieldErrors: toFieldErrors(parsed.error) };

  const supabase = await createClient();
  const d = parsed.data;
  const { data, error } = await supabase.rpc("place_order", {
    p_restaurant_id: d.restaurant_id,
    p_address_id: d.address_id,
    p_items: d.items.map((i) => ({
      product_id: i.product_id,
      quantity: i.quantity,
      option_item_ids: i.option_item_ids,
      removed_ingredients: i.removed_ingredients,
      notes: i.notes ?? null,
    })),
    p_payment_method: d.payment_method,
    p_change_for: d.payment_method === "cash" ? d.change_for ?? null : null,
    p_coupon_code: d.coupon_code || null,
    p_notes: d.notes ?? null,
  });
  if (error || !data) return { ok: false, error: dbError(error, "Não foi possível finalizar o pedido. Tente novamente.") };

  revalidatePath("/pedidos");
  const result = data as { id: string; code: string };
  return { ok: true, data: { id: result.id, code: result.code } };
}

export async function cancelOrderAction(orderId: string): Promise<ActionResult> {
  if (!z.uuid().safeParse(orderId).success) return { ok: false, error: "Pedido inválido." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("update_order_status", {
    p_order_id: orderId,
    p_status: "cancelled" satisfies OrderStatus,
    p_note: "Cancelado pelo cliente",
  });
  if (error) return { ok: false, error: dbError(error, "Não foi possível cancelar.") };
  revalidatePath(`/pedido/${orderId}`);
  revalidatePath("/pedidos");
  return { ok: true, message: "Pedido cancelado." };
}

export async function createPixChargeAction(orderId: string): Promise<ActionResult<Payment>> {
  if (!z.uuid().safeParse(orderId).success) return { ok: false, error: "Pedido inválido." };
  const supabase = await createClient();
  try {
    const payment = await getPixGateway(supabase).createCharge(orderId);
    return { ok: true, data: payment };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Falha ao gerar o PIX." };
  }
}

/** Ambiente de demonstração: simula a confirmação do banco. */
export async function simulatePixPaymentAction(orderId: string): Promise<ActionResult<Payment>> {
  if (!z.uuid().safeParse(orderId).success) return { ok: false, error: "Pedido inválido." };
  const supabase = await createClient();
  const gateway = getPixGateway(supabase);
  if (!(gateway instanceof DemoPixGateway)) {
    return { ok: false, error: "A confirmação manual só existe no ambiente de demonstração." };
  }
  try {
    const payment = await gateway.simulatePayment(orderId);
    revalidatePath(`/pedido/${orderId}`);
    return { ok: true, data: payment, message: "Pagamento confirmado!" };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Falha ao confirmar." };
  }
}

export async function submitReviewAction(_: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const parsed = reviewSchema.safeParse({
    order_id: formData.get("order_id"),
    rating: formData.get("rating"),
    food_rating: formData.get("food_rating") || null,
    delivery_rating: formData.get("delivery_rating") || null,
    comment: formData.get("comment") ?? undefined,
  });
  if (!parsed.success) return { ok: false, error: firstError(parsed.error), fieldErrors: toFieldErrors(parsed.error) };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Faça login novamente." };

  const { data: order } = await supabase
    .from("orders")
    .select("restaurant_id")
    .eq("id", parsed.data.order_id)
    .maybeSingle<{ restaurant_id: string }>();
  if (!order) return { ok: false, error: "Pedido não encontrado." };

  const { error } = await supabase.from("reviews").insert({
    order_id: parsed.data.order_id,
    user_id: user.id,
    restaurant_id: order.restaurant_id,
    rating: parsed.data.rating,
    food_rating: parsed.data.food_rating ?? null,
    delivery_rating: parsed.data.delivery_rating ?? null,
    comment: parsed.data.comment,
  });
  if (error) {
    if (error.code === "23505") return { ok: false, error: "Este pedido já foi avaliado." };
    return { ok: false, error: "Só é possível avaliar pedidos entregues." };
  }
  revalidatePath("/pedidos");
  return { ok: true, message: "Obrigado pela avaliação!" };
}
