"use client";

import { useMemo, useState } from "react";
import { Plus, Search, Phone, Mail } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { CASE_STATUS_LABELS, CASE_STATUS_ORDER } from "@/lib/constants";
import { CaseStatusBadge } from "./CaseStatusBadge";
import { formatCurrency, formatDate, initials } from "@/lib/utils";
import type { Case, CaseStatus } from "@/types/database.types";

type CaseWithCustomer = Case & {
  customers: {
    id: string;
    full_name: string;
    phone: string | null;
    email: string | null;
  } | null;
};

export function CasesTable({
  initialCases,
}: {
  initialCases: CaseWithCustomer[];
}) {
  const router = useRouter();
  const [cases] = useState<CaseWithCustomer[]>(initialCases);
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
        c.customers?.phone?.toLowerCase().includes(q) ||
        c.customers?.email?.toLowerCase().includes(q) ||
        c.vehicle_make?.toLowerCase().includes(q) ||
        c.vehicle_model?.toLowerCase().includes(q) ||
        c.vehicle_plate?.toLowerCase().includes(q) ||
        c.insurance_company?.toLowerCase().includes(q)
      );
    });
  }, [cases, search, statusFilter]);

  return (
    <div className="h-full flex flex-col">
      <div className="px-8 py-4 border-b border-border flex items-center gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold">Pratiche</h1>
          <p className="text-xs text-text-subtle">
            {cases.length} pratic{cases.length === 1 ? "a" : "he"} totali
          </p>
        </div>

        <div className="ml-auto flex items-center gap-3 flex-wrap">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as CaseStatus | "all")}
            className="input-base w-44"
          >
            <option value="all">Tutti gli stati</option>
            {CASE_STATUS_ORDER.map((s) => (
              <option key={s} value={s}>
                {CASE_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
          <div className="relative">
            <Search
              className="w-4 h-4 text-text-subtle absolute left-2.5 top-1/2 -translate-y-1/2"
              strokeWidth={2}
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cerca cliente, targa, assicurazione..."
              className="input-base pl-8 w-72"
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
                <th className="text-left text-xs font-medium text-text-muted px-5 py-3">
                  Cliente
                </th>
                <th className="text-left text-xs font-medium text-text-muted px-5 py-3">
                  Contatti
                </th>
                <th className="text-left text-xs font-medium text-text-muted px-5 py-3">
                  Veicolo
                </th>
                <th className="text-left text-xs font-medium text-text-muted px-5 py-3">
                  Assicurazione
                </th>
                <th className="text-left text-xs font-medium text-text-muted px-5 py-3">
                  Stato
                </th>
                <th className="text-left text-xs font-medium text-text-muted px-5 py-3">
                  Prezzo
                </th>
                <th className="text-left text-xs font-medium text-text-muted px-5 py-3">
                  Aperta
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center text-sm text-text-subtle py-10">
                    {cases.length === 0
                      ? "Nessuna pratica. Sposta un lead in 'Cliente' nel Kanban o crea una nuova pratica."
                      : "Nessun risultato."}
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
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-7 h-7 rounded-full bg-accent/20 text-accent text-[11px] font-medium flex items-center justify-center shrink-0">
                          {initials(c.customers?.full_name ?? "?")}
                        </div>
                        <span className="text-sm font-medium truncate">
                          {c.customers?.full_name ?? "—"}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <div className="space-y-0.5">
                        {c.customers?.phone && (
                          <div className="flex items-center gap-1.5 text-xs text-text-muted">
                            <Phone className="w-3 h-3" strokeWidth={2} />
                            {c.customers.phone}
                          </div>
                        )}
                        {c.customers?.email && (
                          <div className="flex items-center gap-1.5 text-xs text-text-muted">
                            <Mail className="w-3 h-3" strokeWidth={2} />
                            <span className="truncate max-w-[180px]">
                              {c.customers.email}
                            </span>
                          </div>
                        )}
                        {!c.customers?.phone && !c.customers?.email && (
                          <span className="text-xs text-text-subtle">—</span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-sm text-text-muted">
                      {[c.vehicle_make, c.vehicle_model].filter(Boolean).join(" ") || "—"}
                      {c.vehicle_plate && (
                        <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-bg-hover font-mono">
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
                    <td className="px-5 py-3 text-sm tabular-nums">
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
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const supabase = createClient();
  // Cliente
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  // Pratica
  const [vehicleMake, setVehicleMake] = useState("");
  const [vehicleModel, setVehicleModel] = useState("");
  const [vehiclePlate, setVehiclePlate] = useState("");
  const [insurance, setInsurance] = useState("");
  const [price, setPrice] = useState("");
  const [status, setStatus] = useState<CaseStatus>("preventivo");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    if (!fullName.trim()) {
      setError("Il nome cliente è obbligatorio");
      return;
    }
    setSaving(true);
    setError(null);

    // 1) Crea cliente
    const { data: customer, error: custErr } = await supabase
      .from("customers")
      .insert({
        full_name: fullName,
        phone: phone || null,
        email: email || null,
      })
      .select()
      .single();

    if (custErr || !customer) {
      setError(custErr?.message ?? "Errore creazione cliente");
      setSaving(false);
      return;
    }

    // 2) Crea pratica
    const { data: c, error: caseErr } = await supabase
      .from("cases")
      .insert({
        customer_id: customer.id,
        vehicle_make: vehicleMake || null,
        vehicle_model: vehicleModel || null,
        vehicle_plate: vehiclePlate || null,
        insurance_company: insurance || null,
        price: price ? Number(price) : null,
        status,
      })
      .select()
      .single();

    if (caseErr || !c) {
      setError(caseErr?.message ?? "Errore creazione pratica");
      setSaving(false);
      return;
    }

    onCreated(c.id);
  }

  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="card w-full max-w-lg max-h-[90vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-border">
          <h2 className="text-base font-semibold">Nuova pratica</h2>
          <p className="text-xs text-text-subtle mt-0.5">Compili tutto in un'unica schermata</p>
        </div>
        <div className="p-5 space-y-5">
          {/* Cliente */}
          <Section title="Cliente">
            <Field label="Nome e cognome *">
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="input-base"
                placeholder="Mario Rossi"
                autoFocus
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Telefono">
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="input-base"
                  placeholder="333 1234567"
                />
              </Field>
              <Field label="Email">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-base"
                  placeholder="mario@email.it"
                />
              </Field>
            </div>
          </Section>

          {/* Veicolo */}
          <Section title="Veicolo">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Marca">
                <input
                  value={vehicleMake}
                  onChange={(e) => setVehicleMake(e.target.value)}
                  className="input-base"
                  placeholder="Fiat"
                />
              </Field>
              <Field label="Modello">
                <input
                  value={vehicleModel}
                  onChange={(e) => setVehicleModel(e.target.value)}
                  className="input-base"
                  placeholder="Panda"
                />
              </Field>
            </div>
            <Field label="Targa">
              <input
                value={vehiclePlate}
                onChange={(e) => setVehiclePlate(e.target.value.toUpperCase())}
                className="input-base font-mono"
                placeholder="AB123CD"
              />
            </Field>
          </Section>

          {/* Pratica */}
          <Section title="Pratica">
            <Field label="Assicurazione">
              <input
                value={insurance}
                onChange={(e) => setInsurance(e.target.value)}
                className="input-base"
                placeholder="Generali"
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Prezzo (€)">
                <input
                  type="number"
                  step="0.01"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="input-base"
                  placeholder="0.00"
                />
              </Field>
              <Field label="Stato">
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as CaseStatus)}
                  className="input-base"
                >
                  {CASE_STATUS_ORDER.map((s) => (
                    <option key={s} value={s}>
                      {CASE_STATUS_LABELS[s]}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          </Section>

          {error && (
            <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-md p-2.5">
              {error}
            </div>
          )}
        </div>
        <div className="px-5 py-3 border-t border-border flex justify-end gap-2">
          <button onClick={onClose} className="btn-secondary">
            Annulla
          </button>
          <button onClick={handleSave} disabled={saving} className="btn-primary">
            {saving ? "Salvataggio..." : "Crea pratica"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-[11px] font-semibold uppercase tracking-wide text-text-subtle mb-2.5">
        {title}
      </h3>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-text-muted mb-1.5">{label}</label>
      {children}
    </div>
  );
}
