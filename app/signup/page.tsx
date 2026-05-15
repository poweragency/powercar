"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Wrench } from "lucide-react";

export default function SignupPage() {
  const router = useRouter();
  const supabase = createClient();
  const [workshopName, setWorkshopName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) {
      setError("La password deve avere almeno 6 caratteri");
      return;
    }
    setLoading(true);
    setError(null);

    // Usa il dominio production se siamo su localhost, così il link
    // nell'email funziona anche aperto da cellulare.
    const origin =
      typeof window !== "undefined" && window.location.hostname !== "localhost"
        ? window.location.origin
        : "https://crm-carrozzerie.vercel.app";

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${origin}/auth/confirm`,
        data: {
          workshop_name: workshopName,
          full_name: workshopName,
        },
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    // Se Supabase ha "Confirm email" attivo, l'utente riceve email di conferma
    if (data.session) {
      router.push("/dashboard");
      router.refresh();
    } else {
      setSuccess(true);
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg p-6">
        <div className="card p-8 max-w-sm text-center">
          <h2 className="text-lg font-semibold mb-2">Controlla la tua email</h2>
          <p className="text-sm text-text-muted mb-6">
            Ti abbiamo inviato un link di conferma a <span className="text-text">{email}</span>.
            Clicca per attivare l&apos;account.
          </p>
          <Link href="/login" className="btn-primary w-full">
            Vai al login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg p-6">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center">
            <Wrench className="w-5 h-5 text-white" strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-lg font-semibold">CRM Officina</h1>
            <p className="text-xs text-text-subtle">Crea il tuo account</p>
          </div>
        </div>

        <div className="card p-6">
          <h2 className="text-xl font-semibold mb-1">Registrati</h2>
          <p className="text-sm text-text-muted mb-6">
            Il tuo CRM, isolato e privato.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1.5">
                Nome carrozzeria *
              </label>
              <input
                type="text"
                value={workshopName}
                onChange={(e) => setWorkshopName(e.target.value)}
                required
                className="input-base"
                placeholder="Carrozzeria Rossi"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-text-muted mb-1.5">
                Email *
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="input-base"
                placeholder="tu@carrozzeria.it"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-text-muted mb-1.5">
                Password *
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="new-password"
                minLength={6}
                className="input-base"
                placeholder="Min. 6 caratteri"
              />
            </div>

            {error && (
              <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-md p-2.5">
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? "Creazione..." : "Crea account"}
            </button>
          </form>

          <div className="mt-5 pt-5 border-t border-border text-center">
            <span className="text-xs text-text-subtle">Hai già un account? </span>
            <Link href="/login" className="text-xs text-accent hover:underline">
              Accedi
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
