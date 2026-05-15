import Link from "next/link";
import { CheckCircle2, AlertTriangle, Wrench, ArrowRight } from "lucide-react";

interface Props {
  searchParams: Promise<{ error?: string }>;
}

export default async function EmailConfirmedPage({ searchParams }: Props) {
  const { error } = await searchParams;
  const hasError = !!error;

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg p-6">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center">
            <Wrench className="w-5 h-5 text-white" strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-lg font-semibold">CRM Officina</h1>
            <p className="text-xs text-text-subtle">Gestione lead &amp; pratiche</p>
          </div>
        </div>

        <div className="card p-6 text-center">
          {hasError ? (
            <>
              <div className="w-14 h-14 rounded-full bg-red-500/15 text-red-400 flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-7 h-7" strokeWidth={2} />
              </div>
              <h2 className="text-xl font-semibold mb-2">Verifica non riuscita</h2>
              <p className="text-sm text-text-muted mb-6">
                Il link potrebbe essere scaduto o già usato. Prova ad accedere
                direttamente — se l&apos;email è confermata l&apos;account è già attivo.
              </p>
              <p className="text-[11px] text-text-subtle mb-4 font-mono">
                {error}
              </p>
            </>
          ) : (
            <>
              <div className="w-14 h-14 rounded-full bg-emerald-500/15 text-emerald-400 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-7 h-7" strokeWidth={2} />
              </div>
              <h2 className="text-xl font-semibold mb-2">Email verificata!</h2>
              <p className="text-sm text-text-muted mb-6">
                Il tuo account è ora attivo. Torna alla pagina di login per
                accedere al CRM.
              </p>
            </>
          )}

          <Link
            href="/login"
            className="btn-primary w-full inline-flex items-center justify-center gap-2"
          >
            Vai al login
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
