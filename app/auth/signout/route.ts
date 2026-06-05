import { NextResponse } from "next/server";

// Logout per il flusso "saved-accounts Instagram-style":
//   NON chiamiamo /auth/v1/logout di Supabase.
//
// Perche': anche con scope:'local', gotrue revoca il refresh token della
// sessione corrente — che e' esattamente quello che abbiamo memorizzato in
// crm-saved-accounts per il login rapido. Al click successivo sull'avatar
// salvato gotrue rifiuta lo scambio del refresh -> l'account viene rimosso
// dai salvati e l'utente deve ridigitare email+password.
//
// Per il "logout" inteso come "voglio andarmene da questo dispositivo per
// ora" basta cancellare i cookie sb-* locali: il refresh token resta valido
// finche' non scade naturalmente (default 30 giorni di inattivita') o finche'
// non viene usato da un'altra istanza. Cosi' il login rapido continua a
// funzionare. Il cookie crm-saved-accounts viene preservato. Per uscire da un
// account in modo definitivo l'utente puo' rimuoverlo dalla lista (X
// sull'avatar) — quella DELETE pulisce solo il client e il refresh token
// scadra' naturalmente lato Supabase.
export async function POST(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  let ref = "";
  try {
    ref = new URL(supabaseUrl).hostname.split(".")[0];
  } catch {
    ref = "";
  }

  const response = NextResponse.redirect(new URL("/login", request.url), {
    status: 302,
  });

  if (ref) {
    const baseName = `sb-${ref}-auth-token`;
    const opts = {
      httpOnly: false,
      sameSite: "lax" as const,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 0,
    };
    // Cancella cookie base + tutti i possibili chunk.
    response.cookies.set(baseName, "", opts);
    for (let i = 0; i < 8; i++) {
      response.cookies.set(`${baseName}.${i}`, "", opts);
    }
  }

  return response;
}
