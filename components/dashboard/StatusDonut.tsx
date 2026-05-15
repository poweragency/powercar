import { CASE_STATUS_LABELS, CASE_STATUS_ORDER } from "@/lib/constants";
import type { CaseStatus } from "@/types/database.types";

const COLORS: Record<CaseStatus, string> = {
  preventivo: "rgb(168 85 247)", // purple
  attesa_pezzi: "rgb(250 204 21)", // yellow
  lavorazione: "rgb(96 165 250)", // blue
  completata: "rgb(52 211 153)", // emerald
  consegnata: "rgb(249 115 22)", // accent
};

interface Props {
  counts: Record<CaseStatus, number>;
}

export function StatusDonut({ counts }: Props) {
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  if (total === 0) return null;

  const size = 140;
  const radius = 56;
  const stroke = 16;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * radius;

  let offset = 0;
  const segments = CASE_STATUS_ORDER.map((status) => {
    const value = counts[status];
    if (value === 0) return null;
    const ratio = value / total;
    const length = circumference * ratio;
    const seg = (
      <circle
        key={status}
        cx={cx}
        cy={cy}
        r={radius}
        fill="none"
        stroke={COLORS[status]}
        strokeWidth={stroke}
        strokeDasharray={`${length} ${circumference - length}`}
        strokeDashoffset={-offset}
        transform={`rotate(-90 ${cx} ${cy})`}
      />
    );
    offset += length;
    return seg;
  });

  return (
    <div className="flex items-center gap-4">
      <svg width={size} height={size} aria-hidden="true" className="shrink-0">
        {segments}
        <text
          x={cx}
          y={cy - 4}
          textAnchor="middle"
          fontSize="22"
          fontWeight="600"
          fill="rgb(250 250 250)"
        >
          {total}
        </text>
        <text
          x={cx}
          y={cy + 12}
          textAnchor="middle"
          fontSize="9"
          fill="rgb(115 115 115)"
          letterSpacing="1"
        >
          PRATICHE
        </text>
      </svg>
      <ul className="space-y-1.5 text-xs min-w-0 flex-1">
        {CASE_STATUS_ORDER.map((status) => {
          const v = counts[status];
          if (v === 0) return null;
          return (
            <li key={status} className="flex items-center gap-2">
              <span
                className="w-2.5 h-2.5 rounded-sm shrink-0"
                style={{ backgroundColor: COLORS[status] }}
              />
              <span className="truncate text-text-muted">
                {CASE_STATUS_LABELS[status]}
              </span>
              <span className="ml-auto tabular-nums text-text">{v}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
