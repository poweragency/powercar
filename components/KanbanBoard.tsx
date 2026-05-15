"use client";

import { useEffect, useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  pointerWithin,
  rectIntersection,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent,
  useDroppable,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { toast } from "sonner";
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

const STATUS_SET = new Set<string>(LEAD_STATUS_ORDER);

const kanbanCollision: CollisionDetection = (args) => {
  const pointer = pointerWithin(args);
  const columnHit = pointer.find((c) => STATUS_SET.has(String(c.id)));
  if (columnHit) return [columnHit];
  if (pointer.length > 0) return pointer;
  return rectIntersection(args);
};

export function KanbanBoard({ initialLeads }: Props) {
  const [leads, setLeads] = useState<Lead[]>(initialLeads);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [modalLead, setModalLead] = useState<Lead | "new" | null>(null);
  const supabase = useMemo(() => createClient(), []);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  useEffect(() => {
    const channel = supabase
      .channel("leads-changes")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "leads" },
        (payload) => {
          const row = payload.new as Lead;
          setLeads((prev) =>
            prev.some((l) => l.id === row.id) ? prev : [row, ...prev]
          );
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "leads" },
        (payload) => {
          const row = payload.new as Lead;
          setLeads((prev) => prev.map((l) => (l.id === row.id ? row : l)));
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "leads" },
        (payload) => {
          const oldRow = payload.old as { id?: string };
          if (!oldRow.id) return;
          setLeads((prev) => prev.filter((l) => l.id !== oldRow.id));
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

  function resolveStatus(id: string): LeadStatus | null {
    if (STATUS_SET.has(id)) return id as LeadStatus;
    const lead = leads.find((l) => l.id === id);
    return lead?.status ?? null;
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;

    const draggedId = String(active.id);
    const fromStatus = resolveStatus(draggedId);
    const toStatus = resolveStatus(String(over.id));
    if (!fromStatus || !toStatus) return;
    if (fromStatus === toStatus) return;

    setLeads((prev) =>
      prev.map((l) => (l.id === draggedId ? { ...l, status: toStatus } : l))
    );

    const { error } = await supabase
      .from("leads")
      .update({ status: toStatus })
      .eq("id", draggedId);

    if (error) {
      setLeads((prev) =>
        prev.map((l) => (l.id === draggedId ? { ...l, status: fromStatus } : l))
      );
      toast.error("Spostamento fallito", { description: error.message });
    } else if (toStatus === "cliente" && fromStatus !== "cliente") {
      toast.success("Cliente creato", {
        description: "Cliente e pratica generati automaticamente.",
      });
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
          <button onClick={() => setModalLead("new")} className="btn-primary" type="button">
            <Plus className="w-4 h-4" strokeWidth={2.5} />
            Nuovo lead
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-x-auto overflow-y-hidden">
        <DndContext
          sensors={sensors}
          collisionDetection={kanbanCollision}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={() => setActiveId(null)}
        >
          <div className="flex gap-2 p-4 h-full min-w-max">
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
    <div
      ref={setNodeRef}
      className={cn(
        "w-48 shrink-0 flex flex-col h-full rounded-lg border border-dashed transition-colors",
        isOver ? "border-accent bg-accent/5" : "border-transparent"
      )}
    >
      <div className="px-2 py-1.5 flex items-center gap-1.5 shrink-0">
        <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", colors.dot)} />
        <h3 className="text-xs font-semibold truncate">{LEAD_STATUS_LABELS[status]}</h3>
        <span className="text-[10px] text-text-subtle ml-auto tabular-nums">{leads.length}</span>
      </div>

      <SortableContext items={leads.map((l) => l.id)} strategy={verticalListSortingStrategy}>
        <div className="flex-1 space-y-1.5 p-1.5 overflow-y-auto">
          {leads.length === 0 && (
            <div className="text-center text-[10px] text-text-subtle py-6">—</div>
          )}
          {leads.map((lead) => (
            <LeadCard key={lead.id} lead={lead} onClick={() => onCardClick(lead)} />
          ))}
        </div>
      </SortableContext>
    </div>
  );
}
