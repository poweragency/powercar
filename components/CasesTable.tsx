"use client";

import { useMemo, useState } from "react";
import { Plus, Search, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { CASE_STATUS_LABELS, CASE_STATUS_ORDER } from "@/lib/constants";
import { CaseStatusBadge } from "./CaseStatusBadge";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Case, CaseStatus } from "@/types/database.types";

type CaseWithCustomer = Case & { customers: { id: string; full_name: string; phone: string | null } | null };

export function CasesTable({
  initialCases,
  customers,
  filterCustomer,
}: {
  initialCases: CaseWithCustomer[];
  customers: { id: string; full_name: string }[];
  filterCustomer: string | null;
}) {
  const router = useRouter();
  const [cases, setCases] = useState<CaseWithCustomer[]>(initialCases);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<CaseStatus | "all">("all");
  const [showNew, setShowNew] = useState(false);

  const filtered = useMemo(() => {
    return cases.filter((c) => {
      if (statusFilter !== "all" && c.status !== statusFilter) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        c.customers?.full_name.toLowerCase().includes(q) ||
        c.vehicle_make?.toLowerCase().includes(q) ||
        c.vehicle_model?.toLowerCase().includes(q) ||
        c.vehicle_plate?.toLowerCase().includes(q) ||
        c.insurance_company?.toLowerCase().includes(q)
      );
    });
  }, [cases, search, statusFilter]);

  const filteredCustomer = filterCustomer
    ? customers.find((c) => c.id === filterCustomer)
    : null;

  return (
    <div className="h-full flex flex-col">
      <div className="px-8 py-4 border-b border-border flex items-center gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold">Pratiche</h1>
          {filteredCustomer ? (
            <p className="text-xs text-text-subtle flex items-center gap-1">
              Filtrate per cliente: <span className="text-text-muted">{filteredCustomer.full_name}</span>
              <Link href="/cases" className="text-accent hover:underline ml-1">
                <X className="w-3 h-3 inline" /> rimuovi
              </Link>
            </p>
          ) : (
            <p className="text-xs text-text-subtle">{cases.length} pratic{cases.length === 1 ? "a" : "he"} totali</p>
          )}
        </div>

        <div className="ml-auto flex items-center gap-3 flex-wrap">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as CaseStatus | "all")}
            className="input-base w-44"
          >
            <option value="all">Tutti gli stati</option>
            {CASE_STATUS_ORDER.map((s) => (
              <option key={s} value={s}>{CASE_STATUS_LABELS[s]}</option>
            ))}
          </select>
          <div className="relative">
            <Search className="w-4 h-4 text-text-subtle absolute left-2.5 top-1/2 -translate-y-1/2" strokeWidth={2} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cerca..."
              className="input-base pl-8 w-56"
            />
          </div>
          <button onClick={() => setShowNew(true)} className="btn-primary">
            <Plus className="w-4 h-4" strokeWidth={2.5} />
            Nuova pratica
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-8">
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-bg-hover/50">
                <th className="text-left text-xs font-medium text-text-muted px-5 py-3">Cliente</th>
                <th className="text-left text-xs font-medium text-text-muted px-5 py-3">Veicolo</th>
                <th className="text-left text-xs font-medium text-text-muted px-5 py-3">Assicurazione</th>
                <th className="text-left text-xs font-medium text-text-muted px-5 py-3">Stato</th>
                <th className="text-right text-xs font-medium text-text-muted px-5 py-3">Prezzo</th>
                <th className="text-left text-xs font-medium text-text-muted px-5 py-3">Aperta</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center text-sm text-text-subtle py-10">
                    Nessuna pratica.
                  </td>
                </tr>
              ) : (
                filtered.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => router.push(`/cases/${c.id}`)}
                    className="hover:bg-bg-hover transition-colors cursor-pointer"
                  >
                    <td className="px-5 py-3">
                      <div className="text-sm font-medium">{c.customers?.full_name ?? "—"}</div>
                      {c.customers?.phone && (
                        <div className="text-xs text-text-subtle">{c.customers.phone}</div>
                      )}
                    </td>
                    <td className="px-5 py-3 text-sm text-text-muted">
                      {[c.vehicle_make, c.vehicle_model].filter(Boolean).join(" ") || "—"}
                      {c.vehicle_plate && (
                        <span className="ml-2 text-xs px-1.5 py-0.5 rounded bg-bg-hover font-mono">
                          {c.vehicle_plate}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-sm text-text-muted">
                      {c.insurance_company ?? "—"}
                    </td>
                    <td className="px-5 py-3">
                      <CaseStatusBadge status={c.status} />
                    </td>
                    <td className="px-5 py-3 text-sm tabular-nums text-right">
                      {formatCurrency(c.price)}
                    </td>
                    <td className="px-5 py-3 text-xs text-text-muted">
                      {formatDate(c.created_at)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showNew && (
        <NewCaseModal
          customers={customers}
          defaultCustomer={filterCustomer}
          onClose={() => setShowNew(false)}
          onCreated={(id) => {
            setShowNew(false);
            router.push(`/cases/${id}`);
          }}
        />
      )}
    </div>
  );
}

function NewCaseModal({
  customers,
  defaultCustomer,
  onClose,
  onCreated,
}: {
  customers: { id: string; full_name: string }[];
  defaultCustomer: string | null;
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const supabase = createClient();
  const [customerId, setCustomerId] = useState(defaultCustomer ?? "");
  const [vehicleMake, setVehicleMake] = useState("");
  const [vehicleModel, setVehicleModel] = useState("");
  const [vehiclePlate, setVehiclePlate] = useState("");
  const [insurance, setInsurance] = useState("");
  const [price, setPrice] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    if (!customerId) {
      setError("Seleziona un cliente");
      return;
    }
    setSaving(true);
    setError(null);
    const { data, error } = await supabase
      .from("cases")
      .insert({
        customer_id: customerId,
        vehicle_make: vehicleMake || null,
        vehicle_model: vehicleModel || null,
        vehicle_plate: vehiclePlate || null,
        insurance_company: insurance || null,
        price: price ? Number(price) : null,
      })
      .select()
      .single();
    if (error) {
      setError(error.message);
      setSaving(false);
      return;
    }
    if (data) onCreated(data.id);
  }

  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="card w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-border">
          <h2 className="text-base font-semibold">Nuova pratica</h2>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1.5">Cliente *</label>
            <select
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              className="input-base"
            >
              <option value="">Seleziona...</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>{c.full_name}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1.5">Marca</label>
              <input value={vehicleMake} onChange={(e) => setVehicleMake(e.target.value)} className="input-base" placeholder="Fiat" />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1.5">Modello</label>
              <input value={vehicleModel} onChange={(e) => setVehicleModel(e.target.value)} className="input-base" placeholder="Panda" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1.5">Targa</label>
            <input value={vehiclePlate} onChange={(e) => setVehiclePlate(e.target.value.toUpperCase())} className="input-base font-mono" placeholder="AB123CD" />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1.5">Assicurazione</label>
            <input value={insurance} onChange={(e) => setInsurance(e.target.value)} className="input-base" placeholder="Generali" />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1.5">Prezzo (€)</label>
            <input type="number" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} className="input-base" placeholder="0.00" />
          </div>
          {error && (
            <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-md p-2.5">
              {error}
            </div>
          )}
        </div>
        <div className="px-5 py-3 border-t border-border flex justify-end gap-2">
          <button onClick={onClose} className="btn-secondary">Annulla</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary">
            {saving ? "Salvataggio..." : "Crea"}
          </button>
        </div>
      </div>
    </div>
  );
}
