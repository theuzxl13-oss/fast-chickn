"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_ANON_KEY, SUPABASE_URL, assertSupabaseEnv } from "@/lib/env";

let browserClient: SupabaseClient | undefined;

/** Cliente Supabase para Client Components (singleton no navegador). */
export function createClient(): SupabaseClient {
  assertSupabaseEnv();
  if (!browserClient) {
    browserClient = createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
  return browserClient;
}
