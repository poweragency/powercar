import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import {
  getSavedAccount,
  readSavedAccounts,
  removeSavedAccount,
  SAVED_ACCOUNTS_COOKIE,
  savedAccountsCookieOptions,
} from "@/lib/auth/saved-accounts";
import type { Database } from "@/types/database.types";

// Switch all'account salvato:
//   1) scambia il refresh token col gotrue di Supabase (chiamata diretta)
//   2) costruisce una NextResponse e ci scrive sopra ESPLICITAMENTE i cookie
//      di sessione tramite createServerClient + response.cookies.set
//   3) aggiorna anche il cookie crm-saved-accounts con il refresh token
//      ruotato (Supabase ruota il refresh token a ogni scambio)
//
// Usiamo NextResponse + cookies esplicite per essere sicuri che i Set-Cookie
// arrivino davvero al browser: in alcuni scenari il fallback su cookies() di
// next/headers nei Route Handler non propaga le scritture asincrone tardive
// del client Supabase, e l'utente resta apparentemente nello stato di prima.
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const saved = await getSavedAccount(id);
  if (!saved) {
    return NextResponse.json({ error: "account_not_saved" }, { status: 404 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  // 1) Scambia il refresh token con gotrue → nuova coppia access+refresh.
  const tokenRes = await fetch(`${url}/auth/v1/token?grant_type=refresh_token`, {
    method: "POST",
    headers: {
      apikey: key,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ refresh_token: saved.refresh_token }),
  });
  if (!tokenRes.ok) {
    // Refresh token scaduto/revocato: rimuovilo dai salvati cosi' l'utente
    // non lo rivede in lista.
    await removeSavedAccount(id);
    return NextResponse.json({ error: "refresh_failed" }, { status: 401 });
  }
  const newSession = (await tokenRes.json()) as {
    access_token: string;
    refresh_token: string;
    expires_in?: number;
    user?: { id: string };
  };

  // 2) Response con i cookie di auth scritti esplicitamente.
  const response = NextResponse.json({ ok: true, redirect: "/dashboard" });
  const cookieStore = await cookies();
  const supabase = createServerClient<Database>(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(toSet) {
        toSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });
  await supabase.auth.setSession({
    access_token: newSession.access_token,
    refresh_token: newSession.refresh_token,
  });

  // 3) Aggiorna il cookie saved-accounts con il refresh token ruotato.
  const all = await readSavedAccounts();
  const idx = all.findIndex((a) => a.id === id);
  if (idx >= 0) {
    all[idx] = { ...all[idx], refresh_token: newSession.refresh_token };
  }
  response.cookies.set(
    SAVED_ACCOUNTS_COOKIE,
    JSON.stringify(all),
    savedAccountsCookieOptions()
  );

  return response;
}
