import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { InvoiceEditor } from "@/components/invoice/InvoiceEditor";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function InvoicePage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: invoice } = await supabase
    .from("invoices")
    .select("*")
    .eq("id", id)
    .single();

  if (!invoice) notFound();

  const [{ data: items }, { data: customer }, { data: profile }, { data: caseRow }] =
    await Promise.all([
      supabase
        .from("invoice_items")
        .select("*")
        .eq("invoice_id", id)
        .order("position", { ascending: true }),
      supabase
        .from("customers")
        .select("id, full_name, phone, email")
        .eq("id", invoice.customer_id)
        .single(),
      supabase.from("profiles").select("*").eq("id", user.id).single(),
      supabase
        .from("cases")
        .select("vehicle_id")
        .eq("id", invoice.case_id)
        .single(),
    ]);

  if (!customer || !profile) notFound();

  let vehicle: { make: string | null; model: string | null; plate: string | null } | null = null;
  if (caseRow?.vehicle_id) {
    const { data: v } = await supabase
      .from("vehicles")
      .select("make, model, plate")
      .eq("id", caseRow.vehicle_id)
      .single();
    vehicle = v;
  }

  return (
    <InvoiceEditor
      invoice={invoice}
      items={items ?? []}
      customer={customer}
      vehicle={vehicle}
      profile={profile}
      userEmail={user.email ?? ""}
    />
  );
}
