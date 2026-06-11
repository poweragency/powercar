import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimitDistributed, getClientIp } from "@/lib/rate-limit";
import { reportError } from "@/lib/error-reporting";

/**
 * Collega automaticamente la Pagina FB di un workshop ai lead (onboarding).
 *
 * Automatizza i passi 3-4-5 del runbook ONBOARDING-CLIENTE.md, che prima erano
 * manuali (Graph API Explorer + curl + copia-incolla del token):
 *   3. genera il Page Access Token dalla pagina, usando il System User token
 *   4. iscrive la pagina all'app PowerCar sul campo `leadgen`
 *   5. salva `fb_page_id` + `fb_page_access_token` sul workshop dell'owner
 *
 * I passi 1-2 (portare la pagina nel BM Poweragency + assegnarla al System User)
 * restano manuali su Meta: se non sono stati fatti, il passo 3 fallisce e
 * restituiamo un messaggio chiaro. I campi manuali in /settings restano come
 * fallback se questo flusso non va a buon fine.
 *
 * Sicurezza:
 * - FB_SYSTEM_USER_TOKEN è la "chiave madre": solo server, mai esposta al client.
 * - L'update del workshop passa per la sessione utente (RLS owner-only), come il
 *   salvataggio manuale del form.
 */

const GRAPH = "https://graph.facebook.com/v21.0";

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = await rateLimitDistributed(`fb-connect:${ip}`, {
    windowMs: 60_000,
    max: 20,
  });
  if (!rl.ok) {
    return NextResponse.json(
      { ok: false, error: "Troppe richieste, riprova tra poco." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
    );
  }

  const systemUserToken = process.env.FB_SYSTEM_USER_TOKEN;
  if (!systemUserToken) {
    console.error("[fb-connect] FB_SYSTEM_USER_TOKEN non impostata");
    return NextResponse.json(
      { ok: false, error: "Collegamento automatico non configurato sul server." },
      { status: 503 }
    );
  }

  // Auth: solo l'owner del workshop può collegare la sua pagina.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Non autenticato." }, { status: 401 });
  }
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, workshop_id")
    .eq("id", user.id)
    .single();
  if (!profile || profile.role !== "owner" || !profile.workshop_id) {
    return NextResponse.json({ ok: false, error: "Non autorizzato." }, { status: 403 });
  }

  // Input
  let pageId: string | undefined;
  try {
    const body = await req.json();
    pageId = typeof body?.page_id === "string" ? body.page_id.trim() : undefined;
  } catch {
    return NextResponse.json({ ok: false, error: "Body non valido." }, { status: 400 });
  }
  if (!pageId || !/^\d{5,}$/.test(pageId)) {
    return NextResponse.json(
      { ok: false, error: "ID Pagina non valido (deve essere un numero)." },
      { status: 400 }
    );
  }

  try {
    // --- Passo 3: Page Access Token (+ nome pagina per conferma) ---
    const tokRes = await fetch(
      `${GRAPH}/${pageId}?fields=access_token,name&access_token=${encodeURIComponent(
        systemUserToken
      )}`
    );
    const tokJson = await tokRes.json();
    if (!tokRes.ok || !tokJson?.access_token) {
      // Caso tipico: pagina non nel BM o non assegnata al System User.
      const fbMsg = tokJson?.error?.message ?? "";
      console.warn("[fb-connect] page token error:", tokRes.status, fbMsg);
      return NextResponse.json(
        {
          ok: false,
          error:
            "Impossibile leggere la pagina. Verifica che sia stata aggiunta al " +
            "Business Manager Poweragency e assegnata al System User (passi 1-2 su Meta).",
          detail: fbMsg || undefined,
        },
        { status: 422 }
      );
    }
    const pageToken: string = tokJson.access_token;
    const pageName: string = tokJson.name ?? "Pagina Facebook";

    // --- Passo 4: iscrizione all'app sul campo leadgen ---
    const subRes = await fetch(`${GRAPH}/${pageId}/subscribed_apps`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        subscribed_fields: "leadgen",
        access_token: pageToken,
      }),
    });
    const subJson = await subRes.json();
    if (!subRes.ok || subJson?.success !== true) {
      const fbMsg = subJson?.error?.message ?? "";
      console.warn("[fb-connect] subscribe error:", subRes.status, fbMsg);
      return NextResponse.json(
        {
          ok: false,
          error:
            "Pagina letta ma iscrizione ai lead fallita. Riprova o usa il campo manuale.",
          detail: fbMsg || undefined,
        },
        { status: 422 }
      );
    }

    // --- Passo 5: salva su workshop (RLS owner) ---
    const { error: wsError } = await supabase
      .from("workshops")
      .update({ fb_page_id: pageId, fb_page_access_token: pageToken })
      .eq("id", profile.workshop_id);
    if (wsError) {
      console.error("[fb-connect] workshop update error:", wsError.message);
      return NextResponse.json(
        { ok: false, error: "Pagina collegata su Meta ma salvataggio nel CRM fallito." },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, pageName });
  } catch (err) {
    reportError(err, { scope: "fb-connect-page" });
    return NextResponse.json(
      { ok: false, error: "Errore imprevisto nel collegamento. Riprova." },
      { status: 500 }
    );
  }
}
