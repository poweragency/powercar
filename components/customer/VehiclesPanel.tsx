"use client";

import { useState } from "react";
import { Car, Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { useConfirm } from "@/components/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { VehicleFormModal } from "./VehicleFormModal";
import type { Vehicle } from "@/types/database.types";

interface Props {
  customerId: string;
  initialVehicles: Vehicle[];
}

export function VehiclesPanel({ customerId, initialVehicles }: Props) {
  const supabase = createClient();
  const confirm = useConfirm();
  const [vehicles, setVehicles] = useState<Vehicle[]>(initialVehicles);
  const [editing, setEditing] = useState<Vehicle | "new" | null>(null);

  async function handleDelete(v: Vehicle) {
    const ok = await confirm({
      title: "Eliminare la vettura?",
      description: `${[v.make, v.model, v.plate].filter(Boolean).join(" · ") || "Veicolo"} — operazione non reversibile.`,
      confirmLabel: "Elimina",
      variant: "danger",
    });
    if (!ok) return;
    const { error } = await supabase.from("vehicles").delete().eq("id", v.id);
    if (error) {
      toast.error("Eliminazione fallita", { description: error.message });
      return;
    }
    setVehicles((prev) => prev.filter((x) => x.id !== v.id));
    toast.success("Vettura eliminata");
  }

  return (
    <>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-text-muted uppercase tracking-wide">
          <Car className="w-3.5 h-3.5" />
          Vetture
          <span className="text-text-subtle">({vehicles.length})</span>
        </div>
        <button
          type="button"
          onClick={() => setEditing("new")}
          className="btn-primary py-1.5"
        >
          <Plus className="w-3.5 h-3.5" />
          Aggiungi vettura
        </button>
      </div>

      {vehicles.length === 0 ? (
        <EmptyState
          icon={Car}
          title="Nessuna vettura"
          description="Aggiungi le auto del cliente per collegarle alle pratiche."
        />
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-bg-hover/50">
                <th className="text-left text-xs font-medium text-text-muted px-4 py-2.5">
                  Marca / Modello
                </th>
                <th className="text-left text-xs font-medium text-text-muted px-4 py-2.5">
                  Targa
                </th>
                <th className="text-left text-xs font-medium text-text-muted px-4 py-2.5">
                  Anno
                </th>
                <th className="text-left text-xs font-medium text-text-muted px-4 py-2.5">
                  Colore
                </th>
                <th className="text-right text-xs font-medium text-text-muted px-4 py-2.5 w-20" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {vehicles.map((v) => (
                <tr key={v.id} className="hover:bg-bg-hover transition-colors">
                  <td className="px-4 py-2.5">
                    {[v.make, v.model].filter(Boolean).join(" ") || "—"}
                  </td>
                  <td className="px-4 py-2.5">
                    {v.plate ? (
                      <span className="text-[11px] px-1.5 py-0.5 rounded bg-bg-hover font-mono">
                        {v.plate}
                      </span>
                    ) : (
                      <span className="text-text-subtle">—</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-text-muted text-xs tabular-nums">
                    {v.year ?? "—"}
                  </td>
                  <td className="px-4 py-2.5 text-text-muted text-xs">
                    {v.color ?? "—"}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <div className="inline-flex gap-1">
                      <button
                        type="button"
                        onClick={() => setEditing(v)}
                        className="p-1.5 rounded text-text-muted hover:text-text hover:bg-bg-card"
                        title="Modifica"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(v)}
                        className="p-1.5 rounded text-text-muted hover:text-status-danger hover:bg-status-danger/10"
                        title="Elimina"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <VehicleFormModal
          customerId={customerId}
          initial={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={(v) => {
            setVehicles((prev) => {
              const idx = prev.findIndex((x) => x.id === v.id);
              if (idx === -1) return [...prev, v];
              const next = [...prev];
              next[idx] = v;
              return next;
            });
            setEditing(null);
          }}
        />
      )}
    </>
  );
}
