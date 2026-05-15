"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
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
        if (!isDragging) onClick();
        e.stopPropagation();
      }}
      className={cn(
        "card px-2.5 py-1.5 cursor-grab active:cursor-grabbing select-none",
        "hover:border-border-hover transition-all flex items-center gap-2",
        isDragging && "opacity-50 ring-1 ring-accent"
      )}
    >
      <span className="text-sm font-medium leading-tight truncate flex-1" title={lead.full_name}>
        {lead.full_name}
      </span>
      {isFromFb && (
        <span
          className="text-[9px] font-medium px-1 py-0.5 rounded bg-blue-500/10 text-blue-400 shrink-0"
          title="Da Facebook Ads"
        >
          FB
        </span>
      )}
    </div>
  );
}
