import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

/**
 * Callback unificato per email confirmation Supabase.
 * Gestisce due flow:
 *  - token_hash + type (cross-device, OTP based) → verifyOtp
 *  - code (PKCE, same-device) → exchangeCodeForSession
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const errorParam = searchParams.get("error") || searchParams.get("error_description");

  if (errorParam) {
    return NextResponse.redirect(
      `${origin}/auth/email-confirmed?error=${encodeURIComponent(errorParam)}`
    );
  }

  const supabase = await createClient();

  // 1) Token hash flow (cross-device, raccomandato)
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type,
    });
    if (error) {
      return NextResponse.redirect(
        `${origin}/auth/email-confirmed?error=${encodeURIComponent(error.message)}`
      );
    }
    return NextResponse.redirect(`${origin}/auth/email-confirmed`);
  }

  // 2) PKCE code flow (same-device)
  const code = searchParams.get("code");
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return NextResponse.redirect(
        `${origin}/auth/email-confirmed?error=${encodeURIComponent(error.message)}`
      );
    }
    return NextResponse.redirect(`${origin}/auth/email-confirmed`);
  }

  return NextResponse.redirect(
    `${origin}/auth/email-confirmed?error=missing_token`
  );
}
