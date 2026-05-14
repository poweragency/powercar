"use client";

import { useMemo, useState } from "react";
import { Phone, Mail, Plus, Search, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatDate, initials } from "@/lib/utils";
import type { Customer, CaseStatus } from "@/types/database.types";
import Link from "next/link";

type CustomerWithCases = Customer & { cases: { id: string; status: CaseStatus }[] };

export function CustomersTable({
  initialCustomers,
}: {
  initialCustomers: CustomerWithCases[];
}) {
  const [customers, setCustomers] = useState<CustomerWithCases[]>(initialCustomers);
  const [search, setSearch] = useState("");
  const [showNew, setShowNew] = useState(false);
  const supabase = createClient();

  const filtered = useMemo(() => {
    if (!search.trim()) return customers;
    const q = search.toLowerCase();
    return customers.filter(
      (c) =>
        c.full_name.toLowerCase().includes(q) ||
        c.phone?.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q)
    );
  }, [customers, search]);

  async function handleDelete(id: string) {
    if (!confirm("Eliminare questo cliente? Verranno eliminate anche tutte le pratiche collegate.")) return;
    const { error } = await supabase.from("customers").delete().eq("id", id);
    if (error) {
      alert("Errore: " + error.message);
      return;
    }
    setCustomers(customers.filter((c) => c.id !== id));
  }

  return (
    <div className="h-full flex flex-col">
      <div className="px-8 py-4 border-b border-border flex items-center gap-3">
        <div>
          <h1 className="text-xl font-semibold">Clienti</h1>
          <p className="text-xs text-text-subtle">{customers.length} cliente{customers.length === 1 ? "" : "i"} totali</p>
        </div>

        <div className="ml-auto flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-text-subtle absolute left-2.5 top-1/2 -translate-y-1/2" strokeWidth={2} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cerca..."
              className="input-base pl-8 w-56"
            />
          </div>
          <button onClick={() => setShowNew(true)} className="btn-primary">
            <Plus className="w-4 h-4" strokeWidth={2.5} />
            Nuovo cliente
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-8">
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-bg-hover/50">
                <th className="text-left text-xs font-medium text-text-muted px-5 py-3">Nome</th>
                <th className="text-left text-xs font-medium text-text-muted px-5 py-3">Contatti</th>
                <th className="text-left text-xs font-medium text-text-muted px-5 py-3">Pratiche</th>
                <th className="text-left text-xs font-medium text-text-muted px-5 py-3">Aggiunto</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center text-sm text-text-subtle py-10">
                    {customers.length === 0
                      ? "Nessun cliente ancora. Sposta un lead in 'Cliente' nel Kanban o creane uno qui."
                      : "Nessun risultato per la ricerca."}
                  </td>
                </tr>
              ) : (
                filtered.map((c) => (
                  <tr key={c.id} className="hover:bg-bg-hover transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-accent/20 text-accent text-xs font-medium flex items-center justify-center shrink-0">
                          {initials(c.full_name)}
                        </div>
                        <span className="text-sm font-medium">{c.full_name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <div className="space-y-0.5">
                        {c.phone && (
                          <div className="flex items-center gap-1.5 text-xs text-text-muted">
                            <Phone className="w-3 h-3" strokeWidth={2} />
                            {c.phone}
                          </div>
                        )}
                        {c.email && (
                          <div className="flex items-center gap-1.5 text-xs text-text-muted">
                            <Mail className="w-3 h-3" strokeWidth={2} />
                            {c.email}
                          </div>
                        )}
                        {!c.phone && !c.email && <span className="text-xs text-text-subtle">—</span>}
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      {c.cases && c.cases.length > 0 ? (
                        <Link
                          href={`/cases?customer=${c.id}`}
                          className="text-xs text-accent hover:underline"
                        >
                          {c.cases.length} pratic{c.cases.length === 1 ? "a" : "he"}
                        </Link>
                      ) : (
                        <span className="text-xs text-text-subtle">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-xs text-text-muted">
                      {formatDate(c.created_at)}
                    </td>
                    <td className="px-5 py-3">
                      <button
                        onClick={() => handleDelete(c.id)}
                        className="text-text-subtle hover:text-red-400 transition-colors"
                        title="Elimina"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showNew && (
        <NewCustomerModal
          onClose={() => setShowNew(false)}
          onCreated={(c) => {
            setCustomers([{ ...c, cases: [] }, ...customers]);
            setShowNew(false);
          }}
        />
      )}
    </div>
  );
}

function NewCustomerModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (c: Customer) => void;
}) {
  const supabase = createClient();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    if (!fullName.trim()) {
      setError("Il nome è obbligatorio");
      return;
    }
    setSaving(true);
    setError(null);
    const { data, error } = await supabase
      .from("customers")
      .insert({
        full_name: fullName,
        phone: phone || null,
        email: email || null,
      })
      .select()
      .single();
    if (error) {
      setError(error.message);
      setSaving(false);
      return;
    }
    if (data) onCreated(data);
  }

  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="card w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-border">
          <h2 className="text-base font-semibold">Nuovo cliente</h2>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1.5">Nome *</label>
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="input-base"
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1.5">Telefono</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="input-base"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-base"
              />
            </div>
          </div>
          {error && (
            <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-md p-2.5">
              {error}
            </div>
          )}
        </div>
        <div className="px-5 py-3 border-t border-border flex justify-end gap-2">
          <button onClick={onClose} className="btn-secondary">Annulla</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary">
            {saving ? "Salvataggio..." : "Salva"}
          </button>
        </div>
      </div>
    </div>
  );
}
