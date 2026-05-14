import { createClient } from "@/lib/supabase/server";
import { CasesTable } from "@/components/CasesTable";

export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{ customer?: string }>;
}

export default async function CasesPage({ searchParams }: Props) {
  const { customer } = await searchParams;
  const supabase = await createClient();

  let q = supabase
    .from("cases")
    .select("*, customers(id, full_name, phone)")
    .order("created_at", { ascending: false });

  if (customer) q = q.eq("customer_id", customer);

  const { data: cases } = await q;
  const { data: customers } = await supabase
    .from("customers")
    .select("id, full_name")
    .order("full_name");

  return (
    <CasesTable
      initialCases={cases ?? []}
      customers={customers ?? []}
      filterCustomer={customer ?? null}
    />
  );
}
