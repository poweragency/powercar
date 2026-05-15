import { createClient } from "@/lib/supabase/server";
import { CalendarView } from "@/components/calendar/CalendarView";

export const dynamic = "force-dynamic";

export default async function CalendarPage() {
  const supabase = await createClient();

  const [{ data: appointments }, { data: customersRaw }, { data: cases }] =
    await Promise.all([
      supabase
        .from("appointments")
        .select("*")
        .order("starts_at", { ascending: true }),
      // Solo clienti con almeno una pratica (inner join nasconde gli orfani)
      supabase
        .from("customers")
        .select("id, full_name, cases!inner(id)")
        .order("full_name"),
      supabase.from("cases").select("id, customer_id"),
    ]);

  const customers =
    customersRaw?.map(({ id, full_name }) => ({ id, full_name })) ?? [];

  return (
    <CalendarView
      initialAppointments={appointments ?? []}
      customers={customers}
      cases={cases ?? []}
    />
  );
}
