import { CASE_STATUS_COLORS, CASE_STATUS_LABELS } from "@/lib/constants";
import type { CaseStatus } from "@/types/database.types";
import { cn } from "@/lib/utils";

export function CaseStatusBadge({ status }: { status: CaseStatus }) {
  const c = CASE_STATUS_COLORS[status];
  return (
    <span
      className={cn(
        "inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full",
        c.bg,
        c.text
      )}
    >
      {CASE_STATUS_LABELS[status]}
    </span>
  );
}
