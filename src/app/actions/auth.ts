"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { firstError, signInSchema, signUpSchema, toFieldErrors } from "@/lib/validation";
import { safeRedirect } from "@/utils/sanitize";
import { SITE_URL } from "@/lib/env";
import type { ActionResult, UserRole } from "@/types";

function translateAuthError(message: string) {
  if (/invalid login credentials/i.test(message)) return "E-mail ou senha incorretos.";
  if (/email not confirmed/i.test(message)) return "Confirme seu e-mail antes de entrar (verifique sua caixa de entrada).";
  if (/already registered|already been registered/i.test(message)) return "Este e-mail já está cadastrado.";
  if (/rate limit/i.test(message)) return "Muitas tentativas. Aguarde alguns minutos.";
  return "Não foi possível concluir. Tente novamente.";
}

function homeFor(role: UserRole | undefined) {
  if (role === "admin") return "/admin";
  if (role === "restaurant") return "/parceiro";
  return "/";
}

export async function signInAction(_: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const parsed = signInSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: firstError(parsed.error), fieldErrors: toFieldErrors(parsed.error) };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error || !data.user) return { ok: false, error: translateAuthError(error?.message ?? "") };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, is_blocked")
    .eq("id", data.user.id)
    .maybeSingle<{ role: UserRole; is_blocked: boolean }>();

  if (profile?.is_blocked) {
    await supabase.auth.signOut();
    return { ok: false, error: "Sua conta está bloqueada. Fale com o suporte." };
  }

  const next = formData.get("next");
  const fallback = homeFor(profile?.role);
  redirect(typeof next === "string" && next && profile?.role === "client" ? safeRedirect(next, fallback) : fallback);
}

export async function signUpAction(_: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const parsed = signUpSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: firstError(parsed.error), fieldErrors: toFieldErrors(parsed.error) };

  const { full_name, email, phone, password, account_type } = parsed.data;
  const supabase = await createClient();
  const origin = (await headers()).get("origin") ?? SITE_URL;

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // Os metadados são lidos pelo trigger handle_new_user. O papel 'admin'
      // nunca pode ser obtido por aqui (o trigger só aceita client/restaurant).
      data: { full_name, phone: phone || null, account_type },
      emailRedirectTo: `${origin}/auth/callback?next=${account_type === "restaurant" ? "/parceiro" : "/"}`,
    },
  });
  if (error) return { ok: false, error: translateAuthError(error.message) };

  if (!data.session) {
    return { ok: true, message: "Conta criada! Enviamos um link de confirmação para o seu e-mail." };
  }
  redirect(account_type === "restaurant" ? "/parceiro/cadastro" : "/conta/enderecos?novo=1");
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
