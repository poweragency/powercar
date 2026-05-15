import { createClient } from "@/lib/supabase/server";
import { CASE_STATUS_COLORS, CASE_STATUS_LABELS, LEAD_STATUS_LABELS } from "@/lib/constants";
import { formatCurrency, formatDateTime, initials } from "@/lib/utils";
import {
  KanbanSquare,
  Users,
  FolderKanban,
  CheckCircle2,
  Euro,
  TrendingUp,
  Wallet,
  CalendarClock,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";
import type { CaseStatus } from "@/types/database.types";
import { Sparkline } from "@/components/dashboard/Sparkline";
import { RevenueChart } from "@/components/dashboard/RevenueChart";
import { StatusDonut } from "@/components/dashboard/StatusDonut";

export const dynamic = "force-dynamic";

const DAYS_WINDOW = 30;

function bucketByDay(
  items: Array<{ created_at: string; value?: number }>,
  days: number
): number[] {
  const buckets = new Array<number>(days).fill(0);
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (days - 1));
  for (const it of items) {
    const d = new Date(it.created_at);
    const dayIdx = Math.floor((d.getTime() - start.getTime()) / 86_400_000);
    if (dayIdx >= 0 && dayIdx < days) {
      buckets[dayIdx] += it.value ?? 1;
    }
  }
  return buckets;
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("workshop_name")
    .eq("id", user!.id)
    .single();

  const [
    { count: leadsCount },
    { count: customersCount },
    { data: openCases },
    { data: completedCases },
    { data: allLeadsForSpark },
    { data: allCustomersForSpark },
    { data: revenueRows },
    { data: latestLeads },
    { data: latestCases },
    { data: todayAppointments },
  ] = await Promise.all([
    supabase.from("leads").select("*", { count: "exact", head: true }),
    supabase.from("customers").select("*", { count: "exact", head: true }),
    supabase
      .from("cases")
      .select("status, created_at")
      .in("status", ["preventivo", "attesa_pezzi", "lavorazione"]),
    supabase
      .from("cases")
      .select("status, created_at")
      .in("status", ["completata", "consegnata"]),
    supabase.from("leads").select("created_at"),
    supabase.from("customers").select("created_at"),
    supabase.from("cases").select("price, status, created_at"),
    supabase.from("leads").select("*").order("created_at", { ascending: false }).limit(5),
    supabase
      .from("cases")
      .select(
        "id, status, price, created_at, customers(full_name), vehicles(make, model, plate)"
      )
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("appointments")
      .select("id, title, starts_at, kind")
      .gte("starts_at", new Date(new Date().setHours(0, 0, 0, 0)).toISOString())
      .lte("starts_at", new Date(new Date().setHours(23, 59, 59, 999)).toISOString())
      .order("starts_at", { ascending: true })
      .limit(5),
  ]);

  const revenue =
    revenueRows?.reduce((sum, c) => sum + Number(c.price ?? 0), 0) ?? 0;
  const collected =
    revenueRows
      ?.filter((c) => c.status === "consegnata")
      .reduce((sum, c) => sum + Number(c.price ?? 0), 0) ?? 0;

  const leadsSpark = bucketByDay(
    (allLeadsForSpark ?? []).map((l) => ({ created_at: l.created_at })),
    DAYS_WINDOW
  );
  const customersSpark = bucketByDay(
    (allCustomersForSpark ?? []).map((c) => ({ created_at: c.created_at })),
    DAYS_WINDOW
  );
  const openCasesSpark = bucketByDay(
    (openCases ?? []).map((c) => ({ created_at: c.created_at })),
    DAYS_WINDOW
  );
  const completedSpark = bucketByDay(
    (completedCases ?? []).map((c) => ({ created_at: c.created_at })),
    DAYS_WINDOW
  );
  const revenueDaily = bucketByDay(
    (revenueRows ?? []).map((r) => ({
      created_at: r.created_at,
      value: Number(r.price ?? 0),
    })),
    DAYS_WINDOW
  );

  const statusCounts: Record<CaseStatus, number> = {
    preventivo: 0,
    attesa_pezzi: 0,
    lavorazione: 0,
    completata: 0,
    consegnata: 0,
  };
  for (const c of revenueRows ?? []) {
    statusCounts[c.status as CaseStatus] += 1;
  }

  const totalCases = (openCases?.length ?? 0) + (completedCases?.length ?? 0);
  const todayAppointmentsCount = todayAppointments?.length ?? 0;

  const stats = [
    {
      label: "Lead totali",
      value: leadsCount ?? 0,
      icon: KanbanSquare,
      color: "text-blue-400",
      stroke: "rgb(96 165 250)",
      data: leadsSpark,
    },
    {
      label: "Clienti convertiti",
      value: customersCount ?? 0,
      icon: Users,
      color: "text-emerald-400",
      stroke: "rgb(52 211 153)",
      data: customersSpark,
    },
    {
      label: "Pratiche aperte",
      value: openCases?.length ?? 0,
      icon: FolderKanban,
      color: "text-yellow-400",
      stroke: "rgb(250 204 21)",
      data: openCasesSpark,
    },
    {
      label: "Pratiche completate",
      value: completedCases?.length ?? 0,
      icon: CheckCircle2,
      color: "text-accent",
      stroke: "rgb(249 115 22)",
      data: completedSpark,
    },
  ];

  const isEmpty = (leadsCount ?? 0) === 0 && totalCases === 0;
  const workshopName = profile?.workshop_name ?? "tua officina";

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Ciao, {workshopName} 👋</h1>
        <p className="text-sm text-text-muted mt-1">
          {totalCases === 0
            ? "Iniziamo: aggiungi il primo lead o crea una pratica manuale."
            : `Hai ${openCases?.length ?? 0} pratiche aperte${
                todayAppointmentsCount > 0
                  ? ` e ${todayAppointmentsCount} ${todayAppointmentsCount === 1 ? "appuntamento" : "appuntamenti"} oggi`
                  : ""
              }.`}
        </p>
      </div>

      {isEmpty && <EmptyStateGuide />}

      {/* KPI cards con sparkline */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div
              key={s.label}
              className="card p-5 hover:border-border-hover hover:shadow-card-hover transition-all"
            >
              <div className="flex items-center justify-between">
                <div className="text-xs uppercase tracking-wide text-text-muted">
                  {s.label}
                </div>
                <Icon className={`w-4 h-4 ${s.color}`} strokeWidth={2} />
              </div>
              <div className="text-3xl font-semibold mt-3 tabular-nums">{s.value}</div>
              <div className="mt-3 -mb-1">
                <Sparkline data={s.data} stroke={s.stroke} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Fatturato cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div className="card p-5 bg-gradient-to-br from-accent/10 to-transparent border-accent/20 hover:shadow-card-hover transition-all">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-accent/20 flex items-center justify-center shrink-0">
              <Euro className="w-5 h-5 text-accent" strokeWidth={2} />
            </div>
            <div className="min-w-0">
              <div className="text-xs uppercase tracking-wide text-text-muted">
                Fatturato stimato
              </div>
              <div className="text-2xl font-semibold tabular-nums mt-0.5">
                {formatCurrency(revenue)}
              </div>
              <div className="text-[11px] text-text-subtle">
                Somma di tutte le pratiche
              </div>
            </div>
            <TrendingUp className="w-5 h-5 text-accent ml-auto shrink-0" strokeWidth={2} />
          </div>
        </div>

        <div className="card p-5 bg-gradient-to-br from-emerald-500/10 to-transparent border-emerald-500/20 hover:shadow-card-hover transition-all">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-emerald-500/20 flex items-center justify-center shrink-0">
              <Wallet className="w-5 h-5 text-emerald-400" strokeWidth={2} />
            </div>
            <div className="min-w-0">
              <div className="text-xs uppercase tracking-wide text-text-muted">
                Fatturato incassato
              </div>
              <div className="text-2xl font-semibold tabular-nums mt-0.5">
                {formatCurrency(collected)}
              </div>
              <div className="text-[11px] text-text-subtle">
                Solo pratiche consegnate
              </div>
            </div>
            <CheckCircle2
              className="w-5 h-5 text-emerald-400 ml-auto shrink-0"
              strokeWidth={2}
            />
          </div>
        </div>
      </div>

      {/* Grafici fatturato 30gg + status donut */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <div className="card p-5 lg:col-span-2 hover:shadow-card-hover transition-all">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold">Fatturato 30 giorni</h2>
            <span className="text-[11px] text-text-subtle">
              Totale {formatCurrency(revenueDaily.reduce((a, b) => a + b, 0))}
            </span>
          </div>
          <RevenueChart data={revenueDaily} />
        </div>

        <div className="card p-5 hover:shadow-card-hover transition-all">
          <h2 className="text-sm font-semibold mb-3">Pratiche per stato</h2>
          {totalCases > 0 ? (
            <StatusDonut counts={statusCounts} />
          ) : (
            <div className="text-center text-xs text-text-subtle py-8">
              Nessuna pratica.
            </div>
          )}
        </div>
      </div>

      {/* Oggi: appuntamenti */}
      {todayAppointmentsCount > 0 && (
        <div className="card overflow-hidden mb-6 hover:shadow-card-hover transition-all">
          <div className="px-5 py-3 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CalendarClock className="w-4 h-4 text-accent" />
              <h2 className="text-sm font-semibold">Oggi in officina</h2>
              <span className="text-[11px] text-text-subtle">
                ({todayAppointmentsCount})
              </span>
            </div>
            <Link
              href="/calendar"
              className="text-xs text-accent hover:underline inline-flex items-center gap-1"
            >
              Calendario <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="divide-y divide-border">
            {todayAppointments?.map((a) => (
              <div
                key={a.id}
                className="px-5 py-2.5 hover:bg-bg-hover transition-colors flex items-center gap-3"
              >
                <div className="text-sm font-medium tabular-nums text-accent w-14">
                  {new Date(a.starts_at).toLocaleTimeString("it-IT", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
                <div className="text-sm flex-1 truncate">{a.title}</div>
                <div className="text-[10px] uppercase text-text-subtle">{a.kind}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Ultimi lead + pratiche */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card overflow-hidden hover:shadow-card-hover transition-all">
          <div className="px-5 py-3 border-b border-border flex items-center justify-between">
            <h2 className="text-sm font-semibold">Ultimi lead</h2>
            <Link
              href="/leads"
              className="text-xs text-accent hover:underline inline-flex items-center gap-1"
            >
              Tutti <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="divide-y divide-border">
            {latestLeads && latestLeads.length > 0 ? (
              latestLeads.map((lead) => (
                <div
                  key={lead.id}
                  className="px-5 py-3 hover:bg-bg-hover transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 text-[11px] font-medium flex items-center justify-center shrink-0">
                      {initials(lead.full_name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium truncate">
                        {lead.full_name}
                      </div>
                      <div className="text-xs text-text-subtle mt-0.5 truncate">
                        {lead.phone ?? "—"} · {formatDateTime(lead.created_at)}
                      </div>
                    </div>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-bg-hover text-text-muted shrink-0">
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

        <div className="card overflow-hidden hover:shadow-card-hover transition-all">
          <div className="px-5 py-3 border-b border-border flex items-center justify-between">
            <h2 className="text-sm font-semibold">Ultime pratiche</h2>
            <Link
              href="/cases"
              className="text-xs text-accent hover:underline inline-flex items-center gap-1"
            >
              Tutte <ArrowRight className="w-3 h-3" />
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
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-accent/20 text-accent text-[11px] font-medium flex items-center justify-center shrink-0">
                      {initials(c.customers?.full_name ?? "?")}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium truncate">
                        {c.customers?.full_name ?? "—"}
                      </div>
                      <div className="text-xs text-text-subtle mt-0.5 truncate">
                        {[c.vehicles?.make, c.vehicles?.model, c.vehicles?.plate]
                          .filter(Boolean)
                          .join(" · ") || "Auto non specificata"}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span
                        className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                          CASE_STATUS_COLORS[c.status].bg
                        } ${CASE_STATUS_COLORS[c.status].text}`}
                      >
                        {CASE_STATUS_LABELS[c.status]}
                      </span>
                      <div className="text-xs font-medium tabular-nums mt-1">
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

function EmptyStateGuide() {
  return (
    <div className="card p-6 mb-6 bg-gradient-to-br from-accent/10 to-transparent border-accent/30">
      <h2 className="text-base font-semibold mb-1">Benvenuto nel tuo CRM</h2>
      <p className="text-sm text-text-muted mb-4">
        Iniziamo a configurare l&apos;officina e a inserire i primi lead. Bastano due
        minuti.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Link
          href="/settings"
          className="card p-4 border-border hover:border-accent hover:shadow-card-hover transition-all"
        >
          <div className="text-xs uppercase tracking-wide text-text-subtle mb-1">
            1. Profilo
          </div>
          <div className="text-sm font-medium">Compila i dati dell&apos;officina</div>
          <div className="text-xs text-text-muted mt-1">
            P.IVA, indirizzo, IBAN — serviranno nei preventivi.
          </div>
        </Link>
        <Link
          href="/settings"
          className="card p-4 border-border hover:border-accent hover:shadow-card-hover transition-all"
        >
          <div className="text-xs uppercase tracking-wide text-text-subtle mb-1">
            2. Facebook
          </div>
          <div className="text-sm font-medium">Collega le campagne</div>
          <div className="text-xs text-text-muted mt-1">
            Per ricevere i lead in automatico dalle Facebook Ads.
          </div>
        </Link>
        <Link
          href="/leads"
          className="card p-4 border-border hover:border-accent hover:shadow-card-hover transition-all"
        >
          <div className="text-xs uppercase tracking-wide text-text-subtle mb-1">
            3. Lead
          </div>
          <div className="text-sm font-medium">Crea il primo lead</div>
          <div className="text-xs text-text-muted mt-1">
            Inserisci manualmente o attendi i lead da Facebook.
          </div>
        </Link>
      </div>
    </div>
  );
}
