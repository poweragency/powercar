"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { formatDateTime } from "@/lib/utils";
import type { Note } from "@/types/database.types";

interface Props {
  caseId: string;
  notes: Note[];
  onChange: (next: Note[]) => void;
}

export function NotesPanel({ caseId, notes, onChange }: Props) {
  const supabase = useMemo(() => createClient(), []);
  const [body, setBody] = useState("");
  const [adding, setAdding] = useState(false);

  async function handleAdd() {
    const text = body.trim();
    if (!text) return;
    setAdding(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from("notes")
      .insert({ case_id: caseId, body: text, author_id: user?.id ?? null })
      .select()
      .single();
    setAdding(false);
    if (error || !data) {
      toast.error("Errore nota", { description: error?.message });
      return;
    }
    onChange([data, ...notes]);
    setBody("");
  }

  return (
    <div>
      <div className="text-xs font-semibold text-text-muted mb-3 uppercase tracking-wide">
        Note <span className="text-text-subtle">({notes.length})</span>
      </div>
      <div className="flex gap-2 mb-3">
        <input
          type="text"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          placeholder="Aggiungi una nota..."
          className="input-base"
          disabled={adding}
        />
        <button
          onClick={handleAdd}
          disabled={adding || body.trim().length === 0}
          className="btn-secondary shrink-0"
          type="button"
        >
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
  );
}
