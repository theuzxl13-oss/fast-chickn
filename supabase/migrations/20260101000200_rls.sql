-- =============================================================================
-- FAST CHICKN — Row Level Security
-- Regra geral:
--   * cliente vê apenas os próprios dados;
--   * parceiro vê apenas os dados do(s) restaurante(s) a que pertence;
--   * admin vê tudo.
-- Escritas sensíveis (pedidos, pagamentos, status) só via funções RPC.
-- =============================================================================

alter table public.profiles enable row level security;
alter table public.addresses enable row level security;
alter table public.categories enable row level security;
alter table public.restaurants enable row level security;
alter table public.restaurant_users enable row level security;
alter table public.menu_categories enable row level security;
alter table public.products enable row level security;
alter table public.product_options enable row level security;
alter table public.product_option_items enable row level security;
alter table public.favorites enable row level security;
alter table public.carts enable row level security;
alter table public.cart_items enable row level security;
alter table public.coupons enable row level security;
alter table public.coupon_restaurants enable row level security;
alter table public.coupon_uses enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_status_history enable row level security;
alter table public.payments enable row level security;
alter table public.reviews enable row level security;
alter table public.banners enable row level security;
alter table public.notifications enable row level security;
alter table public.app_settings enable row level security;

-- profiles --------------------------------------------------------------------
create policy "profiles: ler o próprio" on public.profiles
  for select to authenticated using (id = auth.uid() or public.is_admin());
create policy "profiles: atualizar o próprio" on public.profiles
  for update to authenticated using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

-- addresses -------------------------------------------------------------------
create policy "addresses: dono" on public.addresses
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
create policy "addresses: admin lê" on public.addresses
  for select to authenticated using (public.is_admin());

-- categories ------------------------------------------------------------------
create policy "categories: leitura pública" on public.categories
  for select using (is_active or public.is_admin());
create policy "categories: admin escreve" on public.categories
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- restaurants -----------------------------------------------------------------
create policy "restaurants: leitura" on public.restaurants
  for select using (status = 'active' or public.is_restaurant_member(id) or public.is_admin());
create policy "restaurants: equipe/admin atualiza" on public.restaurants
  for update to authenticated
  using (public.can_manage_restaurant(id))
  with check (public.can_manage_restaurant(id));
create policy "restaurants: admin insere" on public.restaurants
  for insert to authenticated with check (public.is_admin());
create policy "restaurants: admin remove" on public.restaurants
  for delete to authenticated using (public.is_admin());

-- restaurant_users ------------------------------------------------------------
create policy "restaurant_users: leitura" on public.restaurant_users
  for select to authenticated using (user_id = auth.uid() or public.is_admin());
create policy "restaurant_users: admin escreve" on public.restaurant_users
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- menu_categories -------------------------------------------------------------
create policy "menu_categories: leitura" on public.menu_categories
  for select using (public.can_view_restaurant(restaurant_id));
create policy "menu_categories: equipe escreve" on public.menu_categories
  for all to authenticated
  using (public.can_manage_restaurant(restaurant_id))
  with check (public.can_manage_restaurant(restaurant_id));

-- products --------------------------------------------------------------------
create policy "products: leitura" on public.products
  for select using (public.can_view_restaurant(restaurant_id));
create policy "products: equipe escreve" on public.products
  for all to authenticated
  using (public.can_manage_restaurant(restaurant_id))
  with check (
    public.can_manage_restaurant(restaurant_id)
    and (menu_category_id is null or exists (
      select 1 from public.menu_categories mc
      where mc.id = menu_category_id and mc.restaurant_id = products.restaurant_id
    ))
  );

-- product_options -------------------------------------------------------------
create policy "product_options: leitura" on public.product_options
  for select using (public.can_view_restaurant(public.product_restaurant_id(product_id)));
create policy "product_options: equipe escreve" on public.product_options
  for all to authenticated
  using (public.can_manage_restaurant(public.product_restaurant_id(product_id)))
  with check (public.can_manage_restaurant(public.product_restaurant_id(product_id)));

-- product_option_items --------------------------------------------------------
create policy "product_option_items: leitura" on public.product_option_items
  for select using (public.can_view_restaurant(public.option_restaurant_id(option_id)));
create policy "product_option_items: equipe escreve" on public.product_option_items
  for all to authenticated
  using (public.can_manage_restaurant(public.option_restaurant_id(option_id)))
  with check (public.can_manage_restaurant(public.option_restaurant_id(option_id)));

-- favorites -------------------------------------------------------------------
create policy "favorites: dono" on public.favorites
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- carts -----------------------------------------------------------------------
create policy "carts: dono" on public.carts
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "cart_items: dono" on public.cart_items
  for all to authenticated
  using (exists (select 1 from public.carts c where c.id = cart_id and c.user_id = auth.uid()))
  with check (exists (select 1 from public.carts c where c.id = cart_id and c.user_id = auth.uid()));

-- coupons ---------------------------------------------------------------------
create policy "coupons: leitura" on public.coupons
  for select to authenticated
  using (
    (is_public and is_active and (ends_at is null or ends_at > now()))
    or public.is_admin()
    or (owner_restaurant_id is not null and public.is_restaurant_member(owner_restaurant_id))
  );
create policy "coupons: admin escreve" on public.coupons
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "coupons: parceiro gerencia os próprios" on public.coupons
  for all to authenticated
  using (owner_restaurant_id is not null and public.is_restaurant_member(owner_restaurant_id))
  with check (owner_restaurant_id is not null and public.is_restaurant_member(owner_restaurant_id));

-- Parceiro não altera contador de uso
create or replace function public.protect_coupon_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    if tg_op = 'INSERT' then
      new.used_count := 0;
      new.created_by := auth.uid();
    else
      new.used_count := old.used_count;
      new.owner_restaurant_id := old.owner_restaurant_id;
    end if;
  end if;
  return new;
end;
$$;
create trigger coupons_protect_columns
  before insert or update on public.coupons
  for each row execute function public.protect_coupon_columns();

create policy "coupon_restaurants: leitura" on public.coupon_restaurants
  for select to authenticated using (true);
create policy "coupon_restaurants: admin escreve" on public.coupon_restaurants
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "coupon_uses: leitura" on public.coupon_uses
  for select to authenticated using (user_id = auth.uid() or public.is_admin());

-- orders (somente leitura; escrita via place_order / update_order_status) ----
create policy "orders: leitura" on public.orders
  for select to authenticated
  using (user_id = auth.uid() or public.is_restaurant_member(restaurant_id) or public.is_admin());

create policy "order_items: leitura" on public.order_items
  for select to authenticated using (public.can_view_order(order_id));

create policy "order_status_history: leitura" on public.order_status_history
  for select to authenticated using (public.can_view_order(order_id));

create policy "payments: leitura" on public.payments
  for select to authenticated using (public.can_view_order(order_id));

-- reviews ---------------------------------------------------------------------
create policy "reviews: leitura pública" on public.reviews
  for select using (true);
create policy "reviews: cliente avalia pedido entregue" on public.reviews
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and reply is null
    and exists (
      select 1 from public.orders o
      where o.id = order_id
        and o.user_id = auth.uid()
        and o.status = 'delivered'
        and o.restaurant_id = reviews.restaurant_id
    )
  );
create policy "reviews: admin remove" on public.reviews
  for delete to authenticated using (public.is_admin());

-- banners ---------------------------------------------------------------------
create policy "banners: leitura pública" on public.banners
  for select using (
    (is_active and (starts_at is null or starts_at <= now()) and (ends_at is null or ends_at > now()))
    or public.is_admin()
  );
create policy "banners: admin escreve" on public.banners
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- notifications ---------------------------------------------------------------
create policy "notifications: dono lê" on public.notifications
  for select to authenticated using (user_id = auth.uid());
create policy "notifications: dono marca como lida" on public.notifications
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "notifications: dono remove" on public.notifications
  for delete to authenticated using (user_id = auth.uid());

-- app_settings ----------------------------------------------------------------
create policy "app_settings: leitura" on public.app_settings
  for select using (true);
create policy "app_settings: admin atualiza" on public.app_settings
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- =============================================================================
-- Storage: bucket público de imagens
--   restaurants/<restaurant_id>/...  → equipe do restaurante e admin
--   banners/...                      → admin
-- =============================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('images', 'images', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create or replace function public.try_uuid(p text)
returns uuid
language plpgsql
immutable
as $$
begin
  return p::uuid;
exception when others then
  return null;
end;
$$;

create or replace function public.can_write_image(p_name text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_admin()
      or (
        (storage.foldername(p_name))[1] = 'restaurants'
        and public.is_restaurant_member(public.try_uuid((storage.foldername(p_name))[2]))
      )
$$;

create policy "images: leitura pública" on storage.objects
  for select using (bucket_id = 'images');
create policy "images: upload autorizado" on storage.objects
  for insert to authenticated with check (bucket_id = 'images' and public.can_write_image(name));
create policy "images: atualização autorizada" on storage.objects
  for update to authenticated using (bucket_id = 'images' and public.can_write_image(name));
create policy "images: remoção autorizada" on storage.objects
  for delete to authenticated using (bucket_id = 'images' and public.can_write_image(name));

-- =============================================================================
-- Realtime: acompanhamento do pedido e notificações (RLS é respeitado)
-- =============================================================================
alter publication supabase_realtime add table public.orders;
alter publication supabase_realtime add table public.notifications;
alter publication supabase_realtime add table public.payments;
