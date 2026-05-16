"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  FileText,
  Plus,
  ChevronRight,
  ChevronDown,
  EyeOff,
  FileSpreadsheet,
  Receipt,
} from "lucide-react";
import { toast } from "sonner";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import type { Invoice, InvoiceStatus } from "@/types/database.types";
import { EmptyState } from "@/components/ui/EmptyState";

const STATUS_LABELS: Record<InvoiceStatus, string> = {
  bozza: "Bozza",
  inviato: "Inviato",
  accettato: "Accettato",
  rifiutato: "Rifiutato",
  pagato: "Pagato",
  scaduto: "Scaduto",
};

const STATUS_COLORS: Record<InvoiceStatus, string> = {
  bozza: "text-text-muted bg-bg-hover",
  inviato: "text-blue-400 bg-blue-500/10",
  accettato: "text-emerald-400 bg-emerald-500/10",
  rifiutato: "text-red-400 bg-red-500/10",
  pagato: "text-accent bg-accent/10",
  scaduto: "text-yellow-400 bg-yellow-500/10",
};

interface Props {
  caseId: string;
  invoices: Invoice[];
}

export function InvoicesPanel({ caseId, invoices }: Props) {
  const router = useRouter();
  const [creating, setCreating] = useState<"preventivo" | "fattura" | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function onClick(e: MouseEvent) {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    window.addEventListener("mousedown", onClick);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onClick);
      window.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  async function createNew(kind: "preventivo" | "fattura") {
    setMenuOpen(false);
    setCreating(kind);
    try {
      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ case_id: caseId, kind }),
      });
      if (!res.ok) {
        const text = await res.text();
        toast.error("Creazione fallita", { description: text });
        return;
      }
      const { id } = (await res.json()) as { id: string };
      router.push(`/invoices/${id}`);
    } finally {
      setCreating(null);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-text-muted uppercase tracking-wide">
          <FileText className="w-3.5 h-3.5" />
          Preventivi e fatture
          <span className="text-text-subtle">({invoices.length})</span>
        </div>
        <div ref={menuRef} className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            disabled={creating !== null}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            className="btn-primary py-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            {creating === "preventivo"
              ? "Creazione preventivo..."
              : creating === "fattura"
                ? "Creazione fattura..."
                : "Preventivo / Fattura"}
            <ChevronDown className="w-3.5 h-3.5 -mr-0.5" />
          </button>

          {menuOpen && (
            <div
              role="menu"
              className="absolute right-0 top-full mt-1 w-52 bg-bg-card border border-border rounded-md shadow-card-hover overflow-hidden z-30 animate-fade-in"
            >
              <button
                type="button"
                role="menuitem"
                onClick={() => createNew("preventivo")}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-left text-sm hover:bg-bg-hover transition-colors"
              >
                <FileSpreadsheet className="w-4 h-4 text-text-muted shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="font-medium">Preventivo</div>
                  <div className="text-[10px] text-text-subtle">
                    Numerazione PREV-{new Date().getFullYear()}-…
                  </div>
                </div>
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => createNew("fattura")}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-left text-sm hover:bg-bg-hover transition-colors border-t border-border"
              >
                <Receipt className="w-4 h-4 text-accent shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="font-medium">Fattura</div>
                  <div className="text-[10px] text-text-subtle">
                    Numerazione FATT-{new Date().getFullYear()}-…
                  </div>
                </div>
              </button>
            </div>
          )}
        </div>
      </div>

      {invoices.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="Nessun preventivo o fattura"
          description="Creane uno per generare il PDF da inviare al cliente."
        />
      ) : (
        <div className="space-y-1.5">
          {invoices.map((inv) => (
            <Link
              key={inv.id}
              href={`/invoices/${inv.id}`}
              className="flex items-center gap-3 p-2.5 rounded-md bg-bg-hover/50 border border-border hover:bg-bg-hover transition-colors"
            >
              <FileText className="w-4 h-4 text-text-muted shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="text-xs font-medium truncate">
                  {inv.kind === "preventivo" ? "Preventivo" : "Fattura"} {inv.number}
                </div>
                <div className="text-[10px] text-text-subtle">
                  Emesso {formatDate(inv.issued_at)}
                </div>
              </div>
              <span
                className={cn(
                  "text-[10px] font-medium px-1.5 py-0.5 rounded inline-flex items-center gap-1",
                  STATUS_COLORS[inv.status]
                )}
                title="Stato interno, non visibile al cliente"
              >
                <EyeOff className="w-2.5 h-2.5" />
                {STATUS_LABELS[inv.status]}
              </span>
              <span className="text-xs tabular-nums shrink-0 min-w-[80px] text-right">
                {formatCurrency(inv.total)}
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-text-subtle shrink-0" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
