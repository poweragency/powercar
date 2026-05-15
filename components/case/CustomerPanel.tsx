"use client";

import { Field, Section } from "./Field";
import type { CustomerFormValues } from "@/lib/schemas";

interface Props {
  values: CustomerFormValues;
  errors?: Partial<Record<keyof CustomerFormValues, string>>;
  onChange: (patch: Partial<CustomerFormValues>) => void;
}

export function CustomerPanel({ values, errors, onChange }: Props) {
  return (
    <Section title="Cliente">
      <Field label="Nome e cognome *" htmlFor="customer-name" error={errors?.full_name}>
        <input
          id="customer-name"
          value={values.full_name}
          onChange={(e) => onChange({ full_name: e.target.value })}
          className="input-base"
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Telefono" htmlFor="customer-phone" error={errors?.phone}>
          <input
            id="customer-phone"
            type="tel"
            value={values.phone ?? ""}
            onChange={(e) => onChange({ phone: e.target.value || null })}
            className="input-base"
          />
        </Field>
        <Field label="Email" htmlFor="customer-email" error={errors?.email}>
          <input
            id="customer-email"
            type="email"
            value={values.email ?? ""}
            onChange={(e) => onChange({ email: e.target.value || null })}
            className="input-base"
          />
        </Field>
      </div>
    </Section>
  );
}
