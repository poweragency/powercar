"use client";

import { useEffect, useState } from "react";
import { X, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { LEAD_STATUS_LABELS, LEAD_STATUS_ORDER } from "@/lib/constants";
import type { Lead, LeadStatus, Note } from "@/types/database.types";
import { formatDateTime } from "@/lib/utils";

interface Props {
  lead: Lead | null; // null = nuovo
  onClose: () => void;
  onSaved: () => void;
}

export function LeadModal({ lead, onClose, onSaved }: Props) {
  const supabase = createClient();
  const [fullName, setFullName] = useState(lead?.full_name ?? "");
  const [phone, setPhone] = useState(lead?.phone ?? "");
  const [email, setEmail] = useState(lead?.email ?? "");
  const [message, setMessage] = useState(lead?.message ?? "");
  const [status, setStatus] = useState<LeadStatus>(lead?.status ?? "nuovo");
  const [notes, setNotes] = useState<Note[]>([]);
  const [newNote, setNewNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!lead) return;
    supabase
      .from("notes")
      .select("*")
      .eq("lead_id", lead.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => data && setNotes(data));
  }, [lead, supabase]);

  async function handleSave() {
    if (!fullName.trim()) {
      setError("Il nome è obbligatorio");
      return;
    }
    setSaving(true);
    setError(null);

    if (lead) {
      const { error } = await supabase
        .from("leads")
        .update({
          full_name: fullName,
          phone: phone || null,
          email: email || null,
          message: message || null,
          status,
        })
        .eq("id", lead.id);
      if (error) {
        setError(error.message);
        setSaving(false);
        return;
      }
    } else {
      const { error } = await supabase.from("leads").insert({
        full_name: fullName,
        phone: phone || null,
        email: email || null,
        message: message || null,
        status,
        source: "manual",
      });
      if (error) {
        setError(error.message);
        setSaving(false);
        return;
      }
    }
    onSaved();
  }

  async function handleDelete() {
    if (!lead) return;
    if (!confirm("Eliminare definitivamente questo lead?")) return;
    const { error } = await supabase.from("leads").delete().eq("id", lead.id);
    if (error) {
      alert("Errore: " + error.message);
      return;
    }
    onSaved();
  }

  async function handleAddNote() {
    if (!lead || !newNote.trim()) return;
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from("notes")
      .insert({ lead_id: lead.id, body: newNote.trim(), author_id: user?.id ?? null })
      .select()
      .single();
    if (error) {
      alert("Errore: " + error.message);
      return;
    }
    if (data) setNotes([data, ...notes]);
    setNewNote("");
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
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <h2 className="text-base font-semibold">
            {lead ? "Modifica lead" : "Nuovo lead"}
          </h2>
          <button onClick={onClose} className="text-text-muted hover:text-text">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <Field label="Nome *">
            <input
              type="text"
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

          <Field label="Messaggio / Note">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              className="input-base resize-none"
              placeholder="Dettagli sul lead..."
            />
          </Field>

          <Field label="Stato">
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as LeadStatus)}
              className="input-base"
            >
              {LEAD_STATUS_ORDER.map((s) => (
                <option key={s} value={s}>
                  {LEAD_STATUS_LABELS[s]}
                </option>
              ))}
            </select>
            {status === "cliente" && lead?.status !== "cliente" && (
              <p className="text-xs text-accent mt-1.5">
                Salvando, verrà creato automaticamente un cliente e una pratica.
              </p>
            )}
          </Field>

          {error && (
            <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-md p-2.5">
              {error}
            </div>
          )}

          {lead && (
            <div className="border-t border-border pt-4">
              <h3 className="text-sm font-semibold mb-2">Note</h3>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddNote()}
                  placeholder="Aggiungi una nota..."
                  className="input-base"
                />
                <button onClick={handleAddNote} className="btn-secondary shrink-0">
                  Aggiungi
                </button>
              </div>
              <div className="mt-3 space-y-2 max-h-40 overflow-auto">
                {notes.map((n) => (
                  <div key={n.id} className="bg-bg-hover rounded-md p-2.5">
                    <div className="text-xs text-text">{n.body}</div>
                    <div className="text-[10px] text-text-subtle mt-1">
                      {formatDateTime(n.created_at)}
                    </div>
                  </div>
                ))}
                {notes.length === 0 && (
                  <div className="text-xs text-text-subtle text-center py-2">
                    Nessuna nota
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="px-5 py-3 border-t border-border flex items-center justify-between">
          {lead ? (
            <button
              onClick={handleDelete}
              className="btn-ghost text-red-400 hover:text-red-300"
            >
              <Trash2 className="w-4 h-4" />
              Elimina
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <button onClick={onClose} className="btn-secondary">
              Annulla
            </button>
            <button onClick={handleSave} disabled={saving} className="btn-primary">
              {saving ? "Salvataggio..." : "Salva"}
            </button>
          </div>
        </div>
      </div>
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
