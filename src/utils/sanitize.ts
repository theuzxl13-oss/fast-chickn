/** Remove caracteres de controle e espaços extras de entradas de texto livre. */
export function cleanText(value: unknown, max = 500): string {
  if (typeof value !== "string") return "";
  return value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/[<>]/g, "")
    .trim()
    .slice(0, max);
}

export function onlyDigits(value: unknown): string {
  return typeof value === "string" ? value.replace(/\D/g, "") : "";
}

/** Escapa curingas usados em filtros ILIKE do PostgREST. */
export function escapeLike(value: string) {
  return value.replace(/[%_,()\\]/g, " ").trim();
}

export function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

/** Aceita apenas caminhos internos para redirecionamentos (evita open redirect). */
export function safeRedirect(path: string | null | undefined, fallback = "/") {
  if (!path || !path.startsWith("/") || path.startsWith("//") || path.startsWith("/\\")) return fallback;
  return path;
}
