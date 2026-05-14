"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Car,
  Shield,
  Euro,
  Upload,
  FileText,
  Image as ImageIcon,
  Trash2,
  Download,
  Phone,
  Mail,
  Save,
  User,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { CASE_STATUS_LABELS, CASE_STATUS_ORDER } from "@/lib/constants";
import { CaseStatusBadge } from "./CaseStatusBadge";
import { formatCurrency, formatDateTime, initials } from "@/lib/utils";
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
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [newNote, setNewNote] = useState("");

  // Form fields
  const [vehicleMake, setVehicleMake] = useState(caseData.vehicle_make ?? "");
  const [vehicleModel, setVehicleModel] = useState(caseData.vehicle_model ?? "");
  const [vehiclePlate, setVehiclePlate] = useState(caseData.vehicle_plate ?? "");
  const [insurance, setInsurance] = useState(caseData.insurance_company ?? "");
  const [price, setPrice] = useState(caseData.price?.toString() ?? "");
  const [description, setDescription] = useState(caseData.description ?? "");

  async function handleStatusChange(status: CaseStatus) {
    const { data, error } = await supabase
      .from("cases")
      .update({ status })
      .eq("id", caseData.id)
      .select("*, customers(id, full_name, phone, email)")
      .single();
    if (error) {
      alert("Errore: " + error.message);
      return;
    }
    if (data) setCaseData(data as CaseWithCustomer);
  }

  async function handleSave() {
    setSaving(true);
    const { data, error } = await supabase
      .from("cases")
      .update({
        vehicle_make: vehicleMake || null,
        vehicle_model: vehicleModel || null,
        vehicle_plate: vehiclePlate || null,
        insurance_company: insurance || null,
        price: price ? Number(price) : null,
        description: description || null,
      })
      .eq("id", caseData.id)
      .select("*, customers(id, full_name, phone, email)")
      .single();
    setSaving(false);
    if (error) {
      alert("Errore: " + error.message);
      return;
    }
    if (data) {
      setCaseData(data as CaseWithCustomer);
      setEditing(false);
    }
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert("Sessione scaduta, ricarica la pagina.");
        return;
      }
      for (const file of Array.from(files)) {
        const ext = file.name.split(".").pop() ?? "bin";
        const path = `${user.id}/${caseData.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
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
            uploaded_by: user?.id ?? null,
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
    const { data: { user } } = await supabase.auth.getUser();
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
    <div className="max-w-5xl mx-auto p-8">
      <Link
        href="/cases"
        className="inline-flex items-center gap-1 text-sm text-text-muted hover:text-text mb-4"
      >
        <ArrowLeft className="w-4 h-4" /> Pratiche
      </Link>

      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold">
            {caseData.customers?.full_name ?? "—"}
          </h1>
          <div className="flex items-center gap-3 mt-2 text-sm text-text-muted">
            <span>Pratica aperta il {formatDateTime(caseData.created_at)}</span>
            <CaseStatusBadge status={caseData.status} />
          </div>
        </div>
        <button
          onClick={handleDeleteCase}
          className="btn-ghost text-red-400 hover:text-red-300"
        >
          <Trash2 className="w-4 h-4" /> Elimina
        </button>
      </div>

      {/* Status changer */}
      <div className="card p-4 mb-6">
        <div className="text-xs text-text-muted mb-2">Cambia stato</div>
        <div className="flex flex-wrap gap-2">
          {CASE_STATUS_ORDER.map((s) => (
            <button
              key={s}
              onClick={() => handleStatusChange(s)}
              className={cn(
                "text-xs font-medium px-3 py-1.5 rounded-md transition-colors border",
                caseData.status === s
                  ? "bg-accent border-accent text-white"
                  : "bg-bg-hover border-border text-text-muted hover:text-text hover:border-border-hover"
              )}
            >
              {CASE_STATUS_LABELS[s]}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sidebar info */}
        <div className="lg:col-span-1 space-y-4">
          {/* Customer */}
          <div className="card p-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-text-muted mb-3 uppercase tracking-wide">
              <User className="w-3.5 h-3.5" /> Cliente
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-accent/20 text-accent text-sm font-medium flex items-center justify-center">
                {initials(caseData.customers?.full_name ?? "")}
              </div>
              <div>
                <div className="text-sm font-medium">{caseData.customers?.full_name ?? "—"}</div>
              </div>
            </div>
            {caseData.customers?.phone && (
              <div className="mt-3 flex items-center gap-2 text-sm text-text-muted">
                <Phone className="w-3.5 h-3.5" /> {caseData.customers.phone}
              </div>
            )}
            {caseData.customers?.email && (
              <div className="mt-1 flex items-center gap-2 text-sm text-text-muted">
                <Mail className="w-3.5 h-3.5" /> {caseData.customers.email}
              </div>
            )}
          </div>

          {/* Vehicle + insurance */}
          <div className="card p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-text-muted uppercase tracking-wide">
                <Car className="w-3.5 h-3.5" /> Dettagli pratica
              </div>
              {!editing && (
                <button
                  onClick={() => setEditing(true)}
                  className="text-xs text-accent hover:underline"
                >
                  Modifica
                </button>
              )}
            </div>

            {editing ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Marca">
                    <input value={vehicleMake} onChange={(e) => setVehicleMake(e.target.value)} className="input-base" />
                  </Field>
                  <Field label="Modello">
                    <input value={vehicleModel} onChange={(e) => setVehicleModel(e.target.value)} className="input-base" />
                  </Field>
                </div>
                <Field label="Targa">
                  <input value={vehiclePlate} onChange={(e) => setVehiclePlate(e.target.value.toUpperCase())} className="input-base font-mono" />
                </Field>
                <Field label="Assicurazione">
                  <input value={insurance} onChange={(e) => setInsurance(e.target.value)} className="input-base" />
                </Field>
                <Field label="Prezzo (€)">
                  <input type="number" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} className="input-base" />
                </Field>
                <Field label="Descrizione lavoro">
                  <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="input-base resize-none" />
                </Field>
                <div className="flex gap-2 pt-2">
                  <button onClick={() => setEditing(false)} className="btn-secondary flex-1">
                    Annulla
                  </button>
                  <button onClick={handleSave} disabled={saving} className="btn-primary flex-1">
                    <Save className="w-3.5 h-3.5" /> {saving ? "Salvo..." : "Salva"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2 text-sm">
                <InfoRow label="Auto">
                  {[caseData.vehicle_make, caseData.vehicle_model].filter(Boolean).join(" ") || "—"}
                </InfoRow>
                <InfoRow label="Targa">
                  {caseData.vehicle_plate ? (
                    <span className="font-mono text-xs px-1.5 py-0.5 rounded bg-bg-hover">
                      {caseData.vehicle_plate}
                    </span>
                  ) : "—"}
                </InfoRow>
                <InfoRow label="Assicurazione">
                  <span className="inline-flex items-center gap-1">
                    {caseData.insurance_company && <Shield className="w-3 h-3 text-text-subtle" />}
                    {caseData.insurance_company ?? "—"}
                  </span>
                </InfoRow>
                <InfoRow label="Prezzo">
                  <span className="inline-flex items-center gap-1 font-medium text-accent">
                    <Euro className="w-3 h-3" />
                    {formatCurrency(caseData.price)}
                  </span>
                </InfoRow>
                {caseData.description && (
                  <div className="pt-2 border-t border-border mt-2">
                    <div className="text-xs text-text-subtle mb-1">Descrizione</div>
                    <div className="text-xs text-text-muted whitespace-pre-wrap">
                      {caseData.description}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right: documents + notes */}
        <div className="lg:col-span-2 space-y-4">
          {/* Documents */}
          <div className="card p-4">
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
              <div className="text-center text-xs text-text-subtle py-8">
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
                        {d.file_size ? `${Math.round(d.file_size / 1024)} KB` : ""} · {formatDateTime(d.created_at)}
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

          {/* Notes */}
          <div className="card p-4">
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
                <div className="text-center text-xs text-text-subtle py-4">
                  Nessuna nota
                </div>
              ) : (
                notes.map((n) => (
                  <div key={n.id} className="bg-bg-hover/50 border border-border rounded-md p-3">
                    <div className="text-sm whitespace-pre-wrap">{n.body}</div>
                    <div className="text-[10px] text-text-subtle mt-1.5">
                      {formatDateTime(n.created_at)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[10px] font-medium text-text-muted mb-1 uppercase tracking-wide">
        {label}
      </label>
      {children}
    </div>
  );
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs text-text-subtle">{label}</span>
      <span className="text-sm text-text">{children}</span>
    </div>
  );
}
