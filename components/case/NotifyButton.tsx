"use client";

import { useState } from "react";
import { Mail } from "lucide-react";
import { toast } from "sonner";

interface Props {
  caseId: string;
  customerEmail: string | null;
}

export function NotifyButton({ caseId, customerEmail }: Props) {
  const [sending, setSending] = useState(false);

  async function handleNotify() {
    if (!customerEmail) {
      toast.error("Cliente senza email", {
        description: "Aggiungi l'indirizzo email del cliente prima di inviare.",
      });
      return;
    }
    setSending(true);
    try {
      const res = await fetch("/api/notifications/case-status", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ case_id: caseId }),
      });
      const json = (await res.json().catch(() => null)) as
        | { sent: true; to: string }
        | { sent: false; reason?: string; preview?: { subject: string }; error?: string }
        | null;

      if (!res.ok) {
        toast.error("Invio fallito", {
          description: (json as { error?: string } | null)?.error ?? `HTTP ${res.status}`,
        });
        return;
      }

      if (json?.sent) {
        toast.success("Email inviata", { description: `A ${json.to}` });
      } else if (json && json.sent === false && json.reason === "email_not_configured") {
        toast.warning("Email non configurata", {
          description:
            "Imposta RESEND_API_KEY e RESEND_FROM_EMAIL per inviare email reali.",
        });
      } else {
        toast.error("Invio fallito");
      }
    } finally {
      setSending(false);
    }
  }

  return (
    <button
      onClick={handleNotify}
      disabled={sending}
      className="btn-secondary"
      type="button"
      title={
        customerEmail
          ? `Invia notifica via email a ${customerEmail}`
          : "Cliente senza email"
      }
    >
      <Mail className="w-4 h-4" />
      {sending ? "Invio..." : "Notifica cliente"}
    </button>
  );
}
