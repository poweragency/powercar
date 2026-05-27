"use client";

import { useRouter } from "next/navigation";
import { CalendarRange } from "lucide-react";
import { cn } from "@/lib/utils";

function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

interface Props {
  from: string;
  to: string;
}

export function DashboardRangePicker({ from, to }: Props) {
  const router = useRouter();
  const today = new Date();
  const todayStr = ymd(today);

  function apply(f: string, t: string) {
    // Normalizza: inizio non oltre la fine.
    const ff = f > t ? t : f;
    router.push(`/dashboard?from=${ff}&to=${t}`);
  }

  const last30 = (() => {
    const f = new Date();
    f.setDate(f.getDate() - 29);
    return [ymd(f), todayStr] as const;
  })();
  const thisMonth = [
    ymd(new Date(today.getFullYear(), today.getMonth(), 1)),
    todayStr,
  ] as const;
  const thisYear = [ymd(new Date(today.getFullYear(), 0, 1)), todayStr] as const;

  const presets: { label: string; range: readonly [string, string] }[] = [
    { label: "30 giorni", range: last30 },
    { label: "Mese", range: thisMonth },
    { label: "Anno", range: thisYear },
  ];

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="inline-flex rounded-md border border-border overflow-hidden text-xs">
        {presets.map((p, i) => {
          const active = p.range[0] === from && p.range[1] === to;
          return (
            <button
              key={p.label}
              type="button"
              onClick={() => apply(p.range[0], p.range[1])}
              className={cn(
                "px-3 py-1.5 transition-colors",
                i > 0 && "border-l border-border",
                active
                  ? "bg-accent/10 text-accent"
                  : "text-text-muted hover:text-text hover:bg-bg-hover"
              )}
            >
              {p.label}
            </button>
          );
        })}
      </div>
      <div className="flex items-center gap-1.5">
        <CalendarRange className="w-4 h-4 text-text-subtle shrink-0" />
        <input
          type="date"
          value={from}
          max={to}
          onChange={(e) => e.target.value && apply(e.target.value, to)}
          className="input-base w-[8.5rem] py-1.5"
          aria-label="Data inizio"
        />
        <span className="text-text-subtle text-xs">→</span>
        <input
          type="date"
          value={to}
          min={from}
          max={todayStr}
          onChange={(e) => e.target.value && apply(from, e.target.value)}
          className="input-base w-[8.5rem] py-1.5"
          aria-label="Data fine"
        />
      </div>
    </div>
  );
}
