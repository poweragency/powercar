"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SavedAccountPublic } from "@/lib/auth/saved-accounts";

interface Props {
  accounts: SavedAccountPublic[];
}

export function SavedAccountsList({ accounts }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (accounts.length === 0) return null;

  // Rimozione: fetch DELETE + refresh. La form di switch (sotto) usa invece
  // POST nativo del browser cosi' i Set-Cookie vengono committati PRIMA del
  // redirect alla pagina target, senza race con JS.
  async function handleRemove(id: string, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    await fetch(`/api/auth/saved-accounts/${id}`, { method: "DELETE" });
    startTransition(() => router.refresh());
  }

  return (
    <div className="mb-5">
      <div className="text-xs font-medium text-text-muted mb-2 px-1">
        Account su questo dispositivo
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
        {accounts.map((a) => {
          const initials =
            (a.full_name ?? a.email)
              .split(/\s+/)
              .filter(Boolean)
              .slice(0, 2)
              .map((w) => w[0]?.toUpperCase() ?? "")
              .join("") || "?";
          return (
            <div key={a.id} className="relative shrink-0 w-24 group">
              <form
                action={`/api/auth/switch/${a.id}`}
                method="POST"
                className="contents"
              >
                <button
                  type="submit"
                  disabled={pending}
                  className={cn(
                    "w-24 p-2 rounded-lg border border-border bg-bg-elevated",
                    "hover:border-accent/60 hover:bg-bg-hover transition-colors text-center",
                    "disabled:opacity-60"
                  )}
                  title={a.email}
                >
                  <div className="relative mx-auto">
                    {a.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={a.avatar_url}
                        alt=""
                        className="w-14 h-14 rounded-full object-cover mx-auto"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-full bg-accent/20 text-accent flex items-center justify-center mx-auto font-semibold">
                        {initials}
                      </div>
                    )}
                  </div>
                  <div className="mt-2 text-[11px] font-medium truncate">
                    {a.full_name?.split(" ")[0] ?? a.email.split("@")[0]}
                  </div>
                  <div className="text-[10px] text-text-subtle truncate">{a.email}</div>
                </button>
              </form>
              <button
                type="button"
                onClick={(e) => handleRemove(a.id, e)}
                className="absolute top-1 right-1 w-5 h-5 rounded-full bg-bg-card border border-border opacity-0 group-hover:opacity-100 flex items-center justify-center text-text-muted hover:text-status-danger hover:border-status-danger transition cursor-pointer z-10"
                aria-label={`Rimuovi ${a.email}`}
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          );
        })}
      </div>
      <div className="text-[10px] text-text-subtle px-1 mt-1">
        Clicca su un account per accedere senza ridigitare la password.
      </div>
    </div>
  );
}
