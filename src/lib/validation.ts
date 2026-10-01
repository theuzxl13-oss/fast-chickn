import { z } from "zod";
import { BR_STATES } from "@/lib/constants";

// Validação compartilhada entre formulários (frontend) e Server Actions (backend).
// O banco ainda aplica constraints e RLS como última barreira.

const trimmed = (min: number, max: number, label: string) =>
  z
    .string()
    .trim()
    .min(min, min <= 1 ? `Informe ${label}.` : `${label} deve ter ao menos ${min} caracteres.`)
    .max(max, `${label} deve ter no máximo ${max} caracteres.`)
    .transform((v) => v.replace(/[<>]/g, ""));

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Máximo de ${max} caracteres.`)
    .transform((v) => v.replace(/[<>]/g, ""))
    .optional()
    .transform((v) => (v ? v : null));

const digits = (v: unknown) => (typeof v === "string" ? v.replace(/\D/g, "") : v);

export const phoneSchema = z.preprocess(
  digits,
  z.string().regex(/^\d{10,11}$/, "Telefone inválido. Use DDD + número.").optional().or(z.literal("")),
);

const money = (label: string) =>
  z.preprocess(
    (v) => (typeof v === "string" ? Number(v.replace(/\./g, "").replace(",", ".")) : v),
    z.number({ error: `${label} inválido.` }).min(0, `${label} não pode ser negativo.`).max(100000, `${label} muito alto.`),
  );

const optionalMoney = (label: string) =>
  z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? null : typeof v === "string" ? Number(v.replace(/\./g, "").replace(",", ".")) : v),
    z.number({ error: `${label} inválido.` }).min(0).max(100000).nullable(),
  );

const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Horário inválido.");

// --- Autenticação -----------------------------------------------------------
export const signInSchema = z.object({
  email: z.email("E-mail inválido.").trim().toLowerCase(),
  password: z.string().min(1, "Informe a senha."),
});

export const signUpSchema = z.object({
  full_name: trimmed(3, 120, "Nome"),
  email: z.email("E-mail inválido.").trim().toLowerCase(),
  phone: phoneSchema,
  password: z
    .string()
    .min(8, "A senha deve ter ao menos 8 caracteres.")
    .max(72, "Senha muito longa.")
    .regex(/[A-Za-z]/, "A senha deve conter letras.")
    .regex(/\d/, "A senha deve conter números."),
  account_type: z.enum(["client", "restaurant"]),
});

// --- Perfil e endereço ------------------------------------------------------
export const profileSchema = z.object({
  full_name: trimmed(3, 120, "Nome"),
  phone: phoneSchema,
});

export const addressSchema = z.object({
  label: z.enum(["home", "work", "other"]),
  label_custom: optionalText(40),
  cep: z.preprocess(digits, z.string().regex(/^\d{8}$/, "CEP inválido.")),
  street: trimmed(2, 150, "Rua"),
  number: trimmed(1, 20, "o número"),
  complement: optionalText(100),
  neighborhood: trimmed(2, 100, "Bairro"),
  city: trimmed(2, 100, "Cidade"),
  state: z.enum(BR_STATES, "Selecione o estado."),
  reference: optionalText(150),
  latitude: z.preprocess((v) => (v === "" || v == null ? null : Number(v)), z.number().min(-90).max(90).nullable()),
  longitude: z.preprocess((v) => (v === "" || v == null ? null : Number(v)), z.number().min(-180).max(180).nullable()),
  is_default: z.preprocess((v) => v === "on" || v === "true" || v === true, z.boolean()),
});

// --- Checkout ---------------------------------------------------------------
export const cartLineSchema = z.object({
  product_id: z.uuid(),
  quantity: z.number().int().min(1).max(99),
  option_item_ids: z.array(z.uuid()).max(30),
  removed_ingredients: z.array(z.string().max(60)).max(30),
  notes: z.string().max(280).optional().nullable(),
});

export const checkoutSchema = z.object({
  restaurant_id: z.uuid(),
  address_id: z.uuid("Selecione um endereço de entrega."),
  items: z.array(cartLineSchema).min(1, "Seu carrinho está vazio.").max(50),
  payment_method: z.enum(["pix", "credit_card", "debit_card", "cash", "on_delivery"], "Escolha a forma de pagamento."),
  change_for: z.number().positive().max(100000).nullable().optional(),
  coupon_code: z.string().trim().toUpperCase().max(30).nullable().optional(),
  notes: z.string().max(280).nullable().optional(),
});

// --- Avaliação --------------------------------------------------------------
export const reviewSchema = z.object({
  order_id: z.uuid(),
  rating: z.coerce.number().int().min(1, "Dê uma nota de 1 a 5.").max(5),
  food_rating: z.coerce.number().int().min(1).max(5).nullable().optional(),
  delivery_rating: z.coerce.number().int().min(1).max(5).nullable().optional(),
  comment: optionalText(1000),
});

// --- Restaurante ------------------------------------------------------------
export const restaurantSignupSchema = z.object({
  name: trimmed(2, 80, "Nome do restaurante"),
  category_id: z.uuid("Selecione a categoria."),
  phone: z.preprocess(digits, z.string().regex(/^\d{10,11}$/, "Telefone inválido.")),
  document: z.preprocess(digits, z.string().regex(/^(\d{11}|\d{14})$/, "Informe um CPF (11) ou CNPJ (14 dígitos).")),
  cep: z.preprocess(digits, z.string().regex(/^\d{8}$/, "CEP inválido.")),
  street: trimmed(2, 150, "Rua"),
  number: trimmed(1, 20, "o número"),
  neighborhood: trimmed(2, 100, "Bairro"),
  city: trimmed(2, 100, "Cidade"),
  state: z.enum(BR_STATES, "Selecione o estado."),
  description: optionalText(500),
});

export const restaurantSettingsSchema = z.object({
  name: trimmed(2, 80, "Nome"),
  description: optionalText(500),
  category_id: z.uuid("Selecione a categoria."),
  tags: z
    .string()
    .optional()
    .transform((v) =>
      (v ?? "")
        .split(",")
        .map((t) => t.trim().replace(/[<>]/g, ""))
        .filter(Boolean)
        .slice(0, 6),
    ),
  phone: z.preprocess(digits, z.string().regex(/^\d{10,11}$/, "Telefone inválido.")),
  brand_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Cor inválida."),
  delivery_fee: money("Taxa de entrega"),
  min_order: money("Pedido mínimo"),
  delivery_time_min: z.coerce.number().int().min(5).max(240),
  delivery_time_max: z.coerce.number().int().min(5).max(300),
  promo_label: optionalText(40),
  accepting_orders: z.preprocess((v) => v === "on" || v === "true" || v === true, z.boolean()),
}).refine((d) => d.delivery_time_max >= d.delivery_time_min, {
  message: "O tempo máximo deve ser maior que o mínimo.",
  path: ["delivery_time_max"],
});

export const openingHoursSchema = z.record(
  z.enum(["0", "1", "2", "3", "4", "5", "6"]),
  z.object({ open: hhmm, close: hhmm }).nullable(),
);

export const menuCategorySchema = z.object({
  name: trimmed(1, 60, "o nome"),
  icon: optionalText(16),
  sort_order: z.coerce.number().int().min(0).max(999).default(0),
  is_active: z.preprocess((v) => v === "on" || v === "true" || v === true, z.boolean()),
});

export const productSchema = z
  .object({
    name: trimmed(2, 80, "Nome"),
    description: optionalText(500),
    menu_category_id: z.preprocess((v) => (v === "" ? null : v), z.uuid().nullable()),
    price: money("Preço").refine((v) => v > 0, "O preço deve ser maior que zero."),
    promo_price: optionalMoney("Preço promocional"),
    ingredients: z
      .string()
      .optional()
      .transform((v) =>
        (v ?? "")
          .split(",")
          .map((t) => t.trim().replace(/[<>]/g, ""))
          .filter(Boolean)
          .slice(0, 20),
      ),
    is_available: z.preprocess((v) => v === "on" || v === "true" || v === true, z.boolean()),
    is_featured: z.preprocess((v) => v === "on" || v === "true" || v === true, z.boolean()),
    sort_order: z.coerce.number().int().min(0).max(999).default(0),
  })
  .refine((d) => d.promo_price == null || (d.promo_price > 0 && d.promo_price < d.price), {
    message: "O preço promocional deve ser menor que o preço original.",
    path: ["promo_price"],
  });

export const optionGroupSchema = z
  .object({
    name: trimmed(1, 60, "o nome do grupo"),
    min_select: z.coerce.number().int().min(0).max(20),
    max_select: z.coerce.number().int().min(1).max(20),
    items: z
      .array(
        z.object({
          name: trimmed(1, 60, "o nome do item"),
          price: money("Preço"),
          is_available: z.boolean(),
        }),
      )
      .min(1, "Adicione ao menos um item.")
      .max(30),
  })
  .refine((d) => d.max_select >= d.min_select, { message: "Máximo deve ser ≥ mínimo.", path: ["max_select"] });

// --- Cupons, banners e categorias ------------------------------------------
export const couponSchema = z
  .object({
    code: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z0-9_-]{3,30}$/, "Use de 3 a 30 letras, números, - ou _."),
    description: optionalText(200),
    discount_type: z.enum(["percent", "fixed"]),
    discount_value: money("Desconto").refine((v) => v > 0, "Informe o desconto."),
    min_order_value: money("Valor mínimo"),
    max_discount: optionalMoney("Desconto máximo"),
    starts_at: z.string().min(1, "Informe a data inicial."),
    ends_at: z.string().optional().transform((v) => (v ? v : null)),
    usage_limit: z.preprocess((v) => (v === "" || v == null ? null : Number(v)), z.number().int().positive().nullable()),
    usage_per_user: z.coerce.number().int().min(1).max(100),
    is_active: z.preprocess((v) => v === "on" || v === "true" || v === true, z.boolean()),
    is_public: z.preprocess((v) => v === "on" || v === "true" || v === true, z.boolean()),
  })
  .refine((d) => d.discount_type !== "percent" || d.discount_value <= 100, {
    message: "Percentual deve ser até 100%.",
    path: ["discount_value"],
  })
  .refine((d) => !d.ends_at || new Date(d.ends_at) > new Date(d.starts_at), {
    message: "A data final deve ser posterior à inicial.",
    path: ["ends_at"],
  });

export const bannerSchema = z.object({
  title: trimmed(2, 60, "Título"),
  subtitle: optionalText(120),
  link_url: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v : null))
    .refine((v) => v === null || (/^\/[^/\\]/.test(v) || v === "/"), "Use um link interno, ex.: /busca?promo=1"),
  bg_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Cor inválida."),
  emoji: optionalText(16),
  sort_order: z.coerce.number().int().min(0).max(999).default(0),
  is_active: z.preprocess((v) => v === "on" || v === "true" || v === true, z.boolean()),
});

export const categorySchema = z.object({
  name: trimmed(2, 40, "Nome"),
  icon: trimmed(1, 16, "o ícone"),
  sort_order: z.coerce.number().int().min(0).max(999).default(0),
  is_active: z.preprocess((v) => v === "on" || v === "true" || v === true, z.boolean()),
});

/**
 * Converte o valor de um <input type="datetime-local"> (horário local do
 * navegador, sem fuso) para ISO, usando o offset informado pelo navegador.
 */
export function localInputToIso(value: string, tzOffsetMinutes: unknown) {
  const offset = Number(tzOffsetMinutes);
  const asUtc = new Date(`${value}:00Z`);
  if (Number.isNaN(asUtc.getTime())) return new Date(value).toISOString();
  return new Date(asUtc.getTime() + (Number.isFinite(offset) ? offset : 180) * 60_000).toISOString();
}

/** Converte erros do Zod em { campo: mensagem }. */
export function toFieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_form";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

export function firstError(error: z.ZodError) {
  return error.issues[0]?.message ?? "Dados inválidos.";
}
