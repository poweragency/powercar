"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { vehicleFormSchema, type VehicleFormInputValues } from "@/lib/schemas";
import { Field } from "@/components/case/Field";
import type { Vehicle } from "@/types/database.types";

interface Props {
  customerId: string;
  initial?: Vehicle | null;
  onClose: () => void;
  onSaved: (vehicle: Vehicle) => void;
}

const empty: VehicleFormInputValues = {
  make: null,
  model: null,
  plate: null,
  year: null,
  color: null,
  vin: null,
  notes: null,
};

export function VehicleFormModal({ customerId, initial, onClose, onSaved }: Props) {
  const supabase = createClient();

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const [values, setValues] = useState<VehicleFormInputValues>(
    initial
      ? {
          make: initial.make,
          model: initial.model,
          plate: initial.plate,
          year: initial.year != null ? String(initial.year) : null,
          color: initial.color,
          vin: initial.vin,
          notes: initial.notes,
        }
      : empty
  );
  const [errors, setErrors] = useState<
    Partial<Record<keyof VehicleFormInputValues, string>>
  >({});
  const [saving, setSaving] = useState(false);

  function setField<K extends keyof VehicleFormInputValues>(
    key: K,
    value: VehicleFormInputValues[K]
  ) {
    setValues((v) => ({ ...v, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  }

  async function handleSave() {
    const result = vehicleFormSchema.safeParse(values);
    if (!result.success) {
      const flat: Partial<Record<keyof VehicleFormInputValues, string>> = {};
      for (const issue of result.error.issues) {
        flat[issue.path[0] as keyof VehicleFormInputValues] = issue.message;
      }
      setErrors(flat);
      toast.error("Controlla i campi");
      return;
    }

    setSaving(true);
    if (initial) {
      const { data, error } = await supabase
        .from("vehicles")
        .update(result.data)
        .eq("id", initial.id)
        .select()
        .single();
      setSaving(false);
      if (error || !data) {
        toast.error("Salvataggio fallito", { description: error?.message });
        return;
      }
      toast.success("Vettura aggiornata");
      onSaved(data);
    } else {
      const { data, error } = await supabase
        .from("vehicles")
        .insert({ ...result.data, customer_id: customerId })
        .select()
        .single();
      setSaving(false);
      if (error || !data) {
        toast.error("Salvataggio fallito", { description: error?.message });
        return;
      }
      toast.success("Vettura aggiunta");
      onSaved(data);
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="card w-full max-w-md max-h-[90vh] overflow-auto animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <h2 className="text-base font-semibold">
            {initial ? "Modifica vettura" : "Aggiungi vettura"}
          </h2>
          <button
            onClick={onClose}
            className="text-text-muted hover:text-text"
            type="button"
            aria-label="Chiudi"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Marca" htmlFor="vf-make" error={errors.make}>
              <input
                id="vf-make"
                value={values.make ?? ""}
                onChange={(e) => setField("make", e.target.value || null)}
                className="input-base"
                placeholder="Fiat"
                autoFocus
              />
            </Field>
            <Field label="Modello" htmlFor="vf-model" error={errors.model}>
              <input
                id="vf-model"
                value={values.model ?? ""}
                onChange={(e) => setField("model", e.target.value || null)}
                className="input-base"
                placeholder="Panda"
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Targa" htmlFor="vf-plate" error={errors.plate}>
              <input
                id="vf-plate"
                value={values.plate ?? ""}
                onChange={(e) => setField("plate", e.target.value.toUpperCase() || null)}
                className="input-base font-mono"
                placeholder="AB123CD"
              />
            </Field>
            <Field label="Anno" htmlFor="vf-year" error={errors.year}>
              <input
                id="vf-year"
                type="text"
                inputMode="numeric"
                value={values.year ?? ""}
                onChange={(e) =>
                  setField(
                    "year",
                    e.target.value.replace(/[^\d]/g, "").slice(0, 4) || null
                  )
                }
                className="input-base"
                placeholder="2020"
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Colore" htmlFor="vf-color" error={errors.color}>
              <input
                id="vf-color"
                value={values.color ?? ""}
                onChange={(e) => setField("color", e.target.value || null)}
                className="input-base"
                placeholder="Bianco"
              />
            </Field>
            <Field label="Telaio (VIN)" htmlFor="vf-vin" error={errors.vin}>
              <input
                id="vf-vin"
                value={values.vin ?? ""}
                onChange={(e) => setField("vin", e.target.value.toUpperCase() || null)}
                className="input-base font-mono"
                placeholder="WAUZZZ..."
              />
            </Field>
          </div>
          <Field label="Note" htmlFor="vf-notes" error={errors.notes}>
            <textarea
              id="vf-notes"
              value={values.notes ?? ""}
              onChange={(e) => setField("notes", e.target.value || null)}
              className="input-base resize-y min-h-[60px]"
              rows={2}
              placeholder="Opzionale"
            />
          </Field>
        </div>

        <div className="px-5 py-3 border-t border-border flex justify-end gap-2">
          <button onClick={onClose} className="btn-secondary" type="button">
            Annulla
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-primary"
            type="button"
          >
            {saving ? "Salvataggio..." : initial ? "Salva" : "Aggiungi"}
          </button>
        </div>
      </div>
    </div>
  );
}
