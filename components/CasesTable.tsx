"use client";

import { useMemo, useState } from "react";
import { Plus, Search, Phone, Mail } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { CASE_STATUS_LABELS, CASE_STATUS_ORDER } from "@/lib/constants";
import { CaseStatusBadge } from "./CaseStatusBadge";
import { formatCurrency, formatDate, initials } from "@/lib/utils";
import {
  customerFormSchema,
  vehicleFormSchema,
  caseFormSchema,
  type CustomerFormValues,
  type VehicleFormInputValues,
} from "@/lib/schemas";
import { CustomerPanel } from "./case/CustomerPanel";
import { VehiclePanel } from "./case/VehiclePanel";
import { CasePanel } from "./case/CasePanel";
import type { Case, CaseStatus } from "@/types/database.types";

export type CaseWithRelations = Case & {
  customers: {
    id: string;
    full_name: string;
    phone: string | null;
    email: string | null;
  } | null;
  vehicles: { make: string | null; model: string | null; plate: string | null } | null;
};

export function CasesTable({
  initialCases,
}: {
  initialCases: CaseWithRelations[];
}) {
  const router = useRouter();
  const [cases] = useState<CaseWithRelations[]>(initialCases);
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
        c.vehicles?.make?.toLowerCase().includes(q) ||
        c.vehicles?.model?.toLowerCase().includes(q) ||
        c.vehicles?.plate?.toLowerCase().includes(q) ||
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
          <button onClick={() => setShowNew(true)} className="btn-primary" type="button">
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
                <th className="text-left text-xs font-medium text-text-muted px-5 py-3">Contatti</th>
                <th className="text-left text-xs font-medium text-text-muted px-5 py-3">Veicolo</th>
                <th className="text-left text-xs font-medium text-text-muted px-5 py-3">Assicurazione</th>
                <th className="text-left text-xs font-medium text-text-muted px-5 py-3">Stato</th>
                <th className="text-left text-xs font-medium text-text-muted px-5 py-3">Prezzo</th>
                <th className="text-left text-xs font-medium text-text-muted px-5 py-3">Aperta</th>
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
                      {[c.vehicles?.make, c.vehicles?.model].filter(Boolean).join(" ") || "—"}
                      {c.vehicles?.plate && (
                        <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-bg-hover font-mono">
                          {c.vehicles.plate}
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

const emptyVehicle: VehicleFormInputValues = {
  make: null,
  model: null,
  plate: null,
  year: null,
  color: null,
  vin: null,
  notes: null,
};

function NewCaseModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [customer, setCustomer] = useState<CustomerFormValues>({
    full_name: "",
    phone: null,
    email: null,
  });
  const [vehicle, setVehicle] = useState<VehicleFormInputValues>(emptyVehicle);
  const [caseForm, setCaseForm] = useState({
    status: "preventivo" as CaseStatus,
    insurance_company: null as string | null,
    description: null as string | null,
    price: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setErrors({});
    const customerResult = customerFormSchema.safeParse(customer);
    const vehicleHasAny = Object.values(vehicle).some((v) => v !== null && v !== "");
    const vehicleResult = vehicleHasAny
      ? vehicleFormSchema.safeParse(vehicle)
      : { success: true as const, data: null };
    const caseResult = caseFormSchema.safeParse(caseForm);

    const flat: Record<string, string> = {};
    if (!customerResult.success) {
      for (const i of customerResult.error.issues) flat[`customer.${String(i.path[0])}`] = i.message;
    }
    if (!vehicleResult.success) {
      for (const i of vehicleResult.error.issues) flat[`vehicle.${String(i.path[0])}`] = i.message;
    }
    if (!caseResult.success) {
      for (const i of caseResult.error.issues) flat[`case.${String(i.path[0])}`] = i.message;
    }
    if (Object.keys(flat).length > 0) {
      setErrors(flat);
      toast.error("Controlla i campi evidenziati");
      return;
    }
    if (!customerResult.success || !caseResult.success || !vehicleResult.success) return;

    setSaving(true);
    try {
      const { data: customerRow, error: custErr } = await supabase
        .from("customers")
        .insert(customerResult.data)
        .select()
        .single();
      if (custErr || !customerRow) throw new Error(custErr?.message ?? "Errore cliente");

      let vehicleId: string | null = null;
      if (vehicleResult.data) {
        const { data: vehRow, error: vehErr } = await supabase
          .from("vehicles")
          .insert({ ...vehicleResult.data, customer_id: customerRow.id })
          .select()
          .single();
        if (vehErr) throw new Error(`Veicolo: ${vehErr.message}`);
        vehicleId = vehRow?.id ?? null;
      }

      const { data: caseRow, error: caseErr } = await supabase
        .from("cases")
        .insert({
          customer_id: customerRow.id,
          vehicle_id: vehicleId,
          status: caseResult.data.status,
          insurance_company: caseResult.data.insurance_company,
          description: caseResult.data.description,
          price: caseResult.data.price,
        })
        .select()
        .single();
      if (caseErr || !caseRow) throw new Error(caseErr?.message ?? "Errore pratica");

      toast.success("Pratica creata");
      onCreated(caseRow.id);
    } catch (e) {
      toast.error("Creazione fallita", {
        description: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setSaving(false);
    }
  }

  function clearError(path: string) {
    if (!errors[path]) return;
    setErrors((prev) => {
      const next = { ...prev };
      delete next[path];
      return next;
    });
  }

  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="card w-full max-w-lg max-h-[90vh] overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-border">
          <h2 className="text-base font-semibold">Nuova pratica</h2>
          <p className="text-xs text-text-subtle mt-0.5">Compila i dati cliente, veicolo e pratica.</p>
        </div>
        <div className="p-5 space-y-6">
          <CustomerPanel
            values={customer}
            errors={{
              full_name: errors["customer.full_name"],
              phone: errors["customer.phone"],
              email: errors["customer.email"],
            }}
            onChange={(patch) => {
              setCustomer((c) => ({ ...c, ...patch }));
              for (const k of Object.keys(patch) as string[]) clearError(`customer.${k}`);
            }}
          />
          <VehiclePanel
            values={vehicle}
            errors={{
              make: errors["vehicle.make"],
              model: errors["vehicle.model"],
              plate: errors["vehicle.plate"],
              year: errors["vehicle.year"],
              color: errors["vehicle.color"],
              vin: errors["vehicle.vin"],
            }}
            onChange={(patch) => {
              setVehicle((v) => ({ ...v, ...patch }));
              for (const k of Object.keys(patch) as string[]) clearError(`vehicle.${k}`);
            }}
            vehicles={[]}
            selectedVehicleId={null}
            onSelectVehicle={() => undefined}
          />
          <CasePanel
            values={caseForm}
            errors={{
              status: errors["case.status"],
              insurance_company: errors["case.insurance_company"],
              description: errors["case.description"],
              price: errors["case.price"],
            }}
            onChange={(patch) => {
              setCaseForm((c) => ({ ...c, ...patch }));
              for (const k of Object.keys(patch) as string[]) clearError(`case.${k}`);
            }}
          />
        </div>
        <div className="px-5 py-3 border-t border-border flex justify-end gap-2">
          <button onClick={onClose} className="btn-secondary" type="button">
            Annulla
          </button>
          <button onClick={handleSave} disabled={saving} className="btn-primary" type="button">
            {saving ? "Salvataggio..." : "Crea pratica"}
          </button>
        </div>
      </div>
    </div>
  );
}
