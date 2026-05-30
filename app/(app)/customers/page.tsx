import { createClient } from "@/lib/supabase/server";
import { CustomersTable } from "@/components/CustomersTable";
import type { CaseStatus } from "@/types/database.types";

export const dynamic = "force-dynamic";

// Una pratica è "chiusa" solo quando liquidata (incassata). Tutto il resto —
// produzione, controllo titolare, completata, consegnata — resta "in corso".
const OPEN_STATUSES: CaseStatus[] = [
  "preparazione",
  "verniciatura",
  "finitura",
  "controllo_titolare",
  "completata",
  "consegnata",
];
const CLOSED_STATUSES: CaseStatus[] = ["liquidato"];

export interface CustomerRow {
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  created_at: string;
  vehicles_count: number;
  cases_open_count: number;
  cases_closed_count: number;
  revenue_total: number;
  last_activity_at: string;
}

export default async function CustomersPage() {
  const supabase = await createClient();

  const { data } = await supabase
    .from("customers")
    .select(
      "id, full_name, phone, email, created_at, vehicles(id), cases(id, status, price, created_at)"
    )
    .order("created_at", { ascending: false });

  const rows: CustomerRow[] = (data ?? []).map((c) => {
    const cases = (c.cases ?? []) as Array<{
      status: CaseStatus;
      price: number | null;
      created_at: string;
    }>;
    const openCount = cases.filter((k) => OPEN_STATUSES.includes(k.status)).length;
    const closedCount = cases.filter((k) => CLOSED_STATUSES.includes(k.status)).length;
    const revenue = cases.reduce((acc, k) => acc + Number(k.price ?? 0), 0);
    const latestCase = cases
      .map((k) => k.created_at)
      .sort()
      .pop();
    return {
      id: c.id,
      full_name: c.full_name,
      phone: c.phone,
      email: c.email,
      created_at: c.created_at,
      vehicles_count: (c.vehicles ?? []).length,
      cases_open_count: openCount,
      cases_closed_count: closedCount,
      revenue_total: revenue,
      last_activity_at: latestCase ?? c.created_at,
    };
  });

  return <CustomersTable rows={rows} />;
}
