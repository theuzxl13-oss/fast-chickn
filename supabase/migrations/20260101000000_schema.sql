-- =============================================================================
-- FAST CHICKN — Schema base
-- Tabelas, tipos, constraints e índices.
-- Usuários de autenticação ficam em auth.users (Supabase Auth); os dados de
-- perfil e o papel (role) de cada usuário ficam em public.profiles.
-- =============================================================================

create extension if not exists pgcrypto with schema extensions;
create extension if not exists unaccent with schema extensions;
create extension if not exists pg_trgm with schema extensions;

-- -----------------------------------------------------------------------------
-- Tipos
-- -----------------------------------------------------------------------------
create type public.user_role as enum ('client', 'restaurant', 'admin');
create type public.restaurant_status as enum ('pending', 'active', 'suspended', 'blocked', 'rejected');
create type public.order_status as enum (
  'pending',           -- Aguardando confirmação
  'confirmed',         -- Confirmado
  'preparing',         -- Preparando
  'ready',             -- Pronto para entrega
  'out_for_delivery',  -- Saiu para entrega
  'delivered',         -- Entregue
  'cancelled',         -- Cancelado
  'rejected'           -- Recusado pelo restaurante
);
create type public.payment_method as enum ('pix', 'credit_card', 'debit_card', 'cash', 'on_delivery');
create type public.payment_status as enum ('pending', 'paid', 'failed', 'refunded', 'cancelled');
create type public.discount_type as enum ('percent', 'fixed');
create type public.address_label as enum ('home', 'work', 'other');

-- Função utilitária para remover acentos de forma IMMUTABLE (permite índices)
create or replace function public.f_unaccent(text)
returns text
language sql
immutable
parallel safe
strict
set search_path = public, extensions
as $$
  select extensions.unaccent('extensions.unaccent'::regdictionary, $1)
$$;

-- -----------------------------------------------------------------------------
-- Perfis
-- -----------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '' check (char_length(full_name) <= 120),
  email text check (email is null or char_length(email) <= 254),
  phone text check (phone is null or phone ~ '^[0-9]{10,13}$'),
  avatar_url text,
  role public.user_role not null default 'client',
  is_blocked boolean not null default false,
  preferred_payment_method public.payment_method,
  notifications_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index profiles_role_idx on public.profiles (role);
create index profiles_created_at_idx on public.profiles (created_at desc);

-- -----------------------------------------------------------------------------
-- Endereços
-- -----------------------------------------------------------------------------
create table public.addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  label public.address_label not null default 'home',
  label_custom text check (label_custom is null or char_length(label_custom) <= 40),
  cep text not null check (cep ~ '^[0-9]{8}$'),
  street text not null check (char_length(street) between 2 and 150),
  number text not null check (char_length(number) between 1 and 20),
  complement text check (complement is null or char_length(complement) <= 100),
  neighborhood text not null check (char_length(neighborhood) between 2 and 100),
  city text not null check (char_length(city) between 2 and 100),
  state char(2) not null check (state ~ '^[A-Z]{2}$'),
  reference text check (reference is null or char_length(reference) <= 150),
  latitude double precision check (latitude is null or latitude between -90 and 90),
  longitude double precision check (longitude is null or longitude between -180 and 180),
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index addresses_user_idx on public.addresses (user_id);
create unique index addresses_one_default_per_user on public.addresses (user_id) where is_default;

-- -----------------------------------------------------------------------------
-- Categorias globais (tipos de cozinha exibidos na home)
-- -----------------------------------------------------------------------------
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (char_length(name) between 2 and 40),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  icon text not null default '🍽️' check (char_length(icon) <= 16),
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index categories_sort_idx on public.categories (sort_order);

-- -----------------------------------------------------------------------------
-- Restaurantes
-- -----------------------------------------------------------------------------
create table public.restaurants (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]{3,60}$'),
  name text not null check (char_length(name) between 2 and 80),
  description text check (description is null or char_length(description) <= 500),
  logo_url text,
  banner_url text,
  brand_color text not null default '#E8361C' check (brand_color ~ '^#[0-9A-Fa-f]{6}$'),
  category_id uuid references public.categories (id) on delete set null,
  tags text[] not null default '{}',
  phone text check (phone is null or phone ~ '^[0-9]{10,13}$'),
  email text,
  document text check (document is null or document ~ '^[0-9]{11,14}$'), -- CPF/CNPJ (apenas dígitos)
  cep text check (cep is null or cep ~ '^[0-9]{8}$'),
  street text,
  number text,
  neighborhood text,
  city text,
  state char(2) check (state is null or state ~ '^[A-Z]{2}$'),
  latitude double precision,
  longitude double precision,
  timezone text not null default 'America/Sao_Paulo',
  delivery_fee numeric(10, 2) not null default 0 check (delivery_fee >= 0),
  min_order numeric(10, 2) not null default 0 check (min_order >= 0),
  delivery_time_min integer not null default 30 check (delivery_time_min between 5 and 240),
  delivery_time_max integer not null default 45 check (delivery_time_max between 5 and 300),
  delivery_radius_km numeric(5, 2) not null default 8 check (delivery_radius_km > 0),
  -- {"0": {"open":"18:00","close":"23:00"}, "1": null, ...} — 0 = domingo
  -- close <= open indica que o expediente atravessa a meia-noite.
  opening_hours jsonb not null default '{}'::jsonb,
  accepting_orders boolean not null default true, -- permite ao parceiro pausar a loja
  promo_label text check (promo_label is null or char_length(promo_label) <= 40),
  is_featured boolean not null default false,
  status public.restaurant_status not null default 'pending',
  rating_avg numeric(3, 2) not null default 0,
  rating_count integer not null default 0,
  total_orders integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint restaurants_delivery_time_range check (delivery_time_max >= delivery_time_min)
);
create index restaurants_status_idx on public.restaurants (status);
create index restaurants_category_idx on public.restaurants (category_id);
create index restaurants_featured_idx on public.restaurants (is_featured) where is_featured;
create index restaurants_name_trgm_idx on public.restaurants using gin (public.f_unaccent(lower(name)) extensions.gin_trgm_ops);

create table public.restaurant_users (
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  member_role text not null default 'owner' check (member_role in ('owner', 'manager', 'staff')),
  created_at timestamptz not null default now(),
  primary key (restaurant_id, user_id)
);
create index restaurant_users_user_idx on public.restaurant_users (user_id);

-- -----------------------------------------------------------------------------
-- Cardápio
-- -----------------------------------------------------------------------------
create table public.menu_categories (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  icon text check (icon is null or char_length(icon) <= 16),
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index menu_categories_restaurant_idx on public.menu_categories (restaurant_id, sort_order);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  menu_category_id uuid references public.menu_categories (id) on delete set null,
  name text not null check (char_length(name) between 2 and 80),
  description text check (description is null or char_length(description) <= 500),
  image_url text,
  price numeric(10, 2) not null check (price > 0),
  promo_price numeric(10, 2),
  ingredients text[] not null default '{}',
  is_available boolean not null default true,
  is_featured boolean not null default false,
  sort_order integer not null default 0,
  sold_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint products_promo_lt_price check (promo_price is null or (promo_price > 0 and promo_price < price))
);
create index products_restaurant_idx on public.products (restaurant_id, sort_order);
create index products_menu_category_idx on public.products (menu_category_id);
create index products_name_trgm_idx on public.products using gin (public.f_unaccent(lower(name)) extensions.gin_trgm_ops);

-- Grupos de opções (Tamanho, Adicionais, Molhos...)
create table public.product_options (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  min_select integer not null default 0 check (min_select >= 0),
  max_select integer not null default 1 check (max_select >= 1),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint product_options_min_max check (max_select >= min_select)
);
create index product_options_product_idx on public.product_options (product_id, sort_order);

create table public.product_option_items (
  id uuid primary key default gen_random_uuid(),
  option_id uuid not null references public.product_options (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  price numeric(10, 2) not null default 0 check (price >= 0),
  is_available boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index product_option_items_option_idx on public.product_option_items (option_id, sort_order);

-- -----------------------------------------------------------------------------
-- Favoritos e carrinho
-- -----------------------------------------------------------------------------
create table public.favorites (
  user_id uuid not null references public.profiles (id) on delete cascade,
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, restaurant_id)
);
create index favorites_restaurant_idx on public.favorites (restaurant_id);

create table public.carts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles (id) on delete cascade,
  restaurant_id uuid references public.restaurants (id) on delete set null,
  coupon_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.cart_items (
  id uuid primary key default gen_random_uuid(),
  cart_id uuid not null references public.carts (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  quantity integer not null check (quantity between 1 and 99),
  option_item_ids uuid[] not null default '{}',
  removed_ingredients text[] not null default '{}',
  notes text check (notes is null or char_length(notes) <= 280),
  created_at timestamptz not null default now()
);
create index cart_items_cart_idx on public.cart_items (cart_id);

-- -----------------------------------------------------------------------------
-- Cupons
-- -----------------------------------------------------------------------------
create table public.coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[A-Z0-9_-]{3,30}$'),
  description text check (description is null or char_length(description) <= 200),
  discount_type public.discount_type not null,
  discount_value numeric(10, 2) not null check (discount_value > 0),
  min_order_value numeric(10, 2) not null default 0 check (min_order_value >= 0),
  max_discount numeric(10, 2) check (max_discount is null or max_discount > 0),
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  usage_limit integer check (usage_limit is null or usage_limit > 0),
  usage_per_user integer not null default 1 check (usage_per_user > 0),
  used_count integer not null default 0 check (used_count >= 0),
  is_active boolean not null default true,
  is_public boolean not null default true, -- exibido na lista de cupons do cliente
  owner_restaurant_id uuid references public.restaurants (id) on delete cascade, -- cupom criado por um parceiro
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint coupons_percent_range check (discount_type <> 'percent' or discount_value <= 100),
  constraint coupons_period check (ends_at is null or ends_at > starts_at)
);
create index coupons_owner_idx on public.coupons (owner_restaurant_id);
create index coupons_active_idx on public.coupons (is_active, ends_at);

-- Restaurantes participantes de um cupom da plataforma (vazio = todos)
create table public.coupon_restaurants (
  coupon_id uuid not null references public.coupons (id) on delete cascade,
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  primary key (coupon_id, restaurant_id)
);
create index coupon_restaurants_restaurant_idx on public.coupon_restaurants (restaurant_id);

-- -----------------------------------------------------------------------------
-- Pedidos
-- -----------------------------------------------------------------------------
create sequence public.order_code_seq start 1;

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  code text not null unique default ('FC' || lpad(nextval('public.order_code_seq')::text, 6, '0')),
  user_id uuid not null references public.profiles (id) on delete restrict,
  restaurant_id uuid not null references public.restaurants (id) on delete restrict,
  status public.order_status not null default 'pending',
  customer_name text not null,
  customer_phone text,
  delivery_address jsonb not null, -- snapshot do endereço no momento do pedido
  subtotal numeric(10, 2) not null check (subtotal >= 0),
  delivery_fee numeric(10, 2) not null check (delivery_fee >= 0),
  discount numeric(10, 2) not null default 0 check (discount >= 0),
  total numeric(10, 2) not null check (total >= 0),
  coupon_id uuid references public.coupons (id) on delete set null,
  coupon_code text,
  payment_method public.payment_method not null,
  change_for numeric(10, 2) check (change_for is null or change_for > 0),
  notes text check (notes is null or char_length(notes) <= 280),
  estimated_min integer not null,
  estimated_max integer not null,
  confirmed_at timestamptz,
  ready_at timestamptz,
  dispatched_at timestamptz,
  delivered_at timestamptz,
  cancelled_at timestamptz,
  cancel_reason text check (cancel_reason is null or char_length(cancel_reason) <= 200),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index orders_user_idx on public.orders (user_id, created_at desc);
create index orders_restaurant_idx on public.orders (restaurant_id, created_at desc);
create index orders_status_idx on public.orders (status);
create index orders_created_at_idx on public.orders (created_at desc);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  product_name text not null,
  quantity integer not null check (quantity between 1 and 99),
  unit_price numeric(10, 2) not null check (unit_price >= 0), -- preço base + opções
  total_price numeric(10, 2) not null check (total_price >= 0),
  options jsonb not null default '[]'::jsonb, -- [{group, name, price}]
  removed_ingredients text[] not null default '{}',
  notes text check (notes is null or char_length(notes) <= 280),
  created_at timestamptz not null default now()
);
create index order_items_order_idx on public.order_items (order_id);
create index order_items_product_idx on public.order_items (product_id);

create table public.order_status_history (
  id bigint generated always as identity primary key,
  order_id uuid not null references public.orders (id) on delete cascade,
  status public.order_status not null,
  changed_by uuid references public.profiles (id) on delete set null,
  note text,
  created_at timestamptz not null default now()
);
create index order_status_history_order_idx on public.order_status_history (order_id, created_at);

create table public.coupon_uses (
  id uuid primary key default gen_random_uuid(),
  coupon_id uuid not null references public.coupons (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  order_id uuid not null unique references public.orders (id) on delete cascade,
  discount_amount numeric(10, 2) not null check (discount_amount >= 0),
  created_at timestamptz not null default now()
);
create index coupon_uses_coupon_user_idx on public.coupon_uses (coupon_id, user_id);

-- -----------------------------------------------------------------------------
-- Pagamentos
-- -----------------------------------------------------------------------------
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders (id) on delete cascade,
  method public.payment_method not null,
  status public.payment_status not null default 'pending',
  amount numeric(10, 2) not null check (amount >= 0),
  provider text not null default 'offline', -- 'demo', 'offline' ou o gateway futuro
  provider_reference text,
  pix_copy_paste text,
  pix_expires_at timestamptz,
  change_for numeric(10, 2),
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index payments_status_idx on public.payments (status);

-- -----------------------------------------------------------------------------
-- Avaliações
-- -----------------------------------------------------------------------------
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  food_rating smallint check (food_rating is null or food_rating between 1 and 5),
  delivery_rating smallint check (delivery_rating is null or delivery_rating between 1 and 5),
  comment text check (comment is null or char_length(comment) <= 1000),
  reply text check (reply is null or char_length(reply) <= 1000),
  replied_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index reviews_restaurant_idx on public.reviews (restaurant_id, created_at desc);
create index reviews_user_idx on public.reviews (user_id);

-- -----------------------------------------------------------------------------
-- Banners, notificações e configurações
-- -----------------------------------------------------------------------------
create table public.banners (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 2 and 60),
  subtitle text check (subtitle is null or char_length(subtitle) <= 120),
  image_url text,
  link_url text check (link_url is null or link_url ~ '^/'), -- apenas links internos
  bg_color text not null default '#E8361C' check (bg_color ~ '^#[0-9A-Fa-f]{6}$'),
  emoji text check (emoji is null or char_length(emoji) <= 16),
  is_active boolean not null default true,
  sort_order integer not null default 0,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index banners_active_idx on public.banners (is_active, sort_order);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type text not null default 'order_status',
  title text not null,
  body text not null,
  order_id uuid references public.orders (id) on delete cascade,
  link text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, created_at desc);
create index notifications_unread_idx on public.notifications (user_id) where read_at is null;

create table public.app_settings (
  id smallint primary key default 1 check (id = 1),
  platform_fee_percent numeric(5, 2) not null default 12 check (platform_fee_percent between 0 and 100),
  demo_payments boolean not null default true, -- ambiente de demonstração do PIX
  support_email text,
  support_phone text,
  updated_at timestamptz not null default now()
);
insert into public.app_settings (id) values (1);
