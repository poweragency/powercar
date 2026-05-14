import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/Sidebar";

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
    .select("workshop_name, full_name")
    .eq("id", user.id)
    .single();

  return (
    <div className="flex h-screen bg-bg">
      <Sidebar
        userEmail={user.email ?? ""}
        workshopName={profile?.workshop_name ?? "La mia carrozzeria"}
      />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
