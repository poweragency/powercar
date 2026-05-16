"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { Upload, Trash2, Wrench, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

interface Props {
  userId: string;
  currentLogoUrl: string | null;
  onChange: (url: string | null) => void;
}

const MAX_BYTES = 2 * 1024 * 1024;
const ALLOWED = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];

export function LogoUploader({ userId, currentLogoUrl, onChange }: Props) {
  const supabase = createClient();
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function pickFile() {
    fileRef.current?.click();
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!ALLOWED.includes(file.type)) {
      toast.error("Formato non supportato", {
        description: "Usa PNG, JPG, WEBP o SVG.",
      });
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error("Logo troppo grande", { description: "Max 2 MB." });
      return;
    }
    setBusy(true);
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "png";
    const path = `${userId}/logo-${Date.now()}.${ext}`;
    const { error } = await supabase.storage
      .from("branding")
      .upload(path, file, { upsert: true, contentType: file.type });
    if (error) {
      toast.error("Upload fallito", { description: error.message });
      setBusy(false);
      return;
    }
    const { data } = supabase.storage.from("branding").getPublicUrl(path);
    onChange(data.publicUrl);
    setBusy(false);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function handleRemove() {
    if (!currentLogoUrl) return;
    setBusy(true);
    // Estraggo il path dal publicUrl
    const marker = "/branding/";
    const idx = currentLogoUrl.indexOf(marker);
    if (idx !== -1) {
      const path = currentLogoUrl.slice(idx + marker.length);
      await supabase.storage.from("branding").remove([path]);
    }
    onChange(null);
    setBusy(false);
  }

  return (
    <div className="flex items-center gap-4">
      <div className="w-20 h-20 rounded-lg border border-border bg-bg-input flex items-center justify-center overflow-hidden shrink-0">
        {currentLogoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={currentLogoUrl}
            alt="Logo"
            className="w-full h-full object-contain"
          />
        ) : (
          <Wrench className="w-8 h-8 text-text-subtle" strokeWidth={1.5} />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={pickFile}
            disabled={busy}
            className="btn-secondary text-xs"
          >
            {busy ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Upload className="w-3.5 h-3.5" />
            )}
            {currentLogoUrl ? "Cambia logo" : "Carica logo"}
          </button>
          {currentLogoUrl && (
            <button
              type="button"
              onClick={handleRemove}
              disabled={busy}
              className="btn-ghost text-xs text-status-danger hover:bg-status-danger/10"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Rimuovi
            </button>
          )}
        </div>
        <p className="text-[11px] text-text-subtle mt-1.5">
          PNG, JPG, WEBP o SVG · max 2 MB · ideale 512×512px
        </p>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept={ALLOWED.join(",")}
        className="hidden"
        onChange={handleFile}
      />
    </div>
  );
}
