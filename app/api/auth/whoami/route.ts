import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Endpoint diagnostico: dopo lo switch, l'utente apre /api/auth/whoami in una
// scheda e vede esattamente cosa il server riceve dai cookie e cosa Supabase
// pensa dell'utente. Utile per capire perche' il middleware lo rispedisce a
// /login: se i cookie sb-* arrivano e supabase.auth.getUser() ritorna user
// allora il problema e' altrove (eg. caching, runtime); se non arrivano allora
// la response del POST switch non li sta scrivendo davvero.
export async function GET(req: Request) {
  const rawCookies = req.headers.get("cookie") ?? "";
  const cookieNames = rawCookies
    .split(/;\s*/)
    .map((p) => p.split("=")[0])
    .filter(Boolean);

  // Conteggio dimensione dei cookie sb-*.
  const sbCookies = cookieNames.filter((n) => n.startsWith("sb-"));
  const sbCookiesPreview = sbCookies.map((name) => {
    const re = new RegExp(
      `(?:^|;\\s*)${name.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&")}=([^;]*)`
    );
    const m = rawCookies.match(re);
    const val = m ? decodeURIComponent(m[1]) : "";
    return {
      name,
      length: val.length,
      startsWith: val.slice(0, 24),
    };
  });

  let userInfo: unknown = null;
  let userError: string | null = null;
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getUser();
    userInfo = data?.user ? { id: data.user.id, email: data.user.email } : null;
    userError = error?.message ?? null;
  } catch (e) {
    userError = e instanceof Error ? e.message : String(e);
  }

  return NextResponse.json({
    cookieNames,
    sbCookies: sbCookiesPreview,
    sbCount: sbCookies.length,
    hasSavedAccounts: cookieNames.includes("crm-saved-accounts"),
    user: userInfo,
    userError,
    note: "Se sbCount=0 dopo aver cliccato l'avatar: il Set-Cookie non e' arrivato al browser. Se sbCount>0 ma user=null: cookie presente ma non valido (formato/scadenza).",
  });
}
