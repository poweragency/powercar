"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useConfirm } from "@/components/ConfirmDialog";

const DEFAULT_CONFIRM = {
  title: "Modifiche non salvate",
  description:
    "Hai modifiche non salvate. Se esci ora andranno perse. Vuoi davvero uscire?",
  confirmLabel: "Esci senza salvare",
  cancelLabel: "Resta",
  variant: "danger" as const,
};

// Avverte prima di uscire dalla pagina quando ci sono modifiche non salvate.
// Copre:
//  - chiusura/refresh tab/finestra (dialog nativo del browser)
//  - click su <Link>/<a> interni (breadcrumb, sidebar, ecc.) tramite confirm UI
// Non copre il tasto Back del browser: in Next.js App Router il route change
// non emette `beforeunload` e intercettare `popstate` in modo affidabile
// richiede manipolazioni della history che rompono altri scenari.
export function useUnsavedChangesWarning(dirty: boolean) {
  const confirm = useConfirm();
  const router = useRouter();
  const dirtyRef = useRef(dirty);
  dirtyRef.current = dirty;

  useEffect(() => {
    if (!dirty) return;

    function onBeforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault();
      e.returnValue = "";
    }

    let bypassClick = false;
    function onClickCapture(e: MouseEvent) {
      if (!dirtyRef.current || bypassClick) return;
      if (e.defaultPrevented) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      if (e.button !== 0) return;

      const link = (e.target as HTMLElement | null)?.closest(
        "a[href]"
      ) as HTMLAnchorElement | null;
      if (!link) return;
      if (link.target === "_blank") return;
      // Download (es. PDFDownloadLink) non è navigazione.
      if (link.hasAttribute("download")) return;

      const rawHref = link.getAttribute("href") ?? "";
      if (!rawHref || rawHref.startsWith("#") || rawHref.startsWith("javascript:")) {
        return;
      }
      if (rawHref.startsWith("blob:") || rawHref.startsWith("data:")) return;

      e.preventDefault();
      e.stopPropagation();

      confirm(DEFAULT_CONFIRM).then((ok) => {
        if (!ok) return;
        dirtyRef.current = false;
        bypassClick = true;
        try {
          if (link.origin === window.location.origin) {
            router.push(rawHref);
          } else {
            window.location.href = link.href;
          }
        } finally {
          setTimeout(() => {
            bypassClick = false;
          }, 0);
        }
      });
    }

    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("click", onClickCapture, true);

    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("click", onClickCapture, true);
    };
  }, [dirty, confirm, router]);
}
