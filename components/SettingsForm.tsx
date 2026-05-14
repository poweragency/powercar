"use client";

import { useState } from "react";
import { Save, Facebook, Copy, Check, AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/types/database.types";

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

  const origin = typeof window !== "undefined" ? window.location.origin : "https://TUO-DOMINIO.com";
  const webhookUrl = `${origin}/api/webhooks/facebook`;
  const verifyToken = profile?.fb_verify_token ?? "—";

  return (
    <div className="max-w-3xl mx-auto p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold">Impostazioni</h1>
        <p className="text-sm text-text-muted mt-1">
          Account e integrazioni della tua carrozzeria
        </p>
      </div>

      {/* Profilo */}
      <div className="card p-6 mb-6">
        <h2 className="text-base font-semibold mb-4">Carrozzeria</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1.5">
              Nome carrozzeria *
            </label>
            <input
              type="text"
              value={workshopName}
              onChange={(e) => setWorkshopName(e.target.value)}
              className="input-base"
              placeholder="Carrozzeria Rossi"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1.5">
              Email account
            </label>
            <input
              type="email"
              value={userEmail}
              disabled
              className="input-base opacity-60 cursor-not-allowed"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1.5">
              Telefono
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="input-base"
              placeholder="06 1234567"
            />
          </div>
        </div>
      </div>

      {/* FB Integration */}
      <div className="card p-6 mb-6">
        <div className="flex items-center gap-2 mb-1">
          <Facebook className="w-4 h-4 text-blue-500" />
          <h2 className="text-base font-semibold">Integrazione Facebook Lead Ads</h2>
        </div>
        <p className="text-xs text-text-muted mb-5">
          Configura per ricevere automaticamente i lead delle tue Facebook Ads dentro il CRM.
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1.5">
              Facebook Page ID
            </label>
            <input
              type="text"
              value={fbPageId}
              onChange={(e) => setFbPageId(e.target.value.trim())}
              className="input-base font-mono text-sm"
              placeholder="123456789012345"
            />
            <p className="text-[11px] text-text-subtle mt-1">
              Lo trovi su <code className="text-text">Facebook Page → Informazioni → ID Pagina</code>
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium text-text-muted mb-1.5">
              Page Access Token
            </label>
            <input
              type="password"
              value={fbToken}
              onChange={(e) => setFbToken(e.target.value.trim())}
              className="input-base font-mono text-sm"
              placeholder="EAAxxxxxxxx..."
            />
            <p className="text-[11px] text-text-subtle mt-1">
              Generabile dal <a href="https://developers.facebook.com/tools/explorer/" target="_blank" rel="noopener" className="text-accent hover:underline">Graph API Explorer</a> con permessi <code className="text-text">leads_retrieval</code> + <code className="text-text">pages_manage_metadata</code>.
            </p>
          </div>

          <div className="border-t border-border pt-5 mt-5">
            <div className="flex items-start gap-2 text-xs text-text-muted bg-blue-500/5 border border-blue-500/20 rounded-md p-3 mb-4">
              <AlertCircle className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
              <span>Inserisci questi 2 valori su <strong>Meta App → Webhooks → Page → leadgen</strong>:</span>
            </div>

            <div className="space-y-3">
              <CopyField
                label="Webhook URL (callback)"
                value={webhookUrl}
                onCopy={() => copyToClipboard(webhookUrl, "url")}
                copied={copied === "url"}
              />
              <CopyField
                label="Verify token"
                value={verifyToken}
                onCopy={() => copyToClipboard(verifyToken, "token")}
                copied={copied === "token"}
                mono
              />
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-md p-2.5 mb-4">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between sticky bottom-4 bg-bg-card/95 backdrop-blur border border-border rounded-lg px-4 py-3">
        <span className="text-xs text-text-subtle">
          {savedAt && <span className="text-emerald-400">✓ Salvato</span>}
        </span>
        <button onClick={handleSave} disabled={saving} className="btn-primary">
          <Save className="w-4 h-4" />
          {saving ? "Salvataggio..." : "Salva modifiche"}
        </button>
      </div>
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
      <label className="block text-xs font-medium text-text-muted mb-1.5">{label}</label>
      <div className="flex gap-2">
        <input
          type="text"
          value={value}
          readOnly
          className={`input-base flex-1 ${mono ? "font-mono text-sm" : ""}`}
        />
        <button onClick={onCopy} className="btn-secondary shrink-0">
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? "Copiato" : "Copia"}
        </button>
      </div>
    </div>
  );
}
