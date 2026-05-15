"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Upload,
  FileText,
  Image as ImageIcon,
  Trash2,
  Download,
  Save,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { CASE_STATUS_LABELS, CASE_STATUS_ORDER } from "@/lib/constants";
import { CaseStatusBadge } from "./CaseStatusBadge";
import { formatDateTime } from "@/lib/utils";
import type { Case, CaseStatus, Document, Note } from "@/types/database.types";
import { cn } from "@/lib/utils";

type CaseWithCustomer = Case & {
  customers: { id: string; full_name: string; phone: string | null; email: string | null } | null;
};

interface Props {
  initialCase: CaseWithCustomer;
  initialDocuments: Document[];
  initialNotes: Note[];
}

export function CaseDetail({ initialCase, initialDocuments, initialNotes }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const [caseData, setCaseData] = useState(initialCase);
  const [documents, setDocuments] = useState<Document[]>(initialDocuments);
  const [notes, setNotes] = useState<Note[]>(initialNotes);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [newNote, setNewNote] = useState("");
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Form fields - cliente
  const [fullName, setFullName] = useState(caseData.customers?.full_name ?? "");
  const [phone, setPhone] = useState(caseData.customers?.phone ?? "");
  const [email, setEmail] = useState(caseData.customers?.email ?? "");

  // Form fields - pratica
  const [vehicleMake, setVehicleMake] = useState(caseData.vehicle_make ?? "");
  const [vehicleModel, setVehicleModel] = useState(caseData.vehicle_model ?? "");
  const [vehiclePlate, setVehiclePlate] = useState(caseData.vehicle_plate ?? "");
  const [insurance, setInsurance] = useState(caseData.insurance_company ?? "");
  const [price, setPrice] = useState(caseData.price?.toString() ?? "");
  const [status, setStatus] = useState<CaseStatus>(caseData.status);

  async function handleSave() {
    if (!fullName.trim()) {
      setError("Il nome cliente è obbligatorio");
      return;
    }
    setSaving(true);
    setError(null);

    // 1) Aggiorna cliente (se esiste)
    if (caseData.customers?.id) {
      const { error: custErr } = await supabase
        .from("customers")
        .update({
          full_name: fullName,
          phone: phone || null,
          email: email || null,
        })
        .eq("id", caseData.customers.id);
      if (custErr) {
        setError("Errore cliente: " + custErr.message);
        setSaving(false);
        return;
      }
    }

    // 2) Aggiorna pratica
    const { data, error: caseErr } = await supabase
      .from("cases")
      .update({
        vehicle_make: vehicleMake || null,
        vehicle_model: vehicleModel || null,
        vehicle_plate: vehiclePlate || null,
        insurance_company: insurance || null,
        price: price ? Number(price) : null,
        status,
      })
      .eq("id", caseData.id)
      .select("*, customers(id, full_name, phone, email)")
      .single();

    setSaving(false);
    if (caseErr) {
      setError("Errore pratica: " + caseErr.message);
      return;
    }
    if (data) {
      setCaseData(data as CaseWithCustomer);
      setSavedAt(Date.now());
      setTimeout(() => setSavedAt(null), 2500);
    }
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        alert("Sessione scaduta, ricarica la pagina.");
        return;
      }
      for (const file of Array.from(files)) {
        const ext = file.name.split(".").pop() ?? "bin";
        const path = `${user.id}/${caseData.id}/${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 8)}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("documents")
          .upload(path, file, { contentType: file.type });
        if (upErr) {
          alert("Errore upload: " + upErr.message);
          continue;
        }
        const { data, error } = await supabase
          .from("documents")
          .insert({
            case_id: caseData.id,
            file_name: file.name,
            file_path: path,
            file_size: file.size,
            mime_type: file.type,
            uploaded_by: user.id,
          })
          .select()
          .single();
        if (error) {
          alert("Errore DB: " + error.message);
          continue;
        }
        if (data) setDocuments((d) => [data, ...d]);
      }
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function handleDeleteDoc(doc: Document) {
    if (!confirm(`Eliminare "${doc.file_name}"?`)) return;
    await supabase.storage.from("documents").remove([doc.file_path]);
    const { error } = await supabase.from("documents").delete().eq("id", doc.id);
    if (error) {
      alert("Errore: " + error.message);
      return;
    }
    setDocuments(documents.filter((d) => d.id !== doc.id));
  }

  async function handleDownload(doc: Document) {
    const { data } = await supabase.storage
      .from("documents")
      .createSignedUrl(doc.file_path, 60);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  }

  async function handleAddNote() {
    if (!newNote.trim()) return;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from("notes")
      .insert({ case_id: caseData.id, body: newNote.trim(), author_id: user?.id ?? null })
      .select()
      .single();
    if (error) {
      alert("Errore: " + error.message);
      return;
    }
    if (data) setNotes([data, ...notes]);
    setNewNote("");
  }

  async function handleDeleteCase() {
    if (!confirm("Eliminare definitivamente questa pratica?")) return;
    const { error } = await supabase.from("cases").delete().eq("id", caseData.id);
    if (error) {
      alert("Errore: " + error.message);
      return;
    }
    router.push("/cases");
  }

  return (
    <div className="max-w-4xl mx-auto p-8 pb-32">
      <Link
        href="/cases"
        className="inline-flex items-center gap-1 text-sm text-text-muted hover:text-text mb-4"
      >
        <ArrowLeft className="w-4 h-4" /> Pratiche
      </Link>

      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold">
            {caseData.customers?.full_name ?? "Pratica senza cliente"}
          </h1>
          <div className="flex items-center gap-3 mt-2 text-sm text-text-muted">
            <span>Aperta il {formatDateTime(caseData.created_at)}</span>
            <CaseStatusBadge status={caseData.status} />
          </div>
        </div>
        <button
          onClick={handleDeleteCase}
          className="btn-ghost text-red-400 hover:text-red-300"
        >
          <Trash2 className="w-4 h-4" /> Elimina pratica
        </button>
      </div>

      {/* Cambio stato veloce */}
      <div className="card p-4 mb-5">
        <div className="text-xs text-text-muted mb-2">Stato pratica</div>
        <div className="flex flex-wrap gap-2">
          {CASE_STATUS_ORDER.map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={cn(
                "text-xs font-medium px-3 py-1.5 rounded-md transition-colors border",
                status === s
                  ? "bg-accent border-accent text-white"
                  : "bg-bg-hover border-border text-text-muted hover:text-text hover:border-border-hover"
              )}
            >
              {CASE_STATUS_LABELS[s]}
            </button>
          ))}
        </div>
      </div>

      {/* Tutti i campi richiesti in un'unica scheda editabile */}
      <div className="card p-6 mb-5 space-y-5">
        <Section title="Cliente">
          <Field label="Nome e cognome *">
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="input-base"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Telefono">
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="input-base"
              />
            </Field>
            <Field label="Email">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-base"
              />
            </Field>
          </div>
        </Section>

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

        <Section title="Pratica">
          <Field label="Assicurazione">
            <input
              value={insurance}
              onChange={(e) => setInsurance(e.target.value)}
              className="input-base"
              placeholder="Generali"
            />
          </Field>
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
        </Section>

        {error && (
          <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-md p-2.5">
            {error}
          </div>
        )}
      </div>

      {/* Documenti */}
      <div className="card p-5 mb-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-text-muted uppercase tracking-wide">
            <FileText className="w-3.5 h-3.5" /> Documenti
            <span className="text-text-subtle">({documents.length})</span>
          </div>
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="btn-primary py-1.5"
          >
            <Upload className="w-3.5 h-3.5" />
            {uploading ? "Caricamento..." : "Carica"}
          </button>
          <input
            ref={fileRef}
            type="file"
            multiple
            onChange={handleUpload}
            className="hidden"
            accept="image/*,application/pdf"
          />
        </div>

        {documents.length === 0 ? (
          <div className="text-center text-xs text-text-subtle py-6">
            Nessun documento. Carica foto o PDF.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {documents.map((d) => (
              <div
                key={d.id}
                className="flex items-center gap-3 p-2.5 rounded-md bg-bg-hover/50 border border-border hover:bg-bg-hover transition-colors"
              >
                <div className="w-9 h-9 rounded bg-bg-card flex items-center justify-center shrink-0">
                  {d.mime_type?.startsWith("image/") ? (
                    <ImageIcon className="w-4 h-4 text-blue-400" />
                  ) : (
                    <FileText className="w-4 h-4 text-text-muted" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-medium truncate" title={d.file_name}>
                    {d.file_name}
                  </div>
                  <div className="text-[10px] text-text-subtle">
                    {d.file_size ? `${Math.round(d.file_size / 1024)} KB` : ""} ·{" "}
                    {formatDateTime(d.created_at)}
                  </div>
                </div>
                <button
                  onClick={() => handleDownload(d)}
                  className="text-text-subtle hover:text-text"
                  title="Scarica"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDeleteDoc(d)}
                  className="text-text-subtle hover:text-red-400"
                  title="Elimina"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Note */}
      <div className="card p-5 mb-5">
        <div className="text-xs font-semibold text-text-muted mb-3 uppercase tracking-wide">
          Note ({notes.length})
        </div>
        <div className="flex gap-2 mb-3">
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
        <div className="space-y-2 max-h-80 overflow-auto">
          {notes.length === 0 ? (
            <div className="text-center text-xs text-text-subtle py-4">Nessuna nota</div>
          ) : (
            notes.map((n) => (
              <div
                key={n.id}
                className="bg-bg-hover/50 border border-border rounded-md p-3"
              >
                <div className="text-sm whitespace-pre-wrap">{n.body}</div>
                <div className="text-[10px] text-text-subtle mt-1.5">
                  {formatDateTime(n.created_at)}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Save bar sticky in fondo */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 sm:left-auto sm:translate-x-0 sm:right-8 sm:bottom-6 z-30">
        <div className="bg-bg-card border border-border rounded-lg px-4 py-3 shadow-card-hover flex items-center gap-4">
          <span className="text-xs">
            {savedAt ? (
              <span className="text-emerald-400">✓ Salvato</span>
            ) : (
              <span className="text-text-subtle">Modifiche non salvate</span>
            )}
          </span>
          <button onClick={handleSave} disabled={saving} className="btn-primary">
            <Save className="w-4 h-4" />
            {saving ? "Salvataggio..." : "Salva tutto"}
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
