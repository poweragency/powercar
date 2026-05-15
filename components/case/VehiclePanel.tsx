"use client";

import { Plus } from "lucide-react";
import { Field, Section } from "./Field";
import type { VehicleFormInputValues } from "@/lib/schemas";
import type { Vehicle } from "@/types/database.types";

interface Props {
  values: VehicleFormInputValues;
  errors?: Partial<Record<keyof VehicleFormInputValues, string>>;
  onChange: (patch: Partial<VehicleFormInputValues>) => void;
  vehicles: Vehicle[];
  selectedVehicleId: string | null;
  onSelectVehicle: (id: string | null) => void;
}

export function VehiclePanel({
  values,
  errors,
  onChange,
  vehicles,
  selectedVehicleId,
  onSelectVehicle,
}: Props) {
  const hasMultiple = vehicles.length > 0;

  return (
    <Section
      title="Veicolo"
      description={
        hasMultiple
          ? "Seleziona uno dei veicoli del cliente o aggiungine uno nuovo."
          : undefined
      }
    >
      {hasMultiple && (
        <Field label="Veicolo collegato">
          <div className="flex gap-2">
            <select
              value={selectedVehicleId ?? "__new__"}
              onChange={(e) =>
                onSelectVehicle(e.target.value === "__new__" ? null : e.target.value)
              }
              className="input-base flex-1"
            >
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {[v.make, v.model, v.plate].filter(Boolean).join(" · ") ||
                    "Veicolo senza dati"}
                </option>
              ))}
              <option value="__new__">+ Aggiungi nuovo veicolo</option>
            </select>
          </div>
        </Field>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Field label="Marca" htmlFor="vehicle-make" error={errors?.make}>
          <input
            id="vehicle-make"
            value={values.make ?? ""}
            onChange={(e) => onChange({ make: e.target.value || null })}
            className="input-base"
            placeholder="Fiat"
          />
        </Field>
        <Field label="Modello" htmlFor="vehicle-model" error={errors?.model}>
          <input
            id="vehicle-model"
            value={values.model ?? ""}
            onChange={(e) => onChange({ model: e.target.value || null })}
            className="input-base"
            placeholder="Panda"
          />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Targa" htmlFor="vehicle-plate" error={errors?.plate}>
          <input
            id="vehicle-plate"
            value={values.plate ?? ""}
            onChange={(e) =>
              onChange({ plate: e.target.value.toUpperCase() || null })
            }
            className="input-base font-mono"
            placeholder="AB123CD"
          />
        </Field>
        <Field label="Anno" htmlFor="vehicle-year" error={errors?.year}>
          <input
            id="vehicle-year"
            type="number"
            value={values.year ?? ""}
            onChange={(e) => onChange({ year: e.target.value || null })}
            className="input-base"
            placeholder="2020"
            min={1900}
            max={new Date().getFullYear() + 1}
          />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Colore" htmlFor="vehicle-color" error={errors?.color}>
          <input
            id="vehicle-color"
            value={values.color ?? ""}
            onChange={(e) => onChange({ color: e.target.value || null })}
            className="input-base"
            placeholder="Bianco"
          />
        </Field>
        <Field label="Telaio (VIN)" htmlFor="vehicle-vin" error={errors?.vin}>
          <input
            id="vehicle-vin"
            value={values.vin ?? ""}
            onChange={(e) =>
              onChange({ vin: e.target.value.toUpperCase() || null })
            }
            className="input-base font-mono"
            placeholder="WAUZZZ..."
          />
        </Field>
      </div>
      {selectedVehicleId === null && hasMultiple && (
        <div className="text-[11px] text-accent flex items-center gap-1">
          <Plus className="w-3 h-3" /> Verrà creato un nuovo veicolo al salvataggio.
        </div>
      )}
    </Section>
  );
}
