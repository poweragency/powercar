"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Phone, Mail, Sparkles } from "lucide-react";
import { cn, initials } from "@/lib/utils";
import type { Lead, LeadStatus } from "@/types/database.types";

interface Props {
  lead: Lead;
  onClick: () => void;
}

const STATUS_ACCENT: Record<LeadStatus, string> = {
  nuovo: "bg-blue-500/15 text-blue-300",
  contattato: "bg-yellow-500/15 text-yellow-300",
  preventivo: "bg-purple-500/15 text-purple-300",
  cliente: "bg-accent/15 text-accent",
  perso: "bg-neutral-500/15 text-neutral-400",
};

// Palette per la pill della campagna FB. Le classi sono scritte
// per intero (non concatenate) cosi' Tailwind JIT le scopre.
const CAMPAIGN_PALETTE = [
  "bg-blue-500/15 text-blue-300",
  "bg-emerald-500/15 text-emerald-300",
  "bg-amber-500/15 text-amber-300",
  "bg-pink-500/15 text-pink-300",
  "bg-violet-500/15 text-violet-300",
  "bg-cyan-500/15 text-cyan-300",
  "bg-rose-500/15 text-rose-300",
  "bg-orange-500/15 text-orange-300",
  "bg-teal-500/15 text-teal-300",
  "bg-fuchsia-500/15 text-fuchsia-300",
];

// Hash deterministico: stessa campagna -> stesso colore (anche tra
// reload). Normalizzo case/spazi cosi' varianti minime ("Estate 49 "
// vs "estate 49") non finiscono in colori diversi.
function campaignColor(name: string): string {
  const key = name.trim().toLowerCase();
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) | 0;
  return CAMPAIGN_PALETTE[Math.abs(h) % CAMPAIGN_PALETTE.length];
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "ora";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}g`;
  const w = Math.floor(d / 7);
  if (w < 5) return `${w}set`;
  const mo = Math.floor(d / 30);
  return `${mo}mes`;
}

export function LeadCard({ lead, onClick }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: lead.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const isFromFb = lead.source === "facebook";
  const isRecent = Date.now() - new Date(lead.created_at).getTime() < 24 * 60 * 60 * 1000;
  // Etichetta di attribuzione: preferiamo il nome campagna; se manca
  // (lead organico o pre-migration) ripieghiamo sul form. Lead manuali
  // restano senza pill.
  const campaignLabel = lead.campaign_name ?? lead.form_name ?? null;

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
        "card p-2.5 cursor-grab active:cursor-grabbing select-none",
        "hover:border-accent/50 hover:shadow-card-hover transition-all",
        isDragging && "opacity-50 ring-1 ring-accent"
      )}
    >
      <div className="flex items-start gap-2">
        <div
          className={cn(
            "w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-semibold shrink-0",
            STATUS_ACCENT[lead.status]
          )}
        >
          {initials(lead.full_name)}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span
              className="text-xs font-medium leading-tight truncate flex-1"
              title={lead.full_name}
            >
              {lead.full_name}
            </span>
            {isFromFb && (
              <span
                className="text-[8px] font-bold px-1 py-0 rounded bg-blue-500/15 text-blue-400 shrink-0"
                title="Lead da Facebook Ads"
              >
                FB
              </span>
            )}
          </div>

          {campaignLabel && (
            <div className="mt-1">
              <span
                className={cn(
                  "inline-block max-w-full text-[10px] font-medium px-1.5 py-0.5 rounded leading-tight truncate",
                  campaignColor(campaignLabel)
                )}
                title={campaignLabel}
              >
                {campaignLabel}
              </span>
            </div>
          )}

          <div className="flex items-center gap-2 mt-1">
            {lead.phone && (
              <span className="text-text-subtle" title={lead.phone}>
                <Phone className="w-2.5 h-2.5" strokeWidth={2} />
              </span>
            )}
            {lead.email && (
              <span className="text-text-subtle" title={lead.email}>
                <Mail className="w-2.5 h-2.5" strokeWidth={2} />
              </span>
            )}
            <span className="text-[10px] text-text-subtle tabular-nums ml-auto">
              {timeAgo(lead.created_at)}
            </span>
            {isRecent && lead.status === "nuovo" && (
              <Sparkles
                className="w-2.5 h-2.5 text-accent"
                strokeWidth={2}
                aria-label="Nuovo recente"
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
