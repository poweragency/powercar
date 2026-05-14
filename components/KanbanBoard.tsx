"use client";

import { useEffect, useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  type DragEndEvent,
  type DragStartEvent,
  useDroppable,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { createClient } from "@/lib/supabase/client";
import { LEAD_STATUS_COLORS, LEAD_STATUS_LABELS, LEAD_STATUS_ORDER } from "@/lib/constants";
import type { Lead, LeadStatus } from "@/types/database.types";
import { LeadCard } from "./LeadCard";
import { LeadModal } from "./LeadModal";
import { Plus, Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  initialLeads: Lead[];
}

export function KanbanBoard({ initialLeads }: Props) {
  const [leads, setLeads] = useState<Lead[]>(initialLeads);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [modalLead, setModalLead] = useState<Lead | "new" | null>(null);
  const supabase = createClient();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  // Realtime: refresh on insert/update/delete
  useEffect(() => {
    const channel = supabase
      .channel("leads-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "leads" },
        async () => {
          const { data } = await supabase
            .from("leads")
            .select("*")
            .order("position", { ascending: true })
            .order("created_at", { ascending: false });
          if (data) setLeads(data);
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  const filtered = useMemo(() => {
    if (!search.trim()) return leads;
    const q = search.toLowerCase();
    return leads.filter(
      (l) =>
        l.full_name.toLowerCase().includes(q) ||
        l.phone?.toLowerCase().includes(q) ||
        l.email?.toLowerCase().includes(q)
    );
  }, [leads, search]);

  const grouped = useMemo(() => {
    const map: Record<LeadStatus, Lead[]> = {
      nuovo: [],
      contattato: [],
      preventivo: [],
      cliente: [],
      perso: [],
    };
    for (const l of filtered) map[l.status].push(l);
    for (const k of Object.keys(map) as LeadStatus[]) {
      map[k].sort((a, b) => a.position - b.position);
    }
    return map;
  }, [filtered]);

  const activeLead = activeId ? leads.find((l) => l.id === activeId) : null;

  function findStatusOfId(id: string): LeadStatus | null {
    if (LEAD_STATUS_ORDER.includes(id as LeadStatus)) return id as LeadStatus;
    const lead = leads.find((l) => l.id === id);
    return lead?.status ?? null;
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;

    const fromStatus = findStatusOfId(String(active.id));
    const toStatus = findStatusOfId(String(over.id));
    if (!fromStatus || !toStatus) return;

    const draggedId = String(active.id);

    // Solo cambio colonna (basic) — il riordino dentro la stessa colonna è opzionale
    if (fromStatus === toStatus) return;

    // Optimistic update
    setLeads((prev) =>
      prev.map((l) => (l.id === draggedId ? { ...l, status: toStatus } : l))
    );

    const { error } = await supabase
      .from("leads")
      .update({ status: toStatus })
      .eq("id", draggedId);

    if (error) {
      console.error(error);
      // Rollback
      setLeads((prev) =>
        prev.map((l) => (l.id === draggedId ? { ...l, status: fromStatus } : l))
      );
      alert("Errore nello spostamento: " + error.message);
    }
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  return (
    <div className="h-full flex flex-col">
      <div className="px-8 py-4 border-b border-border flex items-center gap-3">
        <div>
          <h1 className="text-xl font-semibold">Lead</h1>
          <p className="text-xs text-text-subtle">
            Trascina i lead tra le colonne. Spostandone uno in &quot;Cliente&quot; viene creata una pratica automaticamente.
          </p>
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
          <button onClick={() => setModalLead("new")} className="btn-primary">
            <Plus className="w-4 h-4" strokeWidth={2.5} />
            Nuovo lead
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-x-auto overflow-y-hidden">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={() => setActiveId(null)}
        >
          <div className="flex gap-4 p-6 h-full min-w-max">
            {LEAD_STATUS_ORDER.map((status) => (
              <KanbanColumn
                key={status}
                status={status}
                leads={grouped[status]}
                onCardClick={(lead) => setModalLead(lead)}
              />
            ))}
          </div>

          <DragOverlay>
            {activeLead ? (
              <div className="rotate-2">
                <LeadCard lead={activeLead} onClick={() => {}} />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>

      {modalLead && (
        <LeadModal
          lead={modalLead === "new" ? null : modalLead}
          onClose={() => setModalLead(null)}
          onSaved={() => setModalLead(null)}
        />
      )}
    </div>
  );
}

function KanbanColumn({
  status,
  leads,
  onCardClick,
}: {
  status: LeadStatus;
  leads: Lead[];
  onCardClick: (lead: Lead) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const colors = LEAD_STATUS_COLORS[status];

  return (
    <div className="w-72 shrink-0 flex flex-col h-full">
      <div className="px-3 py-2 mb-3 flex items-center gap-2">
        <span className={cn("w-2 h-2 rounded-full", colors.dot)} />
        <h3 className="text-sm font-semibold">{LEAD_STATUS_LABELS[status]}</h3>
        <span className="text-xs text-text-subtle ml-1">{leads.length}</span>
      </div>

      <SortableContext items={leads.map((l) => l.id)} strategy={verticalListSortingStrategy}>
        <div
          ref={setNodeRef}
          className={cn(
            "flex-1 space-y-2 p-2 rounded-lg border border-dashed transition-colors overflow-y-auto",
            isOver ? "border-accent bg-accent/5" : "border-transparent"
          )}
        >
          {leads.length === 0 && (
            <div className="text-center text-xs text-text-subtle py-8">
              Trascina qui
            </div>
          )}
          {leads.map((lead) => (
            <LeadCard key={lead.id} lead={lead} onClick={() => onCardClick(lead)} />
          ))}
        </div>
      </SortableContext>
    </div>
  );
}
