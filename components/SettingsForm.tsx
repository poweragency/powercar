"use client";

import { useState } from "react";
import { Save, Copy, Check, ChevronDown } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/types/database.types";
import { cn } from "@/lib/utils";

interface Props {
  initialProfile: Profile | null;
  userEmail: string;
}

export function SettingsForm({ initialProfile, userEmail }: Props) {
  const supabase = createClient();
  const [profile, setProfile] = useState<Profile | null>(initialProfile);
  const [workshopName, setWorkshopName] = useState(profile?.workshop_name ?? "");
  const [phone, setPhone] = useState(profile?.phone ?? "");
  const [fbPageId, setFbPageId] = useState(profile?.fb_page_id ?? "");
  const [fbToken, setFbToken] = useState(profile?.fb_page_access_token ?? "");
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [showGuide, setShowGuide] = useState(false);

  async function handleSave() {
    if (!workshopName.trim()) {
      setError("Il nome carrozzeria è obbligatorio");
      return;
    }
    setSaving(true);
    setError(null);
    const { data, error } = await supabase
      .from("profiles")
      .update({
        workshop_name: workshopName,
        phone: phone || null,
        fb_page_id: fbPageId || null,
        fb_page_access_token: fbToken || null,
      })
      .eq("id", profile!.id)
      .select()
      .single();
    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    if (data) {
      setProfile(data);
      setSavedAt(Date.now());
      setTimeout(() => setSavedAt(null), 2500);
    }
  }

  function copyToClipboard(value: string, key: string) {
    navigator.clipboard.writeText(value);
    setCopied(key);
    setTimeout(() => setCopied(null), 1500);
  }

  const origin =
    typeof window !== "undefined"
      ? window.location.origin
      : "https://TUO-DOMINIO.com";
  const webhookUrl = `${origin}/api/webhooks/facebook`;
  const verifyToken = profile?.fb_verify_token ?? "—";

  return (
    <div className="max-w-2xl mx-auto p-8 pb-32">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold">Impostazioni</h1>
        <p className="text-sm text-text-muted mt-1">
          Account e collegamento con Facebook Ads
        </p>
      </div>

      {/* Account */}
      <div className="card p-6 mb-5 space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-text-subtle">
          Account
        </h2>

        <Field label="Nome carrozzeria">
          <input
            type="text"
            value={workshopName}
            onChange={(e) => setWorkshopName(e.target.value)}
            className="input-base"
            placeholder="Carrozzeria Rossi"
          />
        </Field>

        <Field label="Email (non modificabile)">
          <input
            type="email"
            value={userEmail}
            disabled
            className="input-base opacity-60 cursor-not-allowed"
          />
        </Field>

        <Field label="Telefono">
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="input-base"
            placeholder="06 1234567"
          />
        </Field>
      </div>

      {/* FB Integration */}
      <div className="card p-6 mb-5 space-y-4">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-text-subtle">
            Collegamento Facebook Ads
          </h2>
          <p className="text-xs text-text-muted mt-1.5">
            Compila i 2 campi qui sotto per ricevere automaticamente i lead
            delle tue pubblicità Facebook.
          </p>
        </div>

        <Field label="ID Pagina Facebook">
          <input
            type="text"
            value={fbPageId}
            onChange={(e) => setFbPageId(e.target.value.trim())}
            className="input-base font-mono text-sm"
            placeholder="123456789012345"
          />
        </Field>

        <Field label="Token di accesso Pagina">
          <input
            type="password"
            value={fbToken}
            onChange={(e) => setFbToken(e.target.value.trim())}
            className="input-base font-mono text-sm"
            placeholder="EAAxxxxx..."
          />
        </Field>

        <button
          type="button"
          onClick={() => setShowGuide(!showGuide)}
          className="flex items-center gap-2 text-sm text-accent hover:underline w-full text-left"
        >
          <ChevronDown
            className={cn(
              "w-4 h-4 transition-transform",
              showGuide && "rotate-180"
            )}
          />
          {showGuide
            ? "Nascondi la guida passo-passo"
            : "Mostra la guida passo-passo"}
        </button>

        {showGuide && <FacebookGuide webhookUrl={webhookUrl} verifyToken={verifyToken} copyToClipboard={copyToClipboard} copied={copied} />}
      </div>

      {error && (
        <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-md p-3 mb-5">
          {error}
        </div>
      )}

      {/* Save bar sticky */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 sm:left-auto sm:translate-x-0 sm:right-8 sm:bottom-6 z-30">
        <div className="bg-bg-card border border-border rounded-lg px-4 py-3 shadow-card-hover flex items-center gap-4">
          <span className="text-xs">
            {savedAt ? (
              <span className="text-emerald-400">✓ Salvato</span>
            ) : (
              <span className="text-text-subtle">Modifiche non salvate</span>
            )}
          </span>
          <button onClick={handleSave} disabled={saving} className="btn-primary">
            <Save className="w-4 h-4" />
            {saving ? "Salvataggio..." : "Salva"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-text-muted mb-1.5">
        {label}
      </label>
      {children}
    </div>
  );
}

function FacebookGuide({
  webhookUrl,
  verifyToken,
  copyToClipboard,
  copied,
}: {
  webhookUrl: string;
  verifyToken: string;
  copyToClipboard: (v: string, k: string) => void;
  copied: string | null;
}) {
  return (
    <div className="mt-4 bg-bg-hover/50 border border-border rounded-lg p-5 space-y-5 text-sm">
      <div>
        <h3 className="font-semibold mb-1">Cosa serve prima di iniziare</h3>
        <ul className="text-text-muted text-sm space-y-1 pl-4 list-disc">
          <li>Una Pagina Facebook della tua carrozzeria</li>
          <li>Una campagna Facebook Lead Ads già attiva</li>
          <li>Accesso da computer (non da telefono)</li>
        </ul>
      </div>

      <hr className="border-border" />

      <GuideStep n={1} title="Trova l'ID della tua Pagina Facebook">
        <ol className="text-text-muted space-y-1 pl-5 list-decimal">
          <li>Apri la tua Pagina Facebook dal computer</li>
          <li>Click su <strong>Informazioni</strong> (menu a sinistra)</li>
          <li>Scorri in fondo: trovi un numero lungo chiamato <strong>ID Pagina</strong></li>
          <li>Copia quel numero e incollalo qui sopra nel campo <em>ID Pagina Facebook</em></li>
        </ol>
      </GuideStep>

      <GuideStep n={2} title="Crea il token di accesso">
        <ol className="text-text-muted space-y-1 pl-5 list-decimal">
          <li>
            Apri questo link:{" "}
            <a
              href="https://developers.facebook.com/tools/explorer/"
              target="_blank"
              rel="noopener"
              className="text-accent hover:underline"
            >
              Facebook Graph API Explorer
            </a>
          </li>
          <li>In alto a destra, click su <strong>Generate Access Token</strong></li>
          <li>Seleziona la tua Pagina dall'elenco</li>
          <li>
            Nei permessi richiesti spunta queste 2 voci:
            <div className="bg-bg-card border border-border rounded p-2 mt-1.5 font-mono text-xs">
              leads_retrieval<br />pages_manage_metadata
            </div>
          </li>
          <li>Click <strong>Generate Access Token</strong> → autorizza nella finestra che si apre</li>
          <li>Copia il token lungo che appare nel campo grande in alto</li>
          <li>Incollalo qui sopra nel campo <em>Token di accesso Pagina</em></li>
        </ol>
      </GuideStep>

      <GuideStep n={3} title="Salva le modifiche">
        <p className="text-text-muted">
          Click sul bottone <strong>Salva</strong> in basso a destra di questa pagina.
        </p>
      </GuideStep>

      <GuideStep n={4} title="Configura il webhook su Meta">
        <ol className="text-text-muted space-y-1 pl-5 list-decimal">
          <li>
            Vai su{" "}
            <a
              href="https://developers.facebook.com/apps/"
              target="_blank"
              rel="noopener"
              className="text-accent hover:underline"
            >
              Meta for Developers
            </a>
            {" "}e apri la tua app
          </li>
          <li>Menu sinistra: <strong>Webhooks</strong></li>
          <li>Seleziona <strong>Page</strong> nel dropdown</li>
          <li>Click <strong>Subscribe to this object</strong></li>
          <li>
            Incolla i 2 valori qui sotto:
            <div className="mt-3 space-y-3">
              <CopyField
                label="URL Callback"
                value={webhookUrl}
                onCopy={() => copyToClipboard(webhookUrl, "url")}
                copied={copied === "url"}
              />
              <CopyField
                label="Verify Token"
                value={verifyToken}
                onCopy={() => copyToClipboard(verifyToken, "token")}
                copied={copied === "token"}
                mono
              />
            </div>
          </li>
          <li>Click <strong>Verify and Save</strong></li>
          <li>
            Nella lista <strong>leadgen</strong> click <strong>Subscribe</strong>
          </li>
        </ol>
      </GuideStep>

      <GuideStep n={5} title="Verifica che funzioni">
        <p className="text-text-muted">
          Usa il{" "}
          <a
            href="https://developers.facebook.com/tools/lead-ads-testing"
            target="_blank"
            rel="noopener"
            className="text-accent hover:underline"
          >
            Lead Ads Testing Tool
          </a>{" "}
          di Meta per inviare un lead di prova. Entro pochi secondi compare nella
          tua sezione <strong>Lead</strong>, colonna <strong>Nuovo</strong>.
        </p>
      </GuideStep>

      <div className="bg-accent/5 border border-accent/20 rounded p-3 text-xs text-text-muted">
        <strong className="text-accent">Hai dubbi?</strong> Contatta il supporto
        tecnico o passa questi 5 passi al tuo consulente social.
      </div>
    </div>
  );
}

function GuideStep({
  n,
  title,
  children,
}: {
  n: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h3 className="font-semibold flex items-center gap-2 mb-2">
        <span className="w-6 h-6 rounded-full bg-accent/20 text-accent text-xs font-bold flex items-center justify-center shrink-0">
          {n}
        </span>
        {title}
      </h3>
      <div className="ml-8 text-sm">{children}</div>
    </div>
  );
}

function CopyField({
  label,
  value,
  onCopy,
  copied,
  mono,
}: {
  label: string;
  value: string;
  onCopy: () => void;
  copied: boolean;
  mono?: boolean;
}) {
  return (
    <div>
      <label className="block text-[11px] font-medium text-text-muted mb-1">
        {label}
      </label>
      <div className="flex gap-2">
        <input
          type="text"
          value={value}
          readOnly
          className={cn(
            "input-base flex-1 text-xs",
            mono && "font-mono"
          )}
        />
        <button
          onClick={onCopy}
          className="btn-secondary shrink-0 py-2"
        >
          {copied ? (
            <Check className="w-3.5 h-3.5 text-emerald-400" />
          ) : (
            <Copy className="w-3.5 h-3.5" />
          )}
          {copied ? "Copiato" : "Copia"}
        </button>
      </div>
    </div>
  );
}
