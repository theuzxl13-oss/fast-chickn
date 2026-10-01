// Variáveis públicas (seguras para o navegador). A segurança dos dados é
// garantida pelo RLS do Supabase, não pelo segredo destas chaves.
// .trim() evita falhas comuns ao colar valores em painéis de hospedagem.
export const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();
export const SUPABASE_ANON_KEY = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "").trim();
export const SITE_URL = (() => {
  const raw = (process.env.NEXT_PUBLIC_SITE_URL ?? "").trim();
  try {
    return raw ? new URL(raw).origin : "http://localhost:3000";
  } catch {
    return "http://localhost:3000";
  }
})();

export const DEFAULT_COORDS = {
  lat: Number(process.env.NEXT_PUBLIC_DEFAULT_LAT ?? -23.5505),
  lng: Number(process.env.NEXT_PUBLIC_DEFAULT_LNG ?? -46.6333),
};

/** Retorna a lista de problemas de configuração (sem expor valores). */
export function supabaseEnvProblems(): string[] {
  const problems: string[] = [];
  if (!SUPABASE_URL) problems.push("NEXT_PUBLIC_SUPABASE_URL não definida");
  else if (!/^https?:\/\/[^\s"'=]+$/.test(SUPABASE_URL)) {
    problems.push("NEXT_PUBLIC_SUPABASE_URL inválida (deve ser só o endereço, ex.: https://xxxx.supabase.co — sem aspas, espaços ou o nome da variável)");
  }
  if (!SUPABASE_ANON_KEY) problems.push("NEXT_PUBLIC_SUPABASE_ANON_KEY não definida");
  else if (/[\s"'=]/.test(SUPABASE_ANON_KEY.replace(/=+$/, "")) || SUPABASE_ANON_KEY.length < 30) {
    problems.push("NEXT_PUBLIC_SUPABASE_ANON_KEY inválida (cole apenas a chave anon, sem aspas, espaços ou o nome da variável)");
  }
  return problems;
}

export function assertSupabaseEnv() {
  const problems = supabaseEnvProblems();
  if (problems.length) {
    throw new Error(`Supabase não configurado: ${problems.join("; ")}. Veja .env.example.`);
  }
}
