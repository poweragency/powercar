"use client";

import { useState } from "react";
import { X, Eye, EyeOff, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { Field } from "@/components/case/Field";

interface Props {
  onClose: () => void;
  onCreated: () => void;
}

function generatePassword(): string {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  let s = "";
  for (let i = 0; i < 10; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

export function CreateStaffModal({ onClose, onCreated }: Props) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState(generatePassword());
  const [showPassword, setShowPassword] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleCreate() {
    setError(null);
    if (!fullName.trim() || !email.trim() || !password) {
      setError("Compila tutti i campi");
      return;
    }
    if (password.length < 6) {
      setError("Password troppo corta (min. 6 caratteri)");
      return;
    }

    setSaving(true);
    const res = await fetch("/api/team/users", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        full_name: fullName.trim(),
        email: email.trim(),
        password,
      }),
    });
    setSaving(false);

    if (!res.ok) {
      const json = (await res.json().catch(() => null)) as { error?: string } | null;
      setError(json?.error ?? `Errore HTTP ${res.status}`);
      return;
    }

    toast.success("Dipendente creato", {
      description: `Credenziali: ${email} / ${password}`,
      duration: 15000,
    });
    onCreated();
  }

  function copyCredentials() {
    const text = `Email: ${email}\nPassword: ${password}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
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
          <h2 className="text-base font-semibold">Aggiungi dipendente</h2>
          <button
            onClick={onClose}
            className="text-text-muted hover:text-text"
            type="button"
            aria-label="Chiudi"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <Field label="Nome e cognome *" htmlFor="cs-name">
            <input
              id="cs-name"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="input-base"
              placeholder="Mario Rossi"
              autoFocus
            />
          </Field>

          <Field label="Email *" htmlFor="cs-email">
            <input
              id="cs-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-base"
              placeholder="mario@officina.it"
              autoComplete="off"
            />
          </Field>

          <Field
            label="Password iniziale *"
            htmlFor="cs-password"
            hint="Comunica le credenziali al dipendente. Potrà cambiarle dopo il primo accesso."
          >
            <div className="flex items-center gap-2 mb-1.5">
              <button
                type="button"
                onClick={() => setPassword(generatePassword())}
                className="text-[11px] text-accent hover:underline ml-auto"
              >
                Genera nuova
              </button>
            </div>
            <div className="relative">
              <input
                id="cs-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-base pr-10 font-mono"
                autoComplete="off"
              />
              <button
                onClick={() => setShowPassword((v) => !v)}
                type="button"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-text-subtle hover:text-text"
                aria-label={showPassword ? "Nascondi password" : "Mostra password"}
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </Field>

          {error && (
            <div className="text-xs text-status-danger bg-status-danger/10 border border-status-danger/20 rounded-md p-2.5">
              {error}
            </div>
          )}
        </div>

        <div className="px-5 py-3 border-t border-border flex justify-between gap-2">
          <button
            type="button"
            onClick={copyCredentials}
            disabled={!email || !password}
            className="btn-ghost disabled:opacity-40 text-xs"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
            {copied ? "Copiate!" : "Copia credenziali"}
          </button>
          <div className="flex gap-2">
            <button onClick={onClose} className="btn-secondary" type="button">
              Annulla
            </button>
            <button
              onClick={handleCreate}
              disabled={saving}
              className="btn-primary"
              type="button"
            >
              {saving ? "Creazione..." : "Crea dipendente"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
