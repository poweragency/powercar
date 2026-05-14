"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Phone, Mail } from "lucide-react";
import { cn, formatDateTime } from "@/lib/utils";
import type { Lead } from "@/types/database.types";

interface Props {
  lead: Lead;
  onClick: () => void;
}

export function LeadCard({ lead, onClick }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: lead.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const isFromFb = lead.source === "facebook";

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={(e) => {
        // Solo se non sta trascinando
        if (!isDragging) onClick();
        e.stopPropagation();
      }}
      className={cn(
        "card p-3 cursor-grab active:cursor-grabbing select-none",
        "hover:border-border-hover hover:shadow-card-hover transition-all",
        isDragging && "opacity-50 ring-1 ring-accent"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="text-sm font-medium leading-tight min-w-0 break-words">
          {lead.full_name}
        </div>
        {isFromFb && (
          <span
            className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 shrink-0"
            title="Da Facebook Ads"
          >
            FB
          </span>
        )}
      </div>

      {(lead.phone || lead.email) && (
        <div className="mt-2 space-y-1">
          {lead.phone && (
            <div className="flex items-center gap-1.5 text-xs text-text-muted">
              <Phone className="w-3 h-3 shrink-0" strokeWidth={2} />
              <span className="truncate">{lead.phone}</span>
            </div>
          )}
          {lead.email && (
            <div className="flex items-center gap-1.5 text-xs text-text-muted">
              <Mail className="w-3 h-3 shrink-0" strokeWidth={2} />
              <span className="truncate">{lead.email}</span>
            </div>
          )}
        </div>
      )}

      {lead.message && (
        <div className="mt-2 text-xs text-text-subtle line-clamp-2">
          {lead.message}
        </div>
      )}

      <div className="mt-2 text-[10px] text-text-subtle">
        {formatDateTime(lead.created_at)}
      </div>
    </div>
  );
}
