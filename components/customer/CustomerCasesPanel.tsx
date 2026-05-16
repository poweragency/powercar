"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { FolderKanban, History, ChevronRight } from "lucide-react";
import { CASE_STATUS_LABELS, CASE_STATUS_COLORS } from "@/lib/constants";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import { EmptyState } from "@/components/ui/EmptyState";
import type { CaseStatus } from "@/types/database.types";

const OPEN_STATUSES: CaseStatus[] = ["preventivo", "attesa_pezzi", "lavorazione"];
const CLOSED_STATUSES: CaseStatus[] = ["completata", "consegnata"];

export interface CustomerCase {
  id: string;
  status: CaseStatus;
  price: number | null;
  insurance_company: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
  vehicles: {
    make: string | null;
    model: string | null;
    plate: string | null;
  } | null;
}

type Tab = "open" | "history";

export function CustomerCasesPanel({ cases }: { cases: CustomerCase[] }) {
  const [tab, setTab] = useState<Tab>("open");

  const { open, history } = useMemo(() => {
    return {
      open: cases.filter((c) => OPEN_STATUSES.includes(c.status)),
      history: cases
        .filter((c) => CLOSED_STATUSES.includes(c.status))
        .sort(
          (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
        ),
    };
  }, [cases]);

  const list = tab === "open" ? open : history;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-text-muted uppercase tracking-wide">
          <FolderKanban className="w-3.5 h-3.5" />
          Pratiche
        </div>
        <div className="inline-flex rounded-md border border-border overflow-hidden text-xs">
          <button
            type="button"
            onClick={() => setTab("open")}
            className={cn(
              "px-3 py-1.5 transition-colors inline-flex items-center gap-1.5",
              tab === "open"
                ? "bg-accent/10 text-accent"
                : "text-text-muted hover:text-text hover:bg-bg-hover"
            )}
          >
            <FolderKanban className="w-3 h-3" />
            In corso
            <span
              className={cn(
                "tabular-nums text-[10px] rounded-full px-1.5",
                tab === "open" ? "bg-accent/20" : "bg-bg-hover text-text-subtle"
              )}
            >
              {open.length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setTab("history")}
            className={cn(
              "px-3 py-1.5 transition-colors inline-flex items-center gap-1.5 border-l border-border",
              tab === "history"
                ? "bg-accent/10 text-accent"
                : "text-text-muted hover:text-text hover:bg-bg-hover"
            )}
          >
            <History className="w-3 h-3" />
            Pratiche passate
            <span
              className={cn(
                "tabular-nums text-[10px] rounded-full px-1.5",
                tab === "history" ? "bg-accent/20" : "bg-bg-hover text-text-subtle"
              )}
            >
              {history.length}
            </span>
          </button>
        </div>
      </div>

      {list.length === 0 ? (
        <EmptyState
          icon={tab === "open" ? FolderKanban : History}
          title={tab === "open" ? "Nessuna pratica in corso" : "Nessuna pratica passata"}
          description={
            tab === "open"
              ? "Le pratiche aperte di questo cliente appariranno qui."
              : "Lo storico mostra solo pratiche completate o consegnate."
          }
        />
      ) : (
        <div className="card overflow-hidden">
          <div className="divide-y divide-border">
            {list.map((c) => {
              const vehStr = c.vehicles
                ? [c.vehicles.make, c.vehicles.model, c.vehicles.plate]
                    .filter(Boolean)
                    .join(" · ")
                : null;
              return (
                <Link
                  key={c.id}
                  href={`/cases/${c.id}`}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-bg-hover transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "text-[10px] font-medium px-1.5 py-0.5 rounded",
                          CASE_STATUS_COLORS[c.status].bg,
                          CASE_STATUS_COLORS[c.status].text
                        )}
                      >
                        {CASE_STATUS_LABELS[c.status]}
                      </span>
                      <span className="text-[11px] text-text-subtle">
                        {tab === "history"
                          ? `Chiusa ${formatDate(c.updated_at)}`
                          : `Aperta ${formatDate(c.created_at)}`}
                      </span>
                    </div>
                    <div className="text-sm mt-1 truncate text-text-muted">
                      {vehStr || c.description || "—"}
                    </div>
                    {c.insurance_company && (
                      <div className="text-[11px] text-text-subtle mt-0.5 truncate">
                        Assicurazione: {c.insurance_company}
                      </div>
                    )}
                  </div>
                  <div className="text-sm font-medium tabular-nums shrink-0 text-right">
                    {formatCurrency(c.price)}
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-text-subtle shrink-0" />
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
