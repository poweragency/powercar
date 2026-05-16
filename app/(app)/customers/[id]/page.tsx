import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CustomerDetail } from "@/components/CustomerDetail";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function CustomerDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: customer } = await supabase
    .from("customers")
    .select("*")
    .eq("id", id)
    .single();

  if (!customer) notFound();

  return <CustomerDetail initialCustomer={customer} />;
}
