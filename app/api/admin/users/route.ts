import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireAdmin, adminClient, logAdminAction } from "@/lib/admin";

const bodySchema = z.object({
  email: z.string().email("Email non valida"),
  password: z.string().min(6, "Password troppo corta (min. 6 caratteri)"),
  workshop_name: z.string().trim().min(1, "Nome carrozzeria obbligatorio").max(200),
});

/**
 * POST /api/admin/users
 * Crea una nuova officina (auth user + profile via trigger handle_new_user).
 * Body: { email, password, workshop_name }
 */
export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
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

  const admin = adminClient();
  const { data, error } = await admin.auth.admin.createUser({
    email: body.email,
    password: body.password,
    email_confirm: true,
    user_metadata: {
      workshop_name: body.workshop_name,
      full_name: body.workshop_name,
    },
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  await logAdminAction(auth.userId, "create_workshop", data.user?.id, {
    email: body.email,
    workshop_name: body.workshop_name,
  });

  // Il trigger handle_new_user crea già il profile con workshop_name dal metadata.
  return NextResponse.json({ id: data.user?.id, email: data.user?.email });
}
