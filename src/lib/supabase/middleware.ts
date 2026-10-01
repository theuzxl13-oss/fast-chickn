import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/env";
import type { UserRole } from "@/types";

const CLIENT_ROUTES = ["/checkout", "/pedido", "/pedidos", "/favoritos", "/conta"];
const PARTNER_PREFIX = "/parceiro";
const ADMIN_PREFIX = "/admin";

function matches(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

/**
 * Renova a sessão do Supabase e aplica o primeiro nível de proteção de rotas.
 * A autorização definitiva acontece no servidor (layouts) e no banco (RLS).
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return response;

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const needsPartner = matches(pathname, PARTNER_PREFIX);
  const needsAdmin = matches(pathname, ADMIN_PREFIX);
  const needsUser = needsPartner || needsAdmin || CLIENT_ROUTES.some((p) => matches(pathname, p));

  const redirectTo = (path: string) => {
    const url = request.nextUrl.clone();
    url.pathname = path;
    url.search = "";
    if (path === "/login") url.searchParams.set("next", pathname);
    const redirect = NextResponse.redirect(url);
    response.cookies.getAll().forEach((c) => redirect.cookies.set(c));
    return redirect;
  };

  if (!needsUser) return response;
  if (!user) return redirectTo("/login");

  if (needsPartner || needsAdmin) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, is_blocked")
      .eq("id", user.id)
      .maybeSingle<{ role: UserRole; is_blocked: boolean }>();

    if (!profile || profile.is_blocked) return redirectTo("/");
    if (needsAdmin && profile.role !== "admin") return redirectTo("/");
    if (needsPartner && profile.role !== "restaurant") return redirectTo(profile.role === "admin" ? "/admin" : "/");
  }

  return response;
}
