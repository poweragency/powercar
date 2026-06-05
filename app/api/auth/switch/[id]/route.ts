import { NextResponse } from "next/server";
import {
  SAVED_ACCOUNTS_COOKIE,
  savedAccountsCookieOptions,
  type SavedAccount,
} from "@/lib/auth/saved-accounts";

// ============================================================
// Switch all'account salvato — implementazione bare-metal.
//
// Strategia: la chiamata e' una form POST nativa del browser (non fetch JS).
//   - Il browser fa POST a questo endpoint.
//   - Noi rispondiamo con 303 + Set-Cookie sb-* + Set-Cookie saved-accounts.
//   - Il browser commit-a i cookie e segue il Location alla pagina finale.
// Cosi' non c'e' race tra JS (window.location.href) e commit dei Set-Cookie.
//
// Cookie sb-{ref}-auth-token scritti manualmente nello stesso formato che
// @supabase/ssr (v0.5+) usa normalmente:
//   nome:  sb-{ref}-auth-token              (chunked .0, .1 se > 3180 byte)
//   valore: "base64-" + base64url(JSON.stringify(session))
// con campi sessione: access_token, refresh_token, expires_at, expires_in,
// token_type, user.
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
    httpOnly: false, // ssr default: il browser client lo legge da document.cookie
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

function redirectWith(
  req: Request,
  path: string,
  cookieMutations: (res: NextResponse) => void
): NextResponse {
  // 303 = See Other: il browser fa GET sulla Location anche se la request
  // originale era POST. Esattamente il flusso che vogliamo.
  const url = new URL(path, req.url);
  const res = NextResponse.redirect(url, { status: 303 });
  cookieMutations(res);
  return res;
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const cookieHeader = req.headers.get("cookie") ?? "";
  const savedAccounts = parseSavedAccountsFromHeader(cookieHeader);
  const saved = savedAccounts.find((a) => a.id === id);
  if (!saved) {
    console.error("[switch] account not saved on this device", { id });
    return redirectWith(req, "/login?switch=not_saved", () => {});
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
    console.error("[switch] gotrue refresh failed", {
      status: tokenRes.status,
      detail: detailText.slice(0, 300),
    });
    if (tokenRes.status === 400 || tokenRes.status === 401) {
      const rest = savedAccounts.filter((a) => a.id !== id);
      return redirectWith(req, "/login?switch=expired", (res) => {
        if (rest.length === 0) {
          res.cookies.set(SAVED_ACCOUNTS_COOKIE, "", {
            ...savedAccountsCookieOptions(),
            maxAge: 0,
          });
        } else {
          res.cookies.set(
            SAVED_ACCOUNTS_COOKIE,
            JSON.stringify(rest),
            savedAccountsCookieOptions()
          );
        }
      });
    }
    return redirectWith(req, "/login?switch=error", () => {});
  }

  const newSession = (await tokenRes.json()) as {
    access_token: string;
    refresh_token: string;
    expires_in?: number;
    token_type?: string;
    user?: unknown;
  };
  if (!newSession.access_token || !newSession.refresh_token) {
    console.error("[switch] invalid gotrue payload");
    return redirectWith(req, "/login?switch=invalid", () => {});
  }

  // 2) Costruisci il payload nel formato che @supabase/ssr riconosce.
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

  console.log("[switch] writing auth cookie", {
    name: cookieName,
    valueLen: cookieValue.length,
    chunked: encodeURIComponent(cookieValue).length > CHUNK_SIZE,
  });

  // 3) Redirect 303 a /dashboard con i cookie auth scritti sopra.
  return redirectWith(req, "/dashboard", (response) => {
    const opts = supabaseAuthCookieOptions();
    const chunks = chunkCookieValue(cookieValue);

    if (chunks.length === 1) {
      response.cookies.set(cookieName, chunks[0], opts);
      // Pulisci chunk vecchi (.0..4) di sessioni precedenti piu' grandi.
      for (let i = 0; i < 5; i++) {
        response.cookies.set(`${cookieName}.${i}`, "", { ...opts, maxAge: 0 });
      }
    } else {
      chunks.forEach((c, i) => {
        response.cookies.set(`${cookieName}.${i}`, c, opts);
      });
      for (let i = chunks.length; i < 8; i++) {
        response.cookies.set(`${cookieName}.${i}`, "", { ...opts, maxAge: 0 });
      }
      response.cookies.set(cookieName, "", { ...opts, maxAge: 0 });
    }

    // 4) Cookie saved-accounts ruotato.
    const updatedSaved = savedAccounts.map((a) =>
      a.id === id ? { ...a, refresh_token: newSession.refresh_token } : a
    );
    response.cookies.set(
      SAVED_ACCOUNTS_COOKIE,
      JSON.stringify(updatedSaved),
      savedAccountsCookieOptions()
    );
  });
}
