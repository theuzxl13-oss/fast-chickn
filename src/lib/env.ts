// Variáveis públicas (seguras para o navegador). A segurança dos dados é
// garantida pelo RLS do Supabase, não pelo segredo destas chaves.
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const DEFAULT_COORDS = {
  lat: Number(process.env.NEXT_PUBLIC_DEFAULT_LAT ?? -23.5505),
  lng: Number(process.env.NEXT_PUBLIC_DEFAULT_LNG ?? -46.6333),
};

export function assertSupabaseEnv() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error(
      "Supabase não configurado: defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY em .env.local (veja .env.example).",
    );
  }
}
