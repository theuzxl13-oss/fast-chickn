-- =============================================================================
-- FAST CHICKN — Funções, triggers e regras de negócio
-- Toda regra sensível (preço, cupom, status do pedido, pagamento) é executada
-- aqui, no banco, e nunca depende do frontend.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- updated_at automático
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

do $$
declare t text;
begin
  foreach t in array array[
    'profiles', 'addresses', 'categories', 'restaurants', 'menu_categories', 'products',
    'product_options', 'product_option_items', 'carts', 'coupons', 'orders', 'payments',
    'reviews', 'banners', 'app_settings'
  ] loop
    execute format(
      'create trigger %I before update on public.%I for each row execute function public.set_updated_at()',
      t || '_set_updated_at', t
    );
  end loop;
end;
$$;

-- -----------------------------------------------------------------------------
-- Helpers de autorização (security definer para evitar recursão em RLS)
-- -----------------------------------------------------------------------------
create or replace function public.current_user_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin' and not is_blocked
  )
$$;

create or replace function public.is_restaurant_member(p_restaurant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.restaurant_users ru
    join public.profiles p on p.id = ru.user_id
    where ru.restaurant_id = p_restaurant_id
      and ru.user_id = auth.uid()
      and p.role = 'restaurant'
      and not p.is_blocked
  )
$$;

-- Restaurante visível ao público (ativo) ou à própria equipe / admin
create or replace function public.can_view_restaurant(p_restaurant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.restaurants where id = p_restaurant_id and status = 'active')
      or public.is_restaurant_member(p_restaurant_id)
      or public.is_admin()
$$;

create or replace function public.can_manage_restaurant(p_restaurant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_restaurant_member(p_restaurant_id) or public.is_admin()
$$;

create or replace function public.product_restaurant_id(p_product_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select restaurant_id from public.products where id = p_product_id
$$;

create or replace function public.option_restaurant_id(p_option_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select p.restaurant_id
  from public.product_options o
  join public.products p on p.id = o.product_id
  where o.id = p_option_id
$$;

create or replace function public.can_view_order(p_order_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.orders o
    where o.id = p_order_id
      and (o.user_id = auth.uid() or public.is_restaurant_member(o.restaurant_id) or public.is_admin())
  )
$$;

-- -----------------------------------------------------------------------------
-- Criação automática de perfil no cadastro (Supabase Auth)
-- Apenas 'client' ou 'restaurant' podem ser escolhidos no cadastro.
-- 'admin' só pode ser atribuído por outro admin ou via SQL.
-- -----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role public.user_role := 'client';
  v_phone text;
begin
  if new.raw_user_meta_data ->> 'account_type' = 'restaurant' then
    v_role := 'restaurant';
  end if;

  v_phone := regexp_replace(coalesce(new.raw_user_meta_data ->> 'phone', ''), '[^0-9]', '', 'g');
  if v_phone !~ '^[0-9]{10,13}$' then
    v_phone := null;
  end if;

  insert into public.profiles (id, full_name, email, phone, role)
  values (
    new.id,
    left(coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), split_part(new.email, '@', 1)), 120),
    new.email,
    v_phone,
    v_role
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Usuário comum não pode alterar o próprio papel nem desbloquear a conta
create or replace function public.protect_profile_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    new.role := old.role;
    new.is_blocked := old.is_blocked;
    new.email := old.email;
  end if;
  return new;
end;
$$;

create trigger profiles_protect_columns
  before update on public.profiles
  for each row execute function public.protect_profile_columns();

-- Parceiro não pode alterar status, métricas nem destaque do próprio restaurante
create or replace function public.protect_restaurant_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    new.status := old.status;
    new.is_featured := old.is_featured;
    new.rating_avg := old.rating_avg;
    new.rating_count := old.rating_count;
    new.total_orders := old.total_orders;
    new.slug := old.slug;
  end if;
  return new;
end;
$$;

create trigger restaurants_protect_columns
  before update on public.restaurants
  for each row execute function public.protect_restaurant_columns();

-- Mantém um único endereço padrão por usuário
create or replace function public.addresses_single_default()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Ignora a atualização em cascata feita por este próprio trigger
  if pg_trigger_depth() > 1 then
    return new;
  end if;

  if new.is_default then
    update public.addresses
       set is_default = false
     where user_id = new.user_id and id <> new.id and is_default;
  elsif not exists (select 1 from public.addresses where user_id = new.user_id and is_default and id <> new.id) then
    new.is_default := true; -- o primeiro endereço sempre é o padrão
  end if;
  return new;
end;
$$;

create trigger addresses_single_default
  before insert or update of is_default on public.addresses
  for each row execute function public.addresses_single_default();

-- -----------------------------------------------------------------------------
-- Horário de funcionamento
-- -----------------------------------------------------------------------------
create or replace function public.restaurant_is_open(p_restaurant_id uuid, p_at timestamptz default now())
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  r record;
  v_local timestamp;
  v_dow int;
  v_time time;
  v_day jsonb;
  v_open time;
  v_close time;
begin
  select opening_hours, accepting_orders, status, timezone into r
  from public.restaurants where id = p_restaurant_id;

  if not found or r.status <> 'active' or not r.accepting_orders then
    return false;
  end if;

  v_local := p_at at time zone r.timezone;
  v_dow := extract(dow from v_local)::int;
  v_time := v_local::time;

  -- Expediente de hoje
  v_day := r.opening_hours -> v_dow::text;
  if v_day is not null and jsonb_typeof(v_day) = 'object' then
    v_open := (v_day ->> 'open')::time;
    v_close := (v_day ->> 'close')::time;
    if v_close > v_open and v_time >= v_open and v_time < v_close then
      return true;
    end if;
    if v_close <= v_open and v_time >= v_open then
      return true;
    end if;
  end if;

  -- Expediente de ontem que atravessa a meia-noite
  v_day := r.opening_hours -> ((v_dow + 6) % 7)::text;
  if v_day is not null and jsonb_typeof(v_day) = 'object' then
    v_open := (v_day ->> 'open')::time;
    v_close := (v_day ->> 'close')::time;
    if v_close <= v_open and v_time < v_close then
      return true;
    end if;
  end if;

  return false;
end;
$$;

-- -----------------------------------------------------------------------------
-- Cupons
-- -----------------------------------------------------------------------------
create or replace function public.compute_coupon(
  p_code text,
  p_restaurant_id uuid,
  p_subtotal numeric,
  p_user_id uuid
)
returns table (coupon_id uuid, code text, discount numeric, message text)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  c public.coupons%rowtype;
  v_uses int;
  v_discount numeric;
begin
  select * into c from public.coupons where coupons.code = upper(trim(p_code));

  if not found or not c.is_active then
    return query select null::uuid, null::text, 0::numeric, 'Cupom inválido.'::text; return;
  end if;
  if c.starts_at > now() then
    return query select null::uuid, null::text, 0::numeric, 'Este cupom ainda não está válido.'::text; return;
  end if;
  if c.ends_at is not null and c.ends_at < now() then
    return query select null::uuid, null::text, 0::numeric, 'Este cupom expirou.'::text; return;
  end if;
  if c.usage_limit is not null and c.used_count >= c.usage_limit then
    return query select null::uuid, null::text, 0::numeric, 'Este cupom esgotou.'::text; return;
  end if;
  if c.owner_restaurant_id is not null and c.owner_restaurant_id <> p_restaurant_id then
    return query select null::uuid, null::text, 0::numeric, 'Cupom não válido para este restaurante.'::text; return;
  end if;
  if exists (select 1 from public.coupon_restaurants cr where cr.coupon_id = c.id)
     and not exists (select 1 from public.coupon_restaurants cr where cr.coupon_id = c.id and cr.restaurant_id = p_restaurant_id) then
    return query select null::uuid, null::text, 0::numeric, 'Cupom não válido para este restaurante.'::text; return;
  end if;
  if p_subtotal < c.min_order_value then
    return query select null::uuid, null::text, 0::numeric,
      ('Pedido mínimo para este cupom: R$ ' || replace(to_char(c.min_order_value, 'FM999990.00'), '.', ','))::text;
    return;
  end if;
  if p_user_id is not null then
    select count(*) into v_uses from public.coupon_uses cu where cu.coupon_id = c.id and cu.user_id = p_user_id;
    if v_uses >= c.usage_per_user then
      return query select null::uuid, null::text, 0::numeric, 'Você já utilizou este cupom.'::text; return;
    end if;
  end if;

  if c.discount_type = 'percent' then
    v_discount := round(p_subtotal * c.discount_value / 100, 2);
  else
    v_discount := c.discount_value;
  end if;
  if c.max_discount is not null then
    v_discount := least(v_discount, c.max_discount);
  end if;
  v_discount := least(v_discount, p_subtotal);

  return query select c.id, c.code, v_discount, 'Cupom aplicado!'::text;
end;
$$;

-- RPC pública para o carrinho (usa o usuário logado)
create or replace function public.validate_coupon(p_code text, p_restaurant_id uuid, p_subtotal numeric)
returns table (coupon_id uuid, code text, discount numeric, message text)
language sql
stable
security definer
set search_path = public
as $$
  select * from public.compute_coupon(p_code, p_restaurant_id, p_subtotal, auth.uid())
$$;

-- -----------------------------------------------------------------------------
-- Criação de pedido (preços SEMPRE recalculados no servidor)
-- p_items: [{ "product_id": uuid, "quantity": int, "option_item_ids": [uuid],
--             "removed_ingredients": [text], "notes": text }]
-- -----------------------------------------------------------------------------
create or replace function public.place_order(
  p_restaurant_id uuid,
  p_address_id uuid,
  p_items jsonb,
  p_payment_method public.payment_method,
  p_change_for numeric default null,
  p_coupon_code text default null,
  p_notes text default null
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_profile public.profiles%rowtype;
  v_restaurant public.restaurants%rowtype;
  v_address public.addresses%rowtype;
  v_item jsonb;
  v_product public.products%rowtype;
  v_qty int;
  v_unit numeric;
  v_selected uuid[];
  v_removed text[];
  v_options jsonb;
  v_opt record;
  v_count int;
  v_subtotal numeric := 0;
  v_delivery numeric;
  v_discount numeric := 0;
  v_total numeric;
  v_coupon record;
  v_coupon_id uuid;
  v_coupon_code text;
  v_order public.orders%rowtype;
  v_lines jsonb := '[]'::jsonb;
  v_line jsonb;
  v_settings public.app_settings%rowtype;
begin
  if v_uid is null then
    raise exception 'Faça login para concluir o pedido.';
  end if;

  select * into v_profile from public.profiles where id = v_uid;
  if not found or v_profile.is_blocked then
    raise exception 'Sua conta não pode realizar pedidos. Fale com o suporte.';
  end if;

  select * into v_restaurant from public.restaurants where id = p_restaurant_id;
  if not found or v_restaurant.status <> 'active' then
    raise exception 'Restaurante indisponível.';
  end if;
  if not public.restaurant_is_open(p_restaurant_id) then
    raise exception 'O restaurante está fechado no momento.';
  end if;

  select * into v_address from public.addresses where id = p_address_id and user_id = v_uid;
  if not found then
    raise exception 'Endereço de entrega inválido.';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Seu carrinho está vazio.';
  end if;
  if jsonb_array_length(p_items) > 50 then
    raise exception 'Quantidade de itens excede o limite.';
  end if;

  for v_item in select * from jsonb_array_elements(p_items) loop
    select * into v_product
    from public.products
    where id = (v_item ->> 'product_id')::uuid and restaurant_id = p_restaurant_id;

    if not found then
      raise exception 'Produto não encontrado neste restaurante.';
    end if;
    if not v_product.is_available then
      raise exception 'O produto "%" está indisponível.', v_product.name;
    end if;

    v_qty := coalesce((v_item ->> 'quantity')::int, 0);
    if v_qty < 1 or v_qty > 99 then
      raise exception 'Quantidade inválida para "%".', v_product.name;
    end if;

    v_selected := coalesce(
      (select array_agg(distinct x::uuid) from jsonb_array_elements_text(coalesce(v_item -> 'option_item_ids', '[]'::jsonb)) x),
      '{}'::uuid[]
    );
    v_removed := coalesce(
      (select array_agg(distinct x) from jsonb_array_elements_text(coalesce(v_item -> 'removed_ingredients', '[]'::jsonb)) x),
      '{}'::text[]
    );

    if not (v_removed <@ v_product.ingredients) then
      raise exception 'Ingrediente inválido em "%".', v_product.name;
    end if;

    -- Todas as opções selecionadas precisam pertencer ao produto e estar disponíveis
    select count(*) into v_count
    from public.product_option_items i
    join public.product_options o on o.id = i.option_id
    where i.id = any (v_selected) and o.product_id = v_product.id and i.is_available;
    if v_count <> coalesce(array_length(v_selected, 1), 0) then
      raise exception 'Opção inválida ou indisponível em "%".', v_product.name;
    end if;

    -- Regras de mínimo/máximo por grupo
    for v_opt in
      select o.name, o.min_select, o.max_select,
             (select count(*) from public.product_option_items i where i.option_id = o.id and i.id = any (v_selected)) as chosen
      from public.product_options o
      where o.product_id = v_product.id
    loop
      if v_opt.chosen < v_opt.min_select then
        raise exception 'Escolha uma opção em "%" para "%".', v_opt.name, v_product.name;
      end if;
      if v_opt.chosen > v_opt.max_select then
        raise exception 'Máximo de % opções em "%".', v_opt.max_select, v_opt.name;
      end if;
    end loop;

    select coalesce(jsonb_agg(jsonb_build_object('group', o.name, 'name', i.name, 'price', i.price) order by o.sort_order, i.sort_order), '[]'::jsonb),
           coalesce(sum(i.price), 0)
      into v_options, v_unit
    from public.product_option_items i
    join public.product_options o on o.id = i.option_id
    where i.id = any (v_selected);

    v_unit := coalesce(v_product.promo_price, v_product.price) + v_unit;
    v_subtotal := v_subtotal + v_unit * v_qty;

    v_lines := v_lines || jsonb_build_object(
      'product_id', v_product.id,
      'product_name', v_product.name,
      'quantity', v_qty,
      'unit_price', v_unit,
      'total_price', v_unit * v_qty,
      'options', v_options,
      'removed_ingredients', to_jsonb(v_removed),
      'notes', nullif(left(trim(coalesce(v_item ->> 'notes', '')), 280), '')
    );
  end loop;

  if v_subtotal < v_restaurant.min_order then
    raise exception 'O pedido mínimo deste restaurante é R$ %.', replace(to_char(v_restaurant.min_order, 'FM999990.00'), '.', ',');
  end if;

  v_delivery := v_restaurant.delivery_fee;

  if nullif(trim(coalesce(p_coupon_code, '')), '') is not null then
    select * into v_coupon from public.compute_coupon(p_coupon_code, p_restaurant_id, v_subtotal, v_uid);
    if v_coupon.coupon_id is null then
      raise exception '%', v_coupon.message;
    end if;
    v_discount := v_coupon.discount;
    v_coupon_id := v_coupon.coupon_id;
    v_coupon_code := v_coupon.code;
  end if;

  v_total := greatest(v_subtotal + v_delivery - v_discount, 0);

  if p_payment_method = 'cash' and p_change_for is not null and p_change_for < v_total then
    raise exception 'O valor para troco deve ser maior que o total do pedido.';
  end if;

  insert into public.orders (
    user_id, restaurant_id, customer_name, customer_phone, delivery_address,
    subtotal, delivery_fee, discount, total, coupon_id, coupon_code,
    payment_method, change_for, notes, estimated_min, estimated_max
  ) values (
    v_uid, p_restaurant_id, v_profile.full_name, v_profile.phone,
    jsonb_build_object(
      'label', v_address.label, 'cep', v_address.cep, 'street', v_address.street,
      'number', v_address.number, 'complement', v_address.complement,
      'neighborhood', v_address.neighborhood, 'city', v_address.city,
      'state', v_address.state, 'reference', v_address.reference,
      'latitude', v_address.latitude, 'longitude', v_address.longitude
    ),
    v_subtotal, v_delivery, v_discount, v_total, v_coupon_id, v_coupon_code,
    p_payment_method,
    case when p_payment_method = 'cash' then p_change_for end,
    nullif(left(trim(coalesce(p_notes, '')), 280), ''),
    v_restaurant.delivery_time_min, v_restaurant.delivery_time_max
  )
  returning * into v_order;

  for v_line in select * from jsonb_array_elements(v_lines) loop
    insert into public.order_items (
      order_id, product_id, product_name, quantity, unit_price, total_price,
      options, removed_ingredients, notes
    ) values (
      v_order.id,
      (v_line ->> 'product_id')::uuid,
      v_line ->> 'product_name',
      (v_line ->> 'quantity')::int,
      (v_line ->> 'unit_price')::numeric,
      (v_line ->> 'total_price')::numeric,
      v_line -> 'options',
      coalesce((select array_agg(x) from jsonb_array_elements_text(v_line -> 'removed_ingredients') x), '{}'),
      v_line ->> 'notes'
    );
  end loop;

  if v_coupon_id is not null then
    insert into public.coupon_uses (coupon_id, user_id, order_id, discount_amount)
    values (v_coupon_id, v_uid, v_order.id, v_discount);
    update public.coupons set used_count = used_count + 1 where id = v_coupon_id;
  end if;

  select * into v_settings from public.app_settings where id = 1;

  insert into public.payments (order_id, method, status, amount, provider, change_for)
  values (
    v_order.id, p_payment_method, 'pending', v_total,
    case when p_payment_method = 'pix' then (case when v_settings.demo_payments then 'demo' else 'gateway' end) else 'offline' end,
    case when p_payment_method = 'cash' then p_change_for end
  );

  -- Limpa o carrinho salvo
  delete from public.carts where user_id = v_uid;

  return jsonb_build_object('id', v_order.id, 'code', v_order.code, 'total', v_order.total);
end;
$$;

-- -----------------------------------------------------------------------------
-- Atualização de status do pedido (restaurante, admin ou cliente cancelando)
-- -----------------------------------------------------------------------------
create or replace function public.update_order_status(
  p_order_id uuid,
  p_status public.order_status,
  p_note text default null
)
returns public.orders
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_order public.orders%rowtype;
  v_uid uuid := auth.uid();
  v_is_staff boolean;
  v_is_admin boolean;
  v_allowed boolean := false;
begin
  if v_uid is null then
    raise exception 'Não autenticado.';
  end if;

  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'Pedido não encontrado.';
  end if;

  v_is_admin := public.is_admin();
  v_is_staff := public.is_restaurant_member(v_order.restaurant_id);

  if v_is_staff or v_is_admin then
    v_allowed := case v_order.status
      when 'pending' then p_status in ('confirmed', 'rejected', 'cancelled')
      when 'confirmed' then p_status in ('preparing', 'cancelled')
      when 'preparing' then p_status in ('ready', 'cancelled')
      when 'ready' then p_status in ('out_for_delivery', 'cancelled')
      when 'out_for_delivery' then p_status in ('delivered')
      else false
    end;
  elsif v_order.user_id = v_uid then
    -- O cliente só pode cancelar enquanto o restaurante não aceitou
    v_allowed := v_order.status = 'pending' and p_status = 'cancelled';
  else
    raise exception 'Acesso negado.';
  end if;

  if not v_allowed then
    raise exception 'Transição de status inválida.';
  end if;

  update public.orders set
    status = p_status,
    confirmed_at = case when p_status = 'confirmed' then now() else confirmed_at end,
    ready_at = case when p_status = 'ready' then now() else ready_at end,
    dispatched_at = case when p_status = 'out_for_delivery' then now() else dispatched_at end,
    delivered_at = case when p_status = 'delivered' then now() else delivered_at end,
    cancelled_at = case when p_status in ('cancelled', 'rejected') then now() else cancelled_at end,
    cancel_reason = case when p_status in ('cancelled', 'rejected') then nullif(left(trim(coalesce(p_note, '')), 200), '') else cancel_reason end
  where id = p_order_id
  returning * into v_order;

  if p_status = 'delivered' then
    update public.payments
       set status = 'paid', paid_at = coalesce(paid_at, now())
     where order_id = p_order_id and method <> 'pix' and status = 'pending';
    update public.restaurants set total_orders = total_orders + 1 where id = v_order.restaurant_id;
    update public.products p
       set sold_count = p.sold_count + s.qty
      from (select product_id, sum(quantity) as qty from public.order_items where order_id = p_order_id and product_id is not null group by product_id) s
     where p.id = s.product_id;
  end if;

  if p_status in ('cancelled', 'rejected') then
    update public.payments
       set status = case when status = 'paid' then 'refunded'::public.payment_status else 'cancelled'::public.payment_status end
     where order_id = p_order_id;
    -- Devolve o uso do cupom
    update public.coupons c
       set used_count = greatest(c.used_count - 1, 0)
      from public.coupon_uses cu
     where cu.order_id = p_order_id and cu.coupon_id = c.id;
    delete from public.coupon_uses where order_id = p_order_id;
  end if;

  -- Histórico com autor e observação (o trigger abaixo cuida da notificação)
  update public.order_status_history
     set changed_by = v_uid, note = nullif(left(trim(coalesce(p_note, '')), 200), '')
   where id = (select max(id) from public.order_status_history where order_id = p_order_id);

  return v_order;
end;
$$;

-- Histórico + notificação ao cliente a cada mudança de status
create or replace function public.orders_on_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_title text;
  v_body text;
begin
  if tg_op = 'UPDATE' and new.status = old.status then
    return new;
  end if;

  insert into public.order_status_history (order_id, status, changed_by)
  values (new.id, new.status, auth.uid());

  v_title := 'Pedido #' || new.code;
  v_body := case new.status
    when 'pending' then 'Recebemos seu pedido! Aguardando a confirmação do restaurante.'
    when 'confirmed' then 'Seu pedido foi confirmado.'
    when 'preparing' then 'Seu pedido está sendo preparado.'
    when 'ready' then 'Seu pedido está pronto e aguardando o entregador.'
    when 'out_for_delivery' then 'Seu pedido saiu para entrega.'
    when 'delivered' then 'Seu pedido chegou! Bom apetite. Que tal avaliar?'
    when 'cancelled' then 'Seu pedido foi cancelado.'
    when 'rejected' then 'O restaurante não pôde aceitar seu pedido.'
  end;

  if coalesce((select notifications_enabled from public.profiles where id = new.user_id), true) then
    insert into public.notifications (user_id, type, title, body, order_id, link)
    values (new.user_id, 'order_status', v_title, v_body, new.id, '/pedido/' || new.id);
  end if;

  return new;
end;
$$;

create trigger orders_status_change
  after insert or update of status on public.orders
  for each row execute function public.orders_on_status_change();

-- -----------------------------------------------------------------------------
-- Pagamento PIX — ambiente de demonstração
-- Gera um código "copia e cola" fictício e permite confirmar o pagamento
-- SOMENTE quando app_settings.demo_payments = true. Em produção, a confirmação
-- virá do webhook do gateway (ver src/services/payments).
-- -----------------------------------------------------------------------------
create or replace function public.demo_pix_charge(p_order_id uuid)
returns public.payments
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_payment public.payments%rowtype;
  v_order public.orders%rowtype;
begin
  select * into v_order from public.orders where id = p_order_id and user_id = auth.uid();
  if not found then
    raise exception 'Pedido não encontrado.';
  end if;
  if not (select demo_payments from public.app_settings where id = 1) then
    raise exception 'Pagamentos de demonstração estão desativados.';
  end if;

  select * into v_payment from public.payments where order_id = p_order_id and method = 'pix';
  if not found then
    raise exception 'Este pedido não utiliza PIX.';
  end if;

  if v_payment.pix_copy_paste is null or v_payment.pix_expires_at < now() then
    update public.payments set
      provider = 'demo',
      provider_reference = 'DEMO-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 20)),
      pix_copy_paste = '00020126580014BR.GOV.BCB.PIX0136demo-fastchickn-' || v_order.code
        || '5204000053039865406' || to_char(v_order.total, 'FM999990.00')
        || '5802BR5912FAST CHICKN6009SAO PAULO62110507' || v_order.code || '6304DEMO',
      pix_expires_at = now() + interval '30 minutes'
    where id = v_payment.id
    returning * into v_payment;
  end if;

  return v_payment;
end;
$$;

create or replace function public.demo_confirm_pix(p_order_id uuid)
returns public.payments
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_payment public.payments%rowtype;
begin
  if not exists (select 1 from public.orders where id = p_order_id and user_id = auth.uid()) then
    raise exception 'Pedido não encontrado.';
  end if;
  if not (select demo_payments from public.app_settings where id = 1) then
    raise exception 'Pagamentos de demonstração estão desativados.';
  end if;

  update public.payments
     set status = 'paid', paid_at = now()
   where order_id = p_order_id and method = 'pix' and status = 'pending' and provider = 'demo'
  returning * into v_payment;

  if not found then
    raise exception 'Pagamento não está pendente.';
  end if;
  return v_payment;
end;
$$;

-- -----------------------------------------------------------------------------
-- Avaliações: média do restaurante e resposta do parceiro
-- -----------------------------------------------------------------------------
create or replace function public.refresh_restaurant_rating()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_restaurant uuid := coalesce(new.restaurant_id, old.restaurant_id);
begin
  update public.restaurants r set
    rating_avg = coalesce((select round(avg(rating)::numeric, 2) from public.reviews where restaurant_id = v_restaurant), 0),
    rating_count = (select count(*) from public.reviews where restaurant_id = v_restaurant)
  where r.id = v_restaurant;
  return null;
end;
$$;

create trigger reviews_refresh_rating
  after insert or update of rating or delete on public.reviews
  for each row execute function public.refresh_restaurant_rating();

create or replace function public.reply_review(p_review_id uuid, p_reply text)
returns public.reviews
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_review public.reviews%rowtype;
begin
  select * into v_review from public.reviews where id = p_review_id;
  if not found or not public.can_manage_restaurant(v_review.restaurant_id) then
    raise exception 'Acesso negado.';
  end if;
  update public.reviews
     set reply = nullif(left(trim(coalesce(p_reply, '')), 1000), ''), replied_at = now()
   where id = p_review_id
  returning * into v_review;
  return v_review;
end;
$$;

-- -----------------------------------------------------------------------------
-- Cadastro de restaurante por um parceiro (fica pendente até aprovação)
-- -----------------------------------------------------------------------------
create or replace function public.create_restaurant(
  p_name text,
  p_slug text,
  p_category_id uuid,
  p_phone text,
  p_document text,
  p_cep text,
  p_street text,
  p_number text,
  p_neighborhood text,
  p_city text,
  p_state text,
  p_description text default null
)
returns public.restaurants
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_restaurant public.restaurants%rowtype;
begin
  if v_uid is null or public.current_user_role() <> 'restaurant' then
    raise exception 'Apenas contas de parceiro podem cadastrar restaurantes.';
  end if;
  if exists (select 1 from public.restaurant_users where user_id = v_uid) then
    raise exception 'Sua conta já possui um restaurante cadastrado.';
  end if;
  if exists (select 1 from public.restaurants where slug = p_slug) then
    raise exception 'Este endereço de loja (slug) já está em uso.';
  end if;

  insert into public.restaurants (
    name, slug, category_id, phone, document, cep, street, number,
    neighborhood, city, state, description, status, opening_hours
  ) values (
    trim(p_name), p_slug, p_category_id, p_phone, p_document, p_cep, trim(p_street), trim(p_number),
    trim(p_neighborhood), trim(p_city), upper(p_state), nullif(trim(coalesce(p_description, '')), ''), 'pending',
    '{"0":{"open":"11:00","close":"23:00"},"1":{"open":"11:00","close":"23:00"},"2":{"open":"11:00","close":"23:00"},"3":{"open":"11:00","close":"23:00"},"4":{"open":"11:00","close":"23:00"},"5":{"open":"11:00","close":"23:00"},"6":{"open":"11:00","close":"23:00"}}'::jsonb
  )
  returning * into v_restaurant;

  insert into public.restaurant_users (restaurant_id, user_id, member_role)
  values (v_restaurant.id, v_uid, 'owner');

  return v_restaurant;
end;
$$;

-- -----------------------------------------------------------------------------
-- Busca inteligente (restaurantes e produtos, sem acento e sem caixa)
-- -----------------------------------------------------------------------------
create or replace function public.search_restaurants(p_query text)
returns setof public.restaurants
language sql
stable
security invoker
set search_path = public
as $$
  with q as (select '%' || public.f_unaccent(lower(trim(p_query))) || '%' as term)
  select r.*
  from public.restaurants r, q
  where r.status = 'active'
    and (
      public.f_unaccent(lower(r.name)) like q.term
      or public.f_unaccent(lower(coalesce(r.description, ''))) like q.term
      or exists (select 1 from unnest(r.tags) t where public.f_unaccent(lower(t)) like q.term)
      or exists (
        select 1 from public.categories c
        where c.id = r.category_id and public.f_unaccent(lower(c.name)) like q.term
      )
      or exists (
        select 1 from public.products p
        where p.restaurant_id = r.id and p.is_available
          and (public.f_unaccent(lower(p.name)) like q.term or public.f_unaccent(lower(coalesce(p.description, ''))) like q.term)
      )
    )
  order by r.rating_avg desc, r.total_orders desc
  limit 50
$$;

create or replace function public.search_products(p_query text, p_limit int default 30)
returns setof public.products
language sql
stable
security invoker
set search_path = public
as $$
  with q as (select '%' || public.f_unaccent(lower(trim(p_query))) || '%' as term)
  select p.*
  from public.products p
  join public.restaurants r on r.id = p.restaurant_id and r.status = 'active'
  , q
  where p.is_available
    and (public.f_unaccent(lower(p.name)) like q.term or public.f_unaccent(lower(coalesce(p.description, ''))) like q.term)
  order by p.sold_count desc, p.name
  limit least(greatest(p_limit, 1), 100)
$$;

-- -----------------------------------------------------------------------------
-- Permissões de execução
-- -----------------------------------------------------------------------------
revoke execute on function public.place_order(uuid, uuid, jsonb, public.payment_method, numeric, text, text) from public, anon;
revoke execute on function public.update_order_status(uuid, public.order_status, text) from public, anon;
revoke execute on function public.demo_pix_charge(uuid) from public, anon;
revoke execute on function public.demo_confirm_pix(uuid) from public, anon;
revoke execute on function public.reply_review(uuid, text) from public, anon;
revoke execute on function public.create_restaurant(text, text, uuid, text, text, text, text, text, text, text, text, text) from public, anon;
revoke execute on function public.compute_coupon(text, uuid, numeric, uuid) from public, anon, authenticated;
revoke execute on function public.validate_coupon(text, uuid, numeric) from public, anon;
revoke execute on function public.handle_new_user() from public, anon, authenticated;

grant execute on function public.place_order(uuid, uuid, jsonb, public.payment_method, numeric, text, text) to authenticated;
grant execute on function public.update_order_status(uuid, public.order_status, text) to authenticated;
grant execute on function public.demo_pix_charge(uuid) to authenticated;
grant execute on function public.demo_confirm_pix(uuid) to authenticated;
grant execute on function public.reply_review(uuid, text) to authenticated;
grant execute on function public.create_restaurant(text, text, uuid, text, text, text, text, text, text, text, text, text) to authenticated;
grant execute on function public.validate_coupon(text, uuid, numeric) to authenticated;
