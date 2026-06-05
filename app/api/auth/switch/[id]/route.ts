import { NextResponse } from "next/server";
import {
  SAVED_ACCOUNTS_COOKIE,
  savedAccountsCookieOptions,
  type SavedAccount,
} from "@/lib/auth/saved-accounts";

// ============================================================
// Switch all'account salvato — implementazione bare-metal.
//
// Perche' non usiamo supabase.auth.setSession():
//   In un Route Handler, il listener onAuthStateChange di @supabase/ssr che
//   propaga i cookie alla NextResponse via setAll non scatta sempre in modo
//   affidabile per setSession con token "freschi" (gia' validi, non scaduti).
//   Risultato: la response arriva senza Set-Cookie sb-* e l'utente non
//   risulta autenticato sulla richiesta successiva.
//
// Cosa facciamo invece:
//   1) Scambiamo il refresh token salvato col token endpoint di gotrue.
//   2) Costruiamo a mano il cookie sb-{ref}-auth-token nel FORMATO ESATTO
//      che @supabase/ssr (v0.5+) scrive normalmente:
//        nome:  sb-{ref}-auth-token         (chunked .0, .1 se > 3180 bytes)
//        valore: "base64-" + base64url(JSON.stringify(session))
//      con i campi sessione: access_token, refresh_token, expires_at,
//      expires_in, token_type, user.
//   3) Scriviamo i cookie ESPLICITAMENTE su response.cookies.set con le
//      stesse default options di @supabase/ssr: path=/, sameSite=lax,
//      httpOnly=false (il browser client lo legge da document.cookie),
//      secure in produzione.
//   4) Aggiorniamo il cookie crm-saved-accounts col refresh token ruotato.
//   5) Per sicurezza, puliamo eventuali chunk vecchi (.0..N) di una sessione
//      precedente piu' grande.
// ============================================================

const CHUNK_SIZE = 3180; // come @supabase/ssr/dist/module/utils/chunker.js
const SUPABASE_COOKIE_MAX_AGE = 60 * 60 * 24 * 400; // 400g (default ssr)

function projectRef(url: string): string {
  return new URL(url).hostname.split(".")[0];
}

function stringToBase64URL(str: string): string {
  return Buffer.from(str, "utf-8").toString("base64url");
}

function supabaseAuthCookieOptions() {
  return {
    httpOnly: false, // ssr default: il browser client deve poterlo leggere
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SUPABASE_COOKIE_MAX_AGE,
  };
}

function parseSavedAccountsFromHeader(cookieHeader: string): SavedAccount[] {
  const map = new Map<string, string>();
  for (const part of cookieHeader.split(/;\s*/)) {
    if (!part) continue;
    const eq = part.indexOf("=");
    if (eq < 0) continue;
    const name = part.slice(0, eq);
    const value = part.slice(eq + 1);
    map.set(name, decodeURIComponent(value));
  }
  const raw = map.get(SAVED_ACCOUNTS_COOKIE);
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr.filter(
      (a): a is SavedAccount =>
        a != null &&
        typeof a.id === "string" &&
        typeof a.email === "string" &&
        typeof a.refresh_token === "string"
    );
  } catch {
    return [];
  }
}

function chunkCookieValue(value: string): string[] {
  if (encodeURIComponent(value).length <= CHUNK_SIZE) {
    return [value];
  }
  const chunks: string[] = [];
  let remaining = value;
  while (remaining.length > 0) {
    let sliceLen = Math.min(remaining.length, CHUNK_SIZE);
    while (
      sliceLen > 0 &&
      encodeURIComponent(remaining.slice(0, sliceLen)).length > CHUNK_SIZE
    ) {
      sliceLen--;
    }
    if (sliceLen <= 0) sliceLen = 1;
    chunks.push(remaining.slice(0, sliceLen));
    remaining = remaining.slice(sliceLen);
  }
  return chunks;
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  // Legge i saved-accounts direttamente dall'header Cookie della request:
  // niente cookies() di next/headers, niente conflitto fra due sink di cookie.
  const cookieHeader = req.headers.get("cookie") ?? "";
  const savedAccounts = parseSavedAccountsFromHeader(cookieHeader);
  const saved = savedAccounts.find((a) => a.id === id);
  if (!saved) {
    return NextResponse.json({ error: "account_not_saved" }, { status: 404 });
  }

  // 1) Scambia il refresh token col token endpoint di gotrue.
  const tokenRes = await fetch(`${url}/auth/v1/token?grant_type=refresh_token`, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ refresh_token: saved.refresh_token }),
  });
  if (!tokenRes.ok) {
    const detailText = await tokenRes.text().catch(() => "");
    // Rimuoviamo l'account dai salvati SOLO se il token e' invalidato per
    // davvero (400/401). Su errori transitori (5xx/429) lasciamo intatto.
    if (tokenRes.status === 400 || tokenRes.status === 401) {
      const rest = savedAccounts.filter((a) => a.id !== id);
      const errRes = NextResponse.json(
        { error: "refresh_failed", detail: detailText.slice(0, 200) },
        { status: 401 }
      );
      if (rest.length === 0) {
        errRes.cookies.set(SAVED_ACCOUNTS_COOKIE, "", {
          ...savedAccountsCookieOptions(),
          maxAge: 0,
        });
      } else {
        errRes.cookies.set(
          SAVED_ACCOUNTS_COOKIE,
          JSON.stringify(rest),
          savedAccountsCookieOptions()
        );
      }
      return errRes;
    }
    return NextResponse.json(
      {
        error: "refresh_failed_transient",
        status: tokenRes.status,
        detail: detailText.slice(0, 200),
      },
      { status: 502 }
    );
  }

  const newSession = (await tokenRes.json()) as {
    access_token: string;
    refresh_token: string;
    expires_in?: number;
    token_type?: string;
    user?: unknown;
  };
  if (!newSession.access_token || !newSession.refresh_token) {
    return NextResponse.json({ error: "invalid_token_response" }, { status: 502 });
  }

  // 2) Costruisci il payload Supabase nel formato che @supabase/ssr riconosce.
  const expiresIn = newSession.expires_in ?? 3600;
  const expiresAt = Math.floor(Date.now() / 1000) + expiresIn;
  const sessionJson = JSON.stringify({
    access_token: newSession.access_token,
    refresh_token: newSession.refresh_token,
    expires_at: expiresAt,
    expires_in: expiresIn,
    token_type: newSession.token_type ?? "bearer",
    user: newSession.user ?? null,
    provider_token: null,
    provider_refresh_token: null,
  });
  const cookieValue = "base64-" + stringToBase64URL(sessionJson);
  const cookieName = `sb-${projectRef(url)}-auth-token`;

  // 3) Build response + scrivi i cookie auth.
  const response = NextResponse.json({ ok: true, redirect: "/dashboard" });
  const opts = supabaseAuthCookieOptions();

  const chunks = chunkCookieValue(cookieValue);
  if (chunks.length === 1) {
    // Singolo cookie col nome base.
    response.cookies.set(cookieName, chunks[0], opts);
    // Pulisci eventuali chunk vecchi (.0..4) di una sessione precedente
    // piu' grande, altrimenti combineChunks dell'ssr leggerebbe valori misti.
    for (let i = 0; i < 5; i++) {
      response.cookies.set(`${cookieName}.${i}`, "", { ...opts, maxAge: 0 });
    }
  } else {
    chunks.forEach((c, i) => {
      response.cookies.set(`${cookieName}.${i}`, c, opts);
    });
    // Pulisci chunk extra dello stato precedente (fino a 8) + il single name.
    for (let i = chunks.length; i < 8; i++) {
      response.cookies.set(`${cookieName}.${i}`, "", { ...opts, maxAge: 0 });
    }
    response.cookies.set(cookieName, "", { ...opts, maxAge: 0 });
  }

  // 4) Aggiorna il cookie saved-accounts col refresh token ruotato.
  const updatedSaved = savedAccounts.map((a) =>
    a.id === id ? { ...a, refresh_token: newSession.refresh_token } : a
  );
  response.cookies.set(
    SAVED_ACCOUNTS_COOKIE,
    JSON.stringify(updatedSaved),
    savedAccountsCookieOptions()
  );

  return response;
}
