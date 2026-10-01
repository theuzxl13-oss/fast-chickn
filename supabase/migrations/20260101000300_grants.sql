-- =============================================================================
-- FAST CHICKN — Permissões explícitas da Data API
-- Garante o funcionamento mesmo em projetos criados com "Automatically expose
-- new tables" desativado. O acesso real continua controlado pelo RLS.
-- =============================================================================

grant usage on schema public to anon, authenticated, service_role;

-- Leitura pública (vitrine): também protegida por RLS
grant select on
  public.categories, public.restaurants, public.menu_categories, public.products,
  public.product_options, public.product_option_items, public.reviews,
  public.banners, public.app_settings
to anon;

-- Usuários logados: todas as tabelas, sempre filtradas pelo RLS
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;

-- Service role (usada apenas no seed/servidor)
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;

-- Funções chamadas pelo app
grant execute on function public.search_restaurants(text) to anon, authenticated;
grant execute on function public.search_products(text, int) to anon, authenticated;
grant execute on function public.restaurant_is_open(uuid, timestamptz) to anon, authenticated;
grant execute on function public.f_unaccent(text) to anon, authenticated;
