import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireOwner } from "@/lib/owner";
import { createAdminClient } from "@/lib/supabase/admin";

const bodySchema = z.object({
  email: z.string().email("Email non valida"),
  password: z.string().min(6, "Password troppo corta (min. 6 caratteri)"),
  full_name: z.string().trim().min(1, "Nome obbligatorio").max(120),
});

/**
 * POST /api/team/users
 * Crea un nuovo dipendente (staff) linkato al workshop dell'owner caller.
 * Body: { email, password, full_name }
 */
export async function POST(req: NextRequest) {
  const auth = await requireOwner();
  if (auth instanceof NextResponse) return auth;

  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Body non valido" },
      { status: 400 }
    );
  }
  const body = parsed.data;

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.createUser({
    email: body.email,
    password: body.password,
    email_confirm: true,
    user_metadata: {
      full_name: body.full_name,
      role: "staff",
      workshop_id: auth.workshopId,
    },
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({
    id: data.user?.id,
    email: data.user?.email,
    full_name: body.full_name,
  });
}
