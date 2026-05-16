import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Verifica che il caller sia owner del proprio workshop.
 * Ritorna { userId, workshopId } se ok, altrimenti NextResponse 401/403.
 */
export async function requireOwner(): Promise<
  { userId: string; workshopId: string } | NextResponse
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("workshop_id, role")
    .eq("id", user.id)
    .single();

  if (!profile) return new NextResponse("Profile not found", { status: 404 });
  if (profile.role !== "owner") {
    return new NextResponse("Forbidden — only owner", { status: 403 });
  }

  return { userId: user.id, workshopId: profile.workshop_id };
}
