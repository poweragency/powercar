import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CaseDetail } from "@/components/CaseDetail";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function CaseDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: caseData } = await supabase
    .from("cases")
    .select("*, customers(id, full_name, phone, email)")
    .eq("id", id)
    .single();

  if (!caseData) notFound();

  const [{ data: documents }, { data: notes }] = await Promise.all([
    supabase
      .from("documents")
      .select("*")
      .eq("case_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("notes")
      .select("*")
      .eq("case_id", id)
      .order("created_at", { ascending: false }),
  ]);

  return (
    <CaseDetail
      initialCase={caseData}
      initialDocuments={documents ?? []}
      initialNotes={notes ?? []}
    />
  );
}
