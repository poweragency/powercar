import { NextResponse, type NextRequest } from "next/server";
import { requireOwner } from "@/lib/owner";
import { createAdminClient } from "@/lib/supabase/admin";

interface Ctx {
  params: Promise<{ id: string }>;
}

/**
 * DELETE /api/team/users/[id]
 * Rimuove un dipendente dal workshop dell'owner caller.
 * Verifica che il target sia uno staff del MEDESIMO workshop.
 */
export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const auth = await requireOwner();
  if (auth instanceof NextResponse) return auth;
  const { id } = await ctx.params;

  if (id === auth.userId) {
    return NextResponse.json(
      { error: "Non puoi eliminare il tuo stesso account" },
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  // Verifica che il target appartenga al workshop dell'owner ed è staff
  const { data: target } = await admin
    .from("profiles")
    .select("workshop_id, role")
    .eq("id", id)
    .single();

  if (!target) {
    return NextResponse.json({ error: "Utente non trovato" }, { status: 404 });
  }
  if (target.workshop_id !== auth.workshopId) {
    return NextResponse.json(
      { error: "Utente non appartiene al tuo workshop" },
      { status: 403 }
    );
  }
  if (target.role !== "staff") {
    return NextResponse.json(
      { error: "Solo gli account staff possono essere rimossi" },
      { status: 400 }
    );
  }

  const { error } = await admin.auth.admin.deleteUser(id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
