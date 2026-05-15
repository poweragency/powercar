"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Plus, X, Search } from "lucide-react";
import {
  addDays,
  addMonths,
  addWeeks,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
  subWeeks,
} from "date-fns";
import { it } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { AppointmentModal } from "./AppointmentModal";
import type { Appointment, AppointmentKind, Customer, Case } from "@/types/database.types";

const KIND_LABELS: Record<AppointmentKind, string> = {
  accettazione: "Accettazione",
  consegna: "Consegna",
  sopralluogo: "Sopralluogo",
  lavorazione: "Lavorazione",
  altro: "Altro",
};

const KIND_COLORS: Record<AppointmentKind, string> = {
  accettazione: "bg-blue-500/20 text-blue-300 border-blue-500/40",
  consegna: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
  sopralluogo: "bg-yellow-500/20 text-yellow-300 border-yellow-500/40",
  lavorazione: "bg-purple-500/20 text-purple-300 border-purple-500/40",
  altro: "bg-bg-hover text-text-muted border-border",
};

interface Props {
  initialAppointments: Appointment[];
  customers: Pick<Customer, "id" | "full_name">[];
  cases: Pick<Case, "id" | "customer_id">[];
}

export function CalendarView({ initialAppointments, customers, cases }: Props) {
  const [appointments, setAppointments] = useState<Appointment[]>(initialAppointments);
  const [cursor, setCursor] = useState<Date>(new Date());
  const [modal, setModal] = useState<
    { mode: "edit"; appointment: Appointment }
    | { mode: "new"; date: string }
    | null
  >(null);
  const [dayPanelDate, setDayPanelDate] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"month" | "week">("month");

  const customerById = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of customers) m.set(c.id, c.full_name);
    return m;
  }, [customers]);

  const filteredAppointments = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return appointments;
    return appointments.filter((a) => {
      if (a.title.toLowerCase().includes(q)) return true;
      if (a.notes && a.notes.toLowerCase().includes(q)) return true;
      const customerName = a.customer_id ? customerById.get(a.customer_id) : null;
      if (customerName && customerName.toLowerCase().includes(q)) return true;
      return false;
    });
  }, [appointments, search, customerById]);

  useEffect(() => {
    if (!dayPanelDate) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setDayPanelDate(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dayPanelDate]);

  const days = useMemo(() => {
    if (view === "week") {
      const start = startOfWeek(cursor, { weekStartsOn: 1 });
      return Array.from({ length: 7 }, (_, i) => addDays(start, i));
    }
    const start = startOfWeek(startOfMonth(cursor), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(cursor), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [cursor, view]);

  const byDay = useMemo(() => {
    const map = new Map<string, Appointment[]>();
    for (const a of filteredAppointments) {
      const key = format(new Date(a.starts_at), "yyyy-MM-dd");
      const list = map.get(key) ?? [];
      list.push(a);
      map.set(key, list);
    }
    for (const list of map.values()) {
      list.sort(
        (a, b) =>
          new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()
      );
    }
    return map;
  }, [filteredAppointments]);

  function onSaved(a: Appointment) {
    setAppointments((prev) => {
      const idx = prev.findIndex((x) => x.id === a.id);
      if (idx === -1) return [...prev, a];
      const next = [...prev];
      next[idx] = a;
      return next;
    });
    setModal(null);
  }

  function onDeleted(id: string) {
    setAppointments((prev) => prev.filter((a) => a.id !== id));
    setModal(null);
  }

  const today = new Date();
  const monthLabel = format(cursor, "MMMM yyyy", { locale: it });
  const weekStart = startOfWeek(cursor, { weekStartsOn: 1 });
  const weekEnd = addDays(weekStart, 6);
  const weekLabel = `${format(weekStart, "d MMM", { locale: it })} – ${format(weekEnd, "d MMM yyyy", { locale: it })}`;

  function navigatePrev() {
    if (view === "week") setCursor((c) => subWeeks(c, 1));
    else setCursor((c) => subMonths(c, 1));
  }
  function navigateNext() {
    if (view === "week") setCursor((c) => addWeeks(c, 1));
    else setCursor((c) => addMonths(c, 1));
  }

  return (
    <div className="h-full flex flex-col">
      <div className="px-8 py-4 border-b border-border flex items-center gap-3">
        <div>
          <h1 className="text-xl font-semibold">Calendario</h1>
          <p className="text-xs text-text-subtle">
            Appuntamenti dell&apos;officina — accettazioni, consegne, sopralluoghi.
          </p>
        </div>

        <div className="ml-auto flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search
              className="w-4 h-4 text-text-subtle absolute left-2.5 top-1/2 -translate-y-1/2"
              strokeWidth={2}
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cerca per titolo o cliente..."
              className="input-base pl-8 w-56"
            />
          </div>
          <div className="flex items-center gap-1 bg-bg-hover rounded-md p-0.5 border border-border">
            <button
              onClick={() => setView("month")}
              className={cn(
                "text-xs font-medium px-2.5 py-1 rounded transition-colors",
                view === "month"
                  ? "bg-accent text-white"
                  : "text-text-muted hover:text-text"
              )}
              type="button"
            >
              Mese
            </button>
            <button
              onClick={() => setView("week")}
              className={cn(
                "text-xs font-medium px-2.5 py-1 rounded transition-colors",
                view === "week"
                  ? "bg-accent text-white"
                  : "text-text-muted hover:text-text"
              )}
              type="button"
            >
              Settimana
            </button>
          </div>
          <button
            onClick={navigatePrev}
            className="btn-secondary py-1.5 px-2"
            type="button"
            aria-label={view === "week" ? "Settimana precedente" : "Mese precedente"}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => setCursor(new Date())}
            className="btn-secondary py-1.5"
            type="button"
          >
            Oggi
          </button>
          <button
            onClick={navigateNext}
            className="btn-secondary py-1.5 px-2"
            type="button"
            aria-label={view === "week" ? "Settimana successiva" : "Mese successivo"}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <div className="text-sm font-medium capitalize px-3 min-w-[180px] text-center">
            {view === "week" ? weekLabel : monthLabel}
          </div>
          <button
            onClick={() =>
              setModal({ mode: "new", date: format(new Date(), "yyyy-MM-dd") })
            }
            className="btn-primary"
            type="button"
          >
            <Plus className="w-4 h-4" />
            Nuovo
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden border border-border">
          {["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"].map((d) => (
            <div
              key={d}
              className="bg-bg-card px-2 py-2 text-[10px] uppercase text-text-subtle font-semibold tracking-wide text-center"
            >
              {d}
            </div>
          ))}
          {days.map((day) => {
            const key = format(day, "yyyy-MM-dd");
            const apts = byDay.get(key) ?? [];
            const inMonth = isSameMonth(day, cursor);
            const isToday = isSameDay(day, today);

            const maxVisible = view === "week" ? 12 : 3;
            return (
              <div
                key={key}
                className={cn(
                  "bg-bg-card p-1.5 transition-colors hover:bg-bg-hover cursor-pointer flex flex-col gap-1",
                  view === "week" ? "min-h-[420px]" : "min-h-[110px]",
                  !inMonth && view === "month" && "opacity-50"
                )}
                onClick={() => setModal({ mode: "new", date: key })}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={cn(
                      "text-xs tabular-nums font-medium",
                      view === "week" && "text-sm",
                      isToday &&
                        "bg-accent text-white rounded-full w-5 h-5 flex items-center justify-center"
                    )}
                  >
                    {view === "week"
                      ? format(day, "d MMM", { locale: it })
                      : format(day, "d")}
                  </span>
                  {apts.length > 0 && (
                    <span className="text-[9px] text-text-subtle tabular-nums">
                      {apts.length}
                    </span>
                  )}
                </div>
                <div className="space-y-1 overflow-hidden">
                  {apts.slice(0, maxVisible).map((a) => (
                    <button
                      key={a.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        setModal({ mode: "edit", appointment: a });
                      }}
                      className={cn(
                        "w-full text-left text-[10px] px-1.5 py-0.5 rounded border truncate",
                        KIND_COLORS[a.kind]
                      )}
                      title={`${format(new Date(a.starts_at), "HH:mm")} ${a.title}`}
                      type="button"
                    >
                      {format(new Date(a.starts_at), "HH:mm")} {a.title}
                    </button>
                  ))}
                  {apts.length > maxVisible && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDayPanelDate(key);
                      }}
                      className="text-[10px] text-accent hover:underline pl-1 text-left"
                      type="button"
                    >
                      +{apts.length - maxVisible} altri →
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {modal && (
        <AppointmentModal
          appointment={modal.mode === "edit" ? modal.appointment : null}
          defaultDate={modal.mode === "new" ? modal.date : undefined}
          customers={customers}
          cases={cases}
          onClose={() => setModal(null)}
          onSaved={onSaved}
          onDeleted={onDeleted}
        />
      )}

      {dayPanelDate && (
        <DayPanel
          date={dayPanelDate}
          appointments={byDay.get(dayPanelDate) ?? []}
          onClose={() => setDayPanelDate(null)}
          onEdit={(a) => {
            setDayPanelDate(null);
            setModal({ mode: "edit", appointment: a });
          }}
          onNew={() => {
            setModal({ mode: "new", date: dayPanelDate });
            setDayPanelDate(null);
          }}
        />
      )}
    </div>
  );
}

function DayPanel({
  date,
  appointments,
  onClose,
  onEdit,
  onNew,
}: {
  date: string;
  appointments: Appointment[];
  onClose: () => void;
  onEdit: (a: Appointment) => void;
  onNew: () => void;
}) {
  const dateObj = new Date(date + "T00:00:00");
  const dayLabel = format(dateObj, "EEEE d MMMM yyyy", { locale: it });

  return (
    <>
      <div
        className="fixed inset-0 bg-black/40 z-40"
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        className="fixed top-0 right-0 h-screen w-full sm:w-96 bg-bg-card border-l border-border z-50 flex flex-col shadow-xl animate-slide-in-right"
      >
        <div className="px-5 h-16 flex items-center justify-between border-b border-border shrink-0">
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-wide text-text-subtle">
              Appuntamenti
            </div>
            <div className="text-sm font-semibold capitalize truncate">{dayLabel}</div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 -m-1 text-text-muted hover:text-text"
            aria-label="Chiudi"
            type="button"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {appointments.length === 0 ? (
            <div className="text-center text-xs text-text-subtle py-8">
              Nessun appuntamento.
            </div>
          ) : (
            appointments.map((a) => (
              <button
                key={a.id}
                onClick={() => onEdit(a)}
                className={cn(
                  "w-full text-left p-3 rounded-md border transition-colors hover:bg-bg-hover",
                  KIND_COLORS[a.kind]
                )}
                type="button"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <div className="text-xs font-semibold tabular-nums">
                    {format(new Date(a.starts_at), "HH:mm")}
                    {a.ends_at && ` – ${format(new Date(a.ends_at), "HH:mm")}`}
                  </div>
                  <div className="text-[10px] uppercase tracking-wide opacity-70">
                    {KIND_LABELS[a.kind]}
                  </div>
                </div>
                <div className="text-sm font-medium mt-1 truncate">{a.title}</div>
                {a.notes && (
                  <div className="text-xs text-text-muted mt-1 line-clamp-2">
                    {a.notes}
                  </div>
                )}
              </button>
            ))
          )}
        </div>

        <div className="p-3 border-t border-border shrink-0">
          <button onClick={onNew} className="btn-primary w-full" type="button">
            <Plus className="w-4 h-4" />
            Nuovo appuntamento
          </button>
        </div>
      </aside>
    </>
  );
}
