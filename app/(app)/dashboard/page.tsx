import { createClient } from "@/lib/supabase/server";
import { CASE_STATUS_LABELS, LEAD_STATUS_LABELS } from "@/lib/constants";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { KanbanSquare, Users, FolderKanban, CheckCircle2, Euro, TrendingUp, Wallet } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createClient();

  const { count: leadsCount } = await supabase
    .from("leads")
    .select("*", { count: "exact", head: true });
  const { count: customersCount } = await supabase
    .from("customers")
    .select("*", { count: "exact", head: true });
  const { count: openCasesCount } = await supabase
    .from("cases")
    .select("*", { count: "exact", head: true })
    .in("status", ["preventivo", "attesa_pezzi", "lavorazione"]);
  const { count: completedCasesCount } = await supabase
    .from("cases")
    .select("*", { count: "exact", head: true })
    .in("status", ["completata", "consegnata"]);
  const { data: revenueRows } = (await supabase
    .from("cases")
    .select("price")) as { data: Array<{ price: number | null }> | null };
  const { data: deliveredRows } = (await supabase
    .from("cases")
    .select("price")
    .eq("status", "consegnata")) as {
    data: Array<{ price: number | null }> | null;
  };
  const { data: latestLeads } = await supabase
    .from("leads")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(5);
  const { data: latestCases } = (await supabase
    .from("cases")
    .select("*, customers(full_name)")
    .order("created_at", { ascending: false })
    .limit(5)) as {
    data: Array<{
      id: string;
      status: import("@/types/database.types").CaseStatus;
      price: number | null;
      vehicle_make: string | null;
      vehicle_model: string | null;
      vehicle_plate: string | null;
      created_at: string;
      customers: { full_name: string } | null;
    }> | null;
  };

  const revenue =
    revenueRows?.reduce((sum, c) => sum + Number(c.price ?? 0), 0) ?? 0;
  const collected =
    deliveredRows?.reduce((sum, c) => sum + Number(c.price ?? 0), 0) ?? 0;

  const stats = [
    { label: "Lead totali", value: leadsCount ?? 0, icon: KanbanSquare, color: "text-blue-400" },
    { label: "Clienti convertiti", value: customersCount ?? 0, icon: Users, color: "text-emerald-400" },
    { label: "Pratiche aperte", value: openCasesCount ?? 0, icon: FolderKanban, color: "text-yellow-400" },
    { label: "Pratiche completate", value: completedCasesCount ?? 0, icon: CheckCircle2, color: "text-accent" },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-sm text-text-muted mt-1">Panoramica della tua officina</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="card p-5">
              <div className="flex items-center justify-between">
                <div className="text-sm text-text-muted">{s.label}</div>
                <Icon className={`w-4 h-4 ${s.color}`} strokeWidth={2} />
              </div>
              <div className="text-3xl font-semibold mt-3 tabular-nums">{s.value}</div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div className="card p-5 bg-gradient-to-br from-accent/10 to-transparent border-accent/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-accent/20 flex items-center justify-center shrink-0">
              <Euro className="w-5 h-5 text-accent" strokeWidth={2} />
            </div>
            <div className="min-w-0">
              <div className="text-sm text-text-muted">Fatturato stimato</div>
              <div className="text-2xl font-semibold tabular-nums">{formatCurrency(revenue)}</div>
              <div className="text-[11px] text-text-subtle">Somma di tutte le pratiche</div>
            </div>
            <TrendingUp className="w-5 h-5 text-accent ml-auto shrink-0" strokeWidth={2} />
          </div>
        </div>

        <div className="card p-5 bg-gradient-to-br from-emerald-500/10 to-transparent border-emerald-500/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-emerald-500/20 flex items-center justify-center shrink-0">
              <Wallet className="w-5 h-5 text-emerald-400" strokeWidth={2} />
            </div>
            <div className="min-w-0">
              <div className="text-sm text-text-muted">Fatturato incassato</div>
              <div className="text-2xl font-semibold tabular-nums">{formatCurrency(collected)}</div>
              <div className="text-[11px] text-text-subtle">Solo pratiche consegnate</div>
            </div>
            <CheckCircle2 className="w-5 h-5 text-emerald-400 ml-auto shrink-0" strokeWidth={2} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card overflow-hidden">
          <div className="px-5 py-3 border-b border-border flex items-center justify-between">
            <h2 className="text-sm font-semibold">Ultimi lead</h2>
            <Link href="/leads" className="text-xs text-accent hover:underline">
              Vedi tutti →
            </Link>
          </div>
          <div className="divide-y divide-border">
            {latestLeads && latestLeads.length > 0 ? (
              latestLeads.map((lead) => (
                <div key={lead.id} className="px-5 py-3 hover:bg-bg-hover transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{lead.full_name}</div>
                      <div className="text-xs text-text-subtle mt-0.5">
                        {lead.phone ?? "—"} · {formatDateTime(lead.created_at)}
                      </div>
                    </div>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-bg-hover text-text-muted shrink-0 ml-3">
                      {LEAD_STATUS_LABELS[lead.status]}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="px-5 py-8 text-center text-sm text-text-subtle">
                Nessun lead ancora.
              </div>
            )}
          </div>
        </div>

        <div className="card overflow-hidden">
          <div className="px-5 py-3 border-b border-border flex items-center justify-between">
            <h2 className="text-sm font-semibold">Ultime pratiche</h2>
            <Link href="/cases" className="text-xs text-accent hover:underline">
              Vedi tutte →
            </Link>
          </div>
          <div className="divide-y divide-border">
            {latestCases && latestCases.length > 0 ? (
              latestCases.map((c) => (
                <Link
                  key={c.id}
                  href={`/cases/${c.id}`}
                  className="block px-5 py-3 hover:bg-bg-hover transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">
                        {c.customers?.full_name ?? "—"}
                      </div>
                      <div className="text-xs text-text-subtle mt-0.5">
                        {[c.vehicle_make, c.vehicle_model, c.vehicle_plate]
                          .filter(Boolean)
                          .join(" · ") || "Auto non specificata"}
                      </div>
                    </div>
                    <div className="text-right shrink-0 ml-3">
                      <div className="text-xs text-text-muted">
                        {CASE_STATUS_LABELS[c.status]}
                      </div>
                      <div className="text-xs font-medium tabular-nums mt-0.5">
                        {formatCurrency(c.price)}
                      </div>
                    </div>
                  </div>
                </Link>
              ))
            ) : (
              <div className="px-5 py-8 text-center text-sm text-text-subtle">
                Nessuna pratica ancora.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
