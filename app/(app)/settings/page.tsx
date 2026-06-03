import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SettingsForm } from "@/components/SettingsForm";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) notFound();

  // Solo l'owner del workshop accede alle Impostazioni (dati fiscali, FB Ads,
  // logo, ecc.). I dipendenti non vedono nemmeno la voce nel menu, ma blocchiamo
  // anche l'accesso diretto via URL.
  if (profile.role !== "owner") redirect("/dashboard");

  // Il verify token (da mostrare per la config del webhook Meta) e lo stato del
  // page access token arrivano da una RPC owner-only: i token non sono più
  // leggibili direttamente da workshops/profiles (hardening audit #2).
  const { data: fbSecrets } = await supabase.rpc("get_workshop_fb_secrets");
  const secret = Array.isArray(fbSecrets) ? fbSecrets[0] : null;

  return (
    <SettingsForm
      initialProfile={profile}
      userEmail={user.email ?? ""}
      fbVerifyToken={secret?.fb_verify_token ?? "—"}
      hasAccessToken={secret?.has_access_token ?? false}
    />
  );
}
