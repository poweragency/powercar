"use client";

import { useMemo, useState } from "react";
import { Save, Copy, Check, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { profileFormSchema, type ProfileFormValues } from "@/lib/schemas";
import type { Profile } from "@/types/database.types";
import { cn } from "@/lib/utils";
import { LogoUploader } from "./LogoUploader";

interface Props {
  initialProfile: Profile;
  userEmail: string;
  /** Verify token del webhook FB (letto via RPC owner-only, non più dal profilo). */
  fbVerifyToken: string;
  /** True se un page access token è già impostato (il valore non è leggibile). */
  hasAccessToken: boolean;
}

export function SettingsForm({
  initialProfile,
  userEmail,
  fbVerifyToken,
  hasAccessToken,
}: Props) {
  const supabase = useMemo(() => createClient(), []);
  const [profile, setProfile] = useState<Profile>(initialProfile);
  const [form, setForm] = useState<ProfileFormValues>({
    workshop_name: initialProfile.workshop_name ?? "",
    phone: initialProfile.phone ?? null,
    vat_number: initialProfile.vat_number ?? null,
    tax_code: initialProfile.tax_code ?? null,
    address: initialProfile.address ?? null,
    city: initialProfile.city ?? null,
    postal_code: initialProfile.postal_code ?? null,
    province: initialProfile.province ?? null,
    iban: initialProfile.iban ?? null,
    invoice_prefix: initialProfile.invoice_prefix ?? "PREV",
    fb_page_id: initialProfile.fb_page_id ?? null,
    // Write-only: il token non è leggibile (hardening audit #2). Il campo parte
    // sempre vuoto; si invia solo se l'owner ne digita uno nuovo.
    fb_page_access_token: null,
    logo_url: initialProfile.logo_url ?? null,
  });
  const [errors, setErrors] = useState<Partial<Record<keyof ProfileFormValues, string>>>(
    {}
  );
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [showGuide, setShowGuide] = useState(false);

  function setField<K extends keyof ProfileFormValues>(
    key: K,
    value: ProfileFormValues[K]
  ) {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  }

  async function handleSave() {
    const result = profileFormSchema.safeParse(form);
    if (!result.success) {
      const flat: Partial<Record<keyof ProfileFormValues, string>> = {};
      for (const issue of result.error.issues) {
        flat[issue.path[0] as keyof ProfileFormValues] = issue.message;
      }
      setErrors(flat);
      toast.error("Controlla i campi");
      return;
    }
    setSaving(true);
    // Il page access token è write-only e vive solo su workshops (non più su
    // profiles): lo separiamo dal payload del profilo.
    const { fb_page_access_token: fbToken, ...profilePayload } = result.data;

    // 1) profiles legacy (workshop_name + altri campi) — backward compat
    const { data, error } = await supabase
      .from("profiles")
      .update(profilePayload)
      .eq("id", profile.id)
      .select("*, workshop_id")
      .single();

    // 2) workshops (fonte di verità per i dati workshop)
    if (!error && data?.workshop_id) {
      const wsPayload = {
        name: result.data.workshop_name,
        phone: result.data.phone,
        vat_number: result.data.vat_number,
        tax_code: result.data.tax_code,
        address: result.data.address,
        city: result.data.city,
        postal_code: result.data.postal_code,
        province: result.data.province,
        iban: result.data.iban,
        logo_url: result.data.logo_url,
        fb_page_id: result.data.fb_page_id,
        // Token write-only: lo scriviamo solo se l'owner ne ha inserito uno
        // nuovo. Campo vuoto = "non modificare" (il valore esistente non è
        // leggibile, quindi non possiamo ri-inviarlo).
        ...(fbToken && fbToken.trim() !== ""
          ? { fb_page_access_token: fbToken.trim() }
          : {}),
      };
      const { error: wsError } = await supabase
        .from("workshops")
        .update(wsPayload)
        .eq("id", data.workshop_id);
      if (wsError) {
        setSaving(false);
        toast.error("Salvataggio workshop fallito", {
          description: wsError.message,
        });
        return;
      }
    }

    setSaving(false);
    if (error || !data) {
      toast.error("Salvataggio fallito", { description: error?.message });
      return;
    }
    setProfile(data);
    setSavedAt(Date.now());
    setTimeout(() => setSavedAt(null), 2500);
    toast.success("Impostazioni salvate");
  }

  function copyToClipboard(value: string, key: string) {
    navigator.clipboard.writeText(value);
    setCopied(key);
    setTimeout(() => setCopied(null), 1500);
  }

  const origin =
    typeof window !== "undefined" ? window.location.origin : "https://TUO-DOMINIO.com";
  const webhookUrl = `${origin}/api/webhooks/facebook`;
  const verifyToken = fbVerifyToken;

  return (
    <div className="max-w-2xl mx-auto p-8 pb-32">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold">Impostazioni</h1>
        <p className="text-sm text-text-muted mt-1">
          Account, dati fiscali e collegamento con Facebook Ads
        </p>
      </div>

      <div className="card p-6 mb-5 space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-text-subtle">
          Account
        </h2>

        <Field label="Logo officina">
          <LogoUploader
            userId={profile.id}
            currentLogoUrl={form.logo_url}
            onChange={async (url) => {
              setField("logo_url", url);
              // profiles (legacy) + workshops (fonte di verità)
              await Promise.all([
                supabase.from("profiles").update({ logo_url: url }).eq("id", profile.id),
                profile.workshop_id
                  ? supabase
                      .from("workshops")
                      .update({ logo_url: url })
                      .eq("id", profile.workshop_id)
                  : Promise.resolve(),
              ]);
              setProfile((p) => ({ ...p, logo_url: url }));
              toast.success(url ? "Logo aggiornato" : "Logo rimosso");
            }}
          />
        </Field>

        <Field label="Nome carrozzeria *" error={errors.workshop_name}>
          <input
            type="text"
            value={form.workshop_name}
            onChange={(e) => setField("workshop_name", e.target.value)}
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

        <Field label="Telefono" error={errors.phone}>
          <input
            type="tel"
            value={form.phone ?? ""}
            onChange={(e) => setField("phone", e.target.value || null)}
            className="input-base"
            placeholder="06 1234567"
          />
        </Field>
      </div>

      <div className="card p-6 mb-5 space-y-4">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-text-subtle">
            Dati fiscali (per preventivi e fatture)
          </h2>
          <p className="text-xs text-text-muted mt-1.5">
            Verranno stampati sui PDF di preventivi e fatture.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Partita IVA" error={errors.vat_number}>
            <input
              type="text"
              value={form.vat_number ?? ""}
              onChange={(e) => setField("vat_number", e.target.value || null)}
              className="input-base font-mono"
              placeholder="12345678901"
            />
          </Field>
          <Field label="Codice fiscale" error={errors.tax_code}>
            <input
              type="text"
              value={form.tax_code ?? ""}
              onChange={(e) => setField("tax_code", e.target.value || null)}
              className="input-base font-mono"
            />
          </Field>
        </div>

        <Field label="Indirizzo" error={errors.address}>
          <input
            type="text"
            value={form.address ?? ""}
            onChange={(e) => setField("address", e.target.value || null)}
            className="input-base"
            placeholder="Via Roma 1"
          />
        </Field>

        <div className="grid grid-cols-3 gap-3">
          <Field label="CAP" error={errors.postal_code}>
            <input
              type="text"
              value={form.postal_code ?? ""}
              onChange={(e) => setField("postal_code", e.target.value || null)}
              className="input-base"
            />
          </Field>
          <Field label="Città" error={errors.city}>
            <input
              type="text"
              value={form.city ?? ""}
              onChange={(e) => setField("city", e.target.value || null)}
              className="input-base"
            />
          </Field>
          <Field label="Prov." error={errors.province}>
            <input
              type="text"
              value={form.province ?? ""}
              onChange={(e) =>
                setField("province", (e.target.value || "").toUpperCase() || null)
              }
              className="input-base"
              maxLength={2}
            />
          </Field>
        </div>

        <Field label="IBAN" error={errors.iban}>
          <input
            type="text"
            value={form.iban ?? ""}
            onChange={(e) =>
              setField("iban", (e.target.value || "").toUpperCase() || null)
            }
            className="input-base font-mono"
            placeholder="IT60 X054 2811 1010 0000 0123 456"
          />
        </Field>
      </div>

      <div className="card p-6 mb-5 space-y-4">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-text-subtle">
            Collegamento Facebook Ads
          </h2>
          <p className="text-xs text-text-muted mt-1.5">
            Compila i 2 campi qui sotto per ricevere automaticamente i lead delle tue
            pubblicità Facebook.
          </p>
        </div>

        <Field label="ID Pagina Facebook" error={errors.fb_page_id}>
          <input
            type="text"
            name="fb_page_id"
            value={form.fb_page_id ?? ""}
            onChange={(e) => setField("fb_page_id", e.target.value.trim() || null)}
            className="input-base font-mono text-sm"
            placeholder="123456789012345"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            data-1p-ignore="true"
            data-lpignore="true"
            data-form-type="other"
          />
        </Field>

        <Field
          label="Token di accesso Pagina"
          error={errors.fb_page_access_token}
          hint={
            hasAccessToken
              ? "Un token è già impostato. Lascia vuoto per mantenerlo; digita un nuovo token solo per sostituirlo."
              : "Per sicurezza il token, una volta salvato, non è più leggibile."
          }
        >
          <input
            type="password"
            name="fb_page_access_token"
            value={form.fb_page_access_token ?? ""}
            onChange={(e) =>
              setField("fb_page_access_token", e.target.value.trim() || null)
            }
            className="input-base font-mono text-sm"
            placeholder={hasAccessToken ? "•••••••• (già impostato)" : "EAAxxxxx..."}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            data-1p-ignore="true"
            data-lpignore="true"
            data-form-type="other"
          />
        </Field>

        <button
          type="button"
          onClick={() => setShowGuide(!showGuide)}
          className="flex items-center gap-2 text-sm text-accent hover:underline w-full text-left"
        >
          <ChevronDown
            className={cn("w-4 h-4 transition-transform", showGuide && "rotate-180")}
          />
          {showGuide ? "Nascondi la guida passo-passo" : "Mostra la guida passo-passo"}
        </button>

        {showGuide && (
          <FacebookGuide
            webhookUrl={webhookUrl}
            verifyToken={verifyToken}
            copyToClipboard={copyToClipboard}
            copied={copied}
          />
        )}
      </div>

      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 sm:left-auto sm:translate-x-0 sm:right-8 sm:bottom-6 z-30">
        <div className="bg-bg-card border border-border rounded-lg px-4 py-3 shadow-card-hover flex items-center gap-4">
          <span className="text-xs">
            {savedAt ? (
              <span className="text-emerald-400">✓ Salvato</span>
            ) : (
              <span className="text-text-subtle">Modifiche non salvate</span>
            )}
          </span>
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-primary"
            type="button"
          >
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
  error,
  hint,
  children,
}: {
  label: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-text-muted mb-1.5">{label}</label>
      {children}
      {error && <p className="mt-1 text-[11px] text-red-400">{error}</p>}
      {!error && hint && <p className="mt-1 text-[11px] text-text-subtle">{hint}</p>}
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
          <li>
            Click su <strong>Informazioni</strong> (menu a sinistra)
          </li>
          <li>
            Scorri in fondo: trovi un numero lungo chiamato <strong>ID Pagina</strong>
          </li>
          <li>
            Copia quel numero e incollalo qui sopra nel campo <em>ID Pagina Facebook</em>
          </li>
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
          <li>
            In alto a destra, click su <strong>Generate Access Token</strong>
          </li>
          <li>Seleziona la tua Pagina dall&apos;elenco</li>
          <li>
            Nei permessi richiesti spunta queste 2 voci:
            <div className="bg-bg-card border border-border rounded p-2 mt-1.5 font-mono text-xs">
              leads_retrieval
              <br />
              pages_manage_metadata
            </div>
          </li>
          <li>
            Click <strong>Generate Access Token</strong> → autorizza nella finestra che si
            apre
          </li>
          <li>Copia il token lungo che appare nel campo grande in alto</li>
          <li>
            Incollalo qui sopra nel campo <em>Token di accesso Pagina</em>
          </li>
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
            </a>{" "}
            e apri la tua app
          </li>
          <li>
            Menu sinistra: <strong>Webhooks</strong>
          </li>
          <li>
            Seleziona <strong>Page</strong> nel dropdown
          </li>
          <li>
            Click <strong>Subscribe to this object</strong>
          </li>
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
          <li>
            Click <strong>Verify and Save</strong>
          </li>
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
          di Meta per inviare un lead di prova. Entro pochi secondi compare nella tua
          sezione <strong>Lead</strong>, colonna <strong>Nuovo</strong>.
        </p>
      </GuideStep>

      <div className="bg-accent/5 border border-accent/20 rounded p-3 text-xs text-text-muted">
        <strong className="text-accent">Hai dubbi?</strong> Contatta il supporto tecnico o
        passa questi 5 passi al tuo consulente social.
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
          className={cn("input-base flex-1 text-xs", mono && "font-mono")}
        />
        <button onClick={onCopy} className="btn-secondary shrink-0 py-2" type="button">
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
