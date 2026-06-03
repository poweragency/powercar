# 🔒 TODO Sicurezza

Cose **ancora da fare** emerse dall'audit di sicurezza. I fix già applicati sono
nel commit `e6c67ff` (`fix(sicurezza): hardening da audit ...`) e nel secondo giro
di audit del **2026-06-03** (vedi sezione 0 qui sotto).

> Legenda priorità: 🔴 da fare subito · 🟡 a breve · 🟢 quando capita
> Aggiorna la casella `[ ]` → `[x]` quando completi un punto.

---

## 0. ✅ Secondo giro di audit (2026-06-03) — 2 falle GRAVI chiuse

Un secondo audit ha trovato **due buchi di controllo accessi** che il primo giro
non aveva intercettato. **Entrambi già corretti** (codice + DB). Riepilogo + cosa
deve fare manualmente l'operatore.

### 0.1 🔴→✅ CRITICO — Privilege escalation via `profiles`

**Il problema:** la policy RLS `profiles_update_own` lasciava modificare la propria
riga senza restrizione di colonna, e nessun trigger proteggeva `role`/`workshop_id`.
Un dipendente, dalla console del browser, poteva fare
`supabase.from('profiles').update({ role: 'owner' })` e diventare titolare (oppure
spostarsi in un altro workshop con `update({ workshop_id })`).

**Il fix:** trigger DB `trg_guard_profile_cols` (funzione
`guard_profile_privileged_cols`) che **blocca** ogni modifica a `role`/`workshop_id`
fatta da un utente loggato. Il `service_role` (route `/api/admin/*` e `/api/team/*`,
che cambiano la mansione) ha `auth.uid()` NULL e resta libero.
Testato sul DB: escalation bloccata ✅, cambio mansione legittimo da `/team` ok ✅.

### 0.2 🔴→✅ ALTO — Token Facebook leggibile dai dipendenti

**Il problema:** `fb_page_access_token` (Page Access Token Meta) e `fb_verify_token`
erano leggibili da **qualsiasi** membro del workshop, anche i dipendenti
(RLS non filtra per colonna). Esposizione reale: 2 workshop con token salvato,
4 dipendenti. Un dipendente poteva leggere il token e leggere i lead / agire come la
Pagina.

**Il fix:**
- rimosse le copie legacy dei token da `profiles` (la fonte di verità è `workshops`);
- revocata la `SELECT` di tabella su `workshops` e ri-concessa **solo sulle colonne
  non sensibili** (i token restano leggibili solo dal `service_role`/webhook);
- il **page access token è ora write-only** nel form Impostazioni: non viene più
  mostrato; l'owner lo re-inserisce solo se vuole cambiarlo;
- il `verify_token` (serve all'owner per configurare il webhook Meta) si legge da una
  RPC owner-only `get_workshop_fb_secrets()`.

### ⚠️ Cosa deve fare l'operatore (manuale)

- [x] **Deploy del codice.** ✅ Live su Vercel (auto-deploy da `main`). Smoke HTTP 200
  su `/login` confermato 2026-06-03.
- [x] **Migration nel repo già pronta:**
  `supabase/migrations/20260603120000_fix_audit_profiles_guard_and_fb_token.sql`.
  Il DB live è già patchato (applicata via MCP, **riverificata via MCP il 2026-06-03**:
  trigger `trg_guard_profile_cols` presente, colonne legacy rimosse da `profiles`,
  RPC `get_workshop_fb_secrets()` presente, SELECT su `fb_*_token` solo a
  `postgres`/`service_role`). La migration è **idempotente**: un eventuale
  `supabase db push` futuro la ri-applica senza danni.
- [x] **Token FB già impostati restano validi** (non sono stati toccati, solo nascosti
  alla lettura). Nessun owner deve re-inserire il token, a meno che non voglia
  cambiarlo. Il campo ora mostra `•••••••• (già impostato)`.
- [ ] (Verifica facoltativa) Dopo il deploy, da owner: apri **Impostazioni → guida FB**
  e controlla che il **Verify Token** sia mostrato correttamente (arriva dalla nuova
  RPC) e che salvare i dati fiscali funzioni.

---

## 1. 🔴 Configurare le env var in PRODUZIONE (Vercel)

I fix sono nel codice, ma **alcuni si attivano solo se le variabili sono impostate**
nell'ambiente di produzione. Senza queste, il comportamento è più debole (o, per il
webhook, bloccato di proposito).

- [ ] **`FB_APP_SECRET`** — App Secret di Meta. **Obbligatoria** se ricevi lead da
  Meta Ads. Da quando è attivo il fix #2, il webhook Facebook **rifiuta tutte le
  richieste** (HTTP 500) se questa var non è impostata: senza, i lead da Facebook NON
  entrano. → Meta for Developers → la tua App → Impostazioni → Di base → "Chiave
  segreta". _(Rimandato dall'owner il 2026-06-03 — da fare prima di rimettere live
  campagne Meta.)_

- [x] **`UPSTASH_REDIS_REST_URL`** + **`UPSTASH_REDIS_REST_TOKEN`** — rate limiting
  distribuito. ✅ Configurate su Vercel (Production) + redeploy effettuato il
  2026-06-03 (smoke prod HTTP 200 dopo redeploy). DB Redis free tier creato su
  Upstash. Ricorda: le stesse credenziali **non vanno tenute in `.env.local`** per non
  condividere counter dev↔prod; in locale il fallback in-memory basta.

- [ ] Verificare che siano già impostate (e corrette) in Vercel: `SUPABASE_SERVICE_ROLE_KEY`,
  `RESEND_API_KEY`, `RESEND_FROM_EMAIL`.

> ℹ️ All'avvio il server logga un warning con l'elenco delle var opzionali mancanti
> (vedi `instrumentation.ts`). Controlla i log di deploy dopo il prossimo rilascio.

---

## 2. 🔴 Aggiornamento `xlsx` sui PC dei collaboratori

Il fix #1 ha spostato `xlsx` alla build ufficiale SheetJS (chiude prototype
pollution + ReDoS). È già in `package.json`/`package-lock.json`, ma chi ha già il
repo in locale deve **reinstallare** per allinearsi:

- [ ] Ogni collaboratore, dopo `git pull`, lancia:
  ```bash
  npm install
  ```
  (scaricherà `xlsx` dalla CDN SheetJS — è normale, è il metodo raccomandato dagli autori).
  _PC owner (Mattia): ✅ fatto 2026-06-03 (`npm audit --omit=dev` → 0 vulnerabilità).
  Mancano gli altri collaboratori._
- [ ] In caso di problemi di rete con la CDN, il comando esplicito è:
  ```bash
  npm i https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz
  ```

---

## 3. 🟡 CSP nonce-based (fix #5 dell'audit — rimandato)

**Stato:** non fatto, di proposito. Gravità **BASSA**.

La Content-Security-Policy attuale (`next.config.ts`) usa
`script-src 'self' 'unsafe-inline' 'unsafe-eval'`. `unsafe-inline`/`unsafe-eval`
indeboliscono la protezione XSS. Oggi **non c'è XSS attiva** (nessun
`dangerouslySetInnerHTML`, React fa escaping di default), quindi è solo difesa in
profondità.

Non è stato fatto subito perché una CSP nonce-based con Next App Router ha **alto
rischio di rompere l'hydration**: va testata con cura.

- [ ] Implementare CSP con nonce (nonce generato nel middleware e propagato agli
  script Next), rimuovendo `unsafe-inline` da `script-src`.
- [ ] Testare a fondo: hydration, font Inter, `@react-pdf/renderer`, upload immagini.
- [ ] `'unsafe-eval'` potrebbe restare necessario per alcune librerie: verificare prima di rimuoverlo.

---

## 4. 🟢 Vulnerabilità dev-only (`npm audit`)

`npm audit` segnala alcune vuln nella catena **esbuild → vite → vitest** (il runner
dei test). **NON finiscono in produzione** (`npm audit --omit=dev` → 0 vulnerabilità),
quindi non sono urgenti. Riguardano solo il dev server locale.

- [ ] Quando esce una major stabile compatibile, aggiornare `vitest`
  (oggi `audit fix --force` proporrebbe `vitest@4` — breaking, da NON fare ora).
- [ ] Ricontrollare a ogni bump di `next` se `postcss` può tornare senza `overrides`.

---

## 5. 🟢 Migliorie opzionali (difesa in profondità)

Non sono vulnerabilità sfruttabili oggi, ma alzano l'asticella.

- [x] **Token FB nel form Settings** — ✅ FATTO il 2026-06-03 (vedi sez. 0.2). Il
  campo è ora write-only e il token non è più leggibile né dal client né dai
  dipendenti. (La nota originale sottostimava il rischio: il token era leggibile da
  TUTTI i membri del workshop, non solo dall'owner.)
- [ ] **Token nell'URL Graph API** (`app/api/webhooks/facebook/route.ts`): l'
  `access_token` è in query string; in caso di errore loggato potrebbe finire nei
  log server. Valutare di non loggare il body grezzo della risposta Graph.
- [ ] **Sanitizzazione errori nelle route admin/team**: le route `/api/admin/*` e
  `/api/team/*` rimandano ancora alcuni `error.message` di Supabase. Sono gated
  (admin/owner) e i messaggi sono per lo più UX utili, ma valutare di genericizzare
  i path 500 (errori DB).

---

## Come verificare lo stato di sicurezza in qualsiasi momento

```bash
npm run type-check          # tipi OK
npm test                    # 47 test
npm run build               # build di produzione
npm audit --omit=dev        # deve dire: found 0 vulnerabilities
```

## Cosa è GIÀ stato sistemato (NON regredire)

- ✅ Webhook FB: verifica firma HMAC **obbligatoria** (fail-closed).
- ✅ Rate limiting: `rateLimitDistributed()` (Upstash + fallback in-memory).
- ✅ `postcss` patchato (override a 8.5.x).
- ✅ `xlsx` su build CDN SheetJS 0.20.3.
- ✅ Validazione env all'avvio (`instrumentation.ts`).
- ✅ Stop leak errori grezzi su `/api/invoices` e `/api/notifications/case-status`.
- ✅ **Privilege escalation `profiles` chiusa** (trigger `trg_guard_profile_cols`):
  `role`/`workshop_id` non sono auto-modificabili dall'utente (2026-06-03).
- ✅ **Token FB nascosto ai dipendenti** + write-only nel form (2026-06-03).
- ✅ **Upstash Redis attivo in produzione** (`UPSTASH_REDIS_REST_URL`/`_TOKEN`
  configurate su Vercel + redeploy, 2026-06-03): rate-limit ora condiviso tra le
  istanze serverless, niente più counter "fasulli" per-istanza.

> Già solido prima dell'audit (da non rompere): RLS su tutte le tabelle, isolamento
> multi-tenant via `workshop_id`, middleware default-deny, `getUser()` server-side,
> cookie httpOnly, storage privato con limiti MIME/dimensione, query parametrizzate.
