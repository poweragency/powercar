import { createClient } from "@/lib/supabase/server";
import { CustomersTable } from "@/components/CustomersTable";

export const dynamic = "force-dynamic";

export default async function CustomersPage() {
  const supabase = await createClient();
  const { data: customers } = await supabase
    .from("customers")
    .select("*, cases(id, status)")
    .order("created_at", { ascending: false });

  return <CustomersTable initialCustomers={customers ?? []} />;
}
