import type { LeadStatus, CaseStatus } from "@/types/database.types";

export const LEAD_STATUS_ORDER: LeadStatus[] = [
  "nuovo",
  "contattato",
  "preventivo",
  "cliente",
  "perso",
];

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  nuovo: "Nuovo",
  contattato: "Contattato",
  preventivo: "Preventivo",
  cliente: "Cliente",
  perso: "Perso",
};

export const LEAD_STATUS_COLORS: Record<LeadStatus, { dot: string; bg: string; text: string }> = {
  nuovo: { dot: "bg-blue-500", bg: "bg-blue-500/10", text: "text-blue-400" },
  contattato: { dot: "bg-yellow-500", bg: "bg-yellow-500/10", text: "text-yellow-400" },
  preventivo: { dot: "bg-purple-500", bg: "bg-purple-500/10", text: "text-purple-400" },
  cliente: { dot: "bg-accent", bg: "bg-accent/10", text: "text-accent" },
  perso: { dot: "bg-neutral-500", bg: "bg-neutral-500/10", text: "text-neutral-400" },
};

export const CASE_STATUS_ORDER: CaseStatus[] = [
  "preventivo",
  "attesa_pezzi",
  "lavorazione",
  "completata",
  "consegnata",
];

export const CASE_STATUS_LABELS: Record<CaseStatus, string> = {
  preventivo: "Preventivo",
  attesa_pezzi: "Attesa pezzi",
  lavorazione: "In lavorazione",
  completata: "Completata",
  consegnata: "Consegnata",
};

export const CASE_STATUS_COLORS: Record<CaseStatus, { bg: string; text: string }> = {
  preventivo: { bg: "bg-purple-500/10", text: "text-purple-400" },
  attesa_pezzi: { bg: "bg-yellow-500/10", text: "text-yellow-400" },
  lavorazione: { bg: "bg-blue-500/10", text: "text-blue-400" },
  completata: { bg: "bg-emerald-500/10", text: "text-emerald-400" },
  consegnata: { bg: "bg-accent/10", text: "text-accent" },
};
