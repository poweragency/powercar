import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/AppShell";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("workshop_name, full_name, logo_url")
    .eq("id", user.id)
    .single();

  const isAdmin = user.app_metadata?.is_admin === true;

  return (
    <AppShell
      userEmail={user.email ?? ""}
      workshopName={profile?.workshop_name ?? "La mia carrozzeria"}
      logoUrl={profile?.logo_url ?? null}
      isAdmin={isAdmin}
    >
      {children}
    </AppShell>
  );
}
