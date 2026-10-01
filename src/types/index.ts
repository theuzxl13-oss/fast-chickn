// Tipos de domínio espelhando o schema em supabase/migrations.
// Para tipos gerados automaticamente: `npx supabase gen types typescript --linked`.

export type UserRole = "client" | "restaurant" | "admin";
export type RestaurantStatus = "pending" | "active" | "suspended" | "blocked" | "rejected";
export type OrderStatus =
  | "pending"
  | "confirmed"
  | "preparing"
  | "ready"
  | "out_for_delivery"
  | "delivered"
  | "cancelled"
  | "rejected";
export type PaymentMethod = "pix" | "credit_card" | "debit_card" | "cash" | "on_delivery";
export type PaymentStatus = "pending" | "paid" | "failed" | "refunded" | "cancelled";
export type DiscountType = "percent" | "fixed";
export type AddressLabel = "home" | "work" | "other";

export interface Profile {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  role: UserRole;
  is_blocked: boolean;
  preferred_payment_method: PaymentMethod | null;
  notifications_enabled: boolean;
  created_at: string;
}

export interface Address {
  id: string;
  user_id: string;
  label: AddressLabel;
  label_custom: string | null;
  cep: string;
  street: string;
  number: string;
  complement: string | null;
  neighborhood: string;
  city: string;
  state: string;
  reference: string | null;
  latitude: number | null;
  longitude: number | null;
  is_default: boolean;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string;
  sort_order: number;
  is_active: boolean;
}

export interface DayHours {
  open: string; // "HH:MM"
  close: string; // "HH:MM" — se <= open, atravessa a meia-noite
}
/** Chave = dia da semana (0 = domingo). `null` = fechado. */
export type OpeningHours = Partial<Record<"0" | "1" | "2" | "3" | "4" | "5" | "6", DayHours | null>>;

export interface Restaurant {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  logo_url: string | null;
  banner_url: string | null;
  brand_color: string;
  category_id: string | null;
  tags: string[];
  phone: string | null;
  email: string | null;
  document: string | null;
  cep: string | null;
  street: string | null;
  number: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  latitude: number | null;
  longitude: number | null;
  timezone: string;
  delivery_fee: number;
  min_order: number;
  delivery_time_min: number;
  delivery_time_max: number;
  delivery_radius_km: number;
  opening_hours: OpeningHours;
  accepting_orders: boolean;
  promo_label: string | null;
  is_featured: boolean;
  status: RestaurantStatus;
  rating_avg: number;
  rating_count: number;
  total_orders: number;
  created_at: string;
  category?: Pick<Category, "id" | "name" | "icon" | "slug"> | null;
}

export interface MenuCategory {
  id: string;
  restaurant_id: string;
  name: string;
  icon: string | null;
  sort_order: number;
  is_active: boolean;
}

export interface ProductOptionItem {
  id: string;
  option_id: string;
  name: string;
  price: number;
  is_available: boolean;
  sort_order: number;
}

export interface ProductOption {
  id: string;
  product_id: string;
  name: string;
  min_select: number;
  max_select: number;
  sort_order: number;
  items: ProductOptionItem[];
}

export interface Product {
  id: string;
  restaurant_id: string;
  menu_category_id: string | null;
  name: string;
  description: string | null;
  image_url: string | null;
  price: number;
  promo_price: number | null;
  ingredients: string[];
  is_available: boolean;
  is_featured: boolean;
  sort_order: number;
  sold_count: number;
  options?: ProductOption[];
}

export interface Coupon {
  id: string;
  code: string;
  description: string | null;
  discount_type: DiscountType;
  discount_value: number;
  min_order_value: number;
  max_discount: number | null;
  starts_at: string;
  ends_at: string | null;
  usage_limit: number | null;
  usage_per_user: number;
  used_count: number;
  is_active: boolean;
  is_public: boolean;
  owner_restaurant_id: string | null;
  created_at: string;
}

export interface OrderItemOption {
  group: string;
  name: string;
  price: number;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string | null;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  options: OrderItemOption[];
  removed_ingredients: string[];
  notes: string | null;
}

export interface DeliveryAddressSnapshot {
  label: AddressLabel;
  cep: string;
  street: string;
  number: string;
  complement: string | null;
  neighborhood: string;
  city: string;
  state: string;
  reference: string | null;
}

export interface Payment {
  id: string;
  order_id: string;
  method: PaymentMethod;
  status: PaymentStatus;
  amount: number;
  provider: string;
  provider_reference: string | null;
  pix_copy_paste: string | null;
  pix_expires_at: string | null;
  change_for: number | null;
  paid_at: string | null;
}

export interface Order {
  id: string;
  code: string;
  user_id: string;
  restaurant_id: string;
  status: OrderStatus;
  customer_name: string;
  customer_phone: string | null;
  delivery_address: DeliveryAddressSnapshot;
  subtotal: number;
  delivery_fee: number;
  discount: number;
  total: number;
  coupon_code: string | null;
  payment_method: PaymentMethod;
  change_for: number | null;
  notes: string | null;
  estimated_min: number;
  estimated_max: number;
  confirmed_at: string | null;
  delivered_at: string | null;
  cancelled_at: string | null;
  cancel_reason: string | null;
  created_at: string;
  updated_at: string;
  items?: OrderItem[];
  restaurant?: Pick<Restaurant, "id" | "name" | "slug" | "logo_url" | "brand_color" | "phone"> | null;
  payment?: Payment | null;
  review?: { id: string; rating: number } | null;
}

export interface OrderStatusHistory {
  id: number;
  order_id: string;
  status: OrderStatus;
  note: string | null;
  created_at: string;
}

export interface Review {
  id: string;
  order_id: string;
  user_id: string;
  restaurant_id: string;
  rating: number;
  food_rating: number | null;
  delivery_rating: number | null;
  comment: string | null;
  reply: string | null;
  replied_at: string | null;
  created_at: string;
}

export interface Banner {
  id: string;
  title: string;
  subtitle: string | null;
  image_url: string | null;
  link_url: string | null;
  bg_color: string;
  emoji: string | null;
  is_active: boolean;
  sort_order: number;
  starts_at: string | null;
  ends_at: string | null;
}

export interface AppNotification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string;
  order_id: string | null;
  link: string | null;
  read_at: string | null;
  created_at: string;
}

export interface AppSettings {
  platform_fee_percent: number;
  demo_payments: boolean;
  support_email: string | null;
  support_phone: string | null;
}

/** Resultado padrão das Server Actions. */
export type ActionResult<T = undefined> =
  | { ok: true; data?: T; message?: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };
