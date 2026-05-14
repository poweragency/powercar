# CRM Officina / Carrozzeria

CRM minimal per officina meccanica/carrozzeria. Gestione lead da Facebook Ads → Kanban → cliente → pratica officina → documenti.

## Stack

- **Next.js 15** (App Router, Server Components)
- **React 19** + **TypeScript**
- **TailwindCSS** (dark theme, accent arancione)
- **Supabase** (Auth + Postgres + Storage + Realtime)
- **dnd-kit** (Kanban drag & drop)

## Setup

### 1. Installa le dipendenze

```bash
npm install
```

### 2. Variabili d'ambiente

Copia `.env.example` in `.env.local` e compila:

```bash
cp .env.example .env.local
```

**Variabili richieste:**

| Variabile | Dove la trovi |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API → Project API keys → `anon`/`publishable` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API → Project API keys → `service_role` (**solo server, non esporlo**) |
| `FB_WEBHOOK_VERIFY_TOKEN` | Stringa segreta a tua scelta — la metti uguale in Meta App Webhook setup |
| `FB_APP_SECRET` | Meta App → Settings → Basic → App Secret |
| `FB_PAGE_ACCESS_TOKEN` | Meta Graph API Explorer → Page Access Token con permessi `leads_retrieval`, `pages_manage_metadata`, `pages_show_list` |

Il progetto Supabase è già configurato:
- URL: `https://jconofgquajgzylcfnfg.supabase.co`
- Nome: **CRM-CARROZZERIA**
- Org: POWER AGENCY

### 3. Crea il primo utente

Supabase Auth è in modalità invite-only. Crea l'utente admin manualmente:

1. Vai su Supabase Dashboard → **Authentication → Users → Add user**
2. Inserisci email + password
3. Disattiva "Auto Confirm User" se vuoi inviarti l'email di conferma, altrimenti spunta "Auto Confirm User"
4. Il trigger `handle_new_user` creerà automaticamente il profilo

### 4. Avvia

```bash
npm run dev
```

Apri http://localhost:3000 e accedi con le credenziali create al passo 3.

---

## Struttura del progetto

```
.
├── app/
│   ├── (app)/                     # Route protette (richiede login)
│   │   ├── layout.tsx             # Sidebar + auth guard
│   │   ├── dashboard/             # KPI cards + ultimi lead/pratiche
│   │   ├── leads/                 # Kanban dnd-kit
│   │   ├── customers/             # Tabella clienti
│   │   └── cases/
│   │       ├── page.tsx           # Lista pratiche
│   │       └── [id]/              # Dettaglio + docs + note
│   ├── api/
│   │   └── webhooks/facebook/     # Webhook FB Lead Ads
│   ├── auth/signout/              # POST /auth/signout
│   ├── login/                     # Pagina login
│   ├── layout.tsx                 # Root layout (dark theme)
│   └── globals.css
├── components/                    # UI components
├── lib/
│   ├── supabase/                  # client.ts, server.ts, admin.ts, middleware.ts
│   ├── constants.ts               # Label/colori status
│   └── utils.ts
├── types/
│   └── database.types.ts          # Tipi generati da Supabase
├── middleware.ts                  # Auth middleware (redirect /login)
├── tailwind.config.ts
└── package.json
```

---

## Database schema

6 tabelle in schema `public`:

- **`profiles`** — estende `auth.users`
- **`leads`** — incoming lead (FB o manuali). Status: `nuovo | contattato | preventivo | cliente | perso`
- **`customers`** — creati automaticamente quando lead passa a `cliente`
- **`cases`** — pratiche officina. Status: `preventivo | attesa_pezzi | lavorazione | completata | consegnata`
- **`documents`** — file caricati su bucket Storage `documents`
- **`notes`** — note testuali su lead o pratica (vincolo: una sola FK valorizzata)

**Trigger automatici:**
- `handle_lead_to_customer` — quando lead → `cliente`, crea customer + case
- `handle_new_user` — alla registrazione auth, crea profile
- `set_updated_at` — aggiorna `updated_at` su leads/customers/cases

**RLS:** single-tenant, tutti gli utenti autenticati vedono tutto.

**Storage bucket:** `documents` (privato, max 10MB, immagini + PDF).

---

## Configurazione Facebook Lead Ads

### 1. Crea un'app Meta

1. Vai su https://developers.facebook.com/apps/
2. Crea app tipo "Business"
3. Aggiungi prodotto **Webhooks**

### 2. Configura il webhook

1. Webhooks → Page → Subscribe to fields → `leadgen`
2. URL: `https://TUO-DOMINIO.com/api/webhooks/facebook`
3. Verify token: lo stesso valore di `FB_WEBHOOK_VERIFY_TOKEN` nel `.env.local`
4. Meta farà un GET → la route risponde con `hub.challenge` → ✅ verified

### 3. Sottoscrivi la Pagina al webhook

```bash
curl -X POST "https://graph.facebook.com/v18.0/{PAGE_ID}/subscribed_apps?subscribed_fields=leadgen&access_token={PAGE_ACCESS_TOKEN}"
```

### 4. Test

Usa il **Lead Ads Testing Tool** di Meta per simulare un lead:
https://developers.facebook.com/tools/lead-ads-testing

Il lead apparirà nel CRM nella colonna "Nuovo" entro pochi secondi (subscription Realtime).

---

## Comandi utili

```bash
npm run dev        # avvia in dev
npm run build      # build production
npm run start      # avvia build production
npm run lint       # linter
npm run types      # rigenera types/database.types.ts (richiede supabase CLI)
```

---

## Deploy

### Vercel (consigliato)

1. Push del repo su GitHub
2. Importa su Vercel
3. Aggiungi le env vars
4. Deploy

Il webhook Facebook richiede HTTPS pubblico — Vercel lo fornisce automaticamente.

### Self-host

```bash
npm run build
npm start
```

Configura un reverse proxy (Nginx/Caddy) con HTTPS verso `localhost:3000`.

---

## Flusso operativo

```
   [Facebook Lead Ads]
         │
         ▼
   POST /api/webhooks/facebook ──→ supabase.leads (status=nuovo)
                                          │
                                          ▼
                                    Kanban /leads
                                          │
                              [drag → "Cliente"]
                                          │
                                          ▼
                          trigger: handle_lead_to_customer
                                          │
                                          ▼
                              supabase.customers + cases (status=preventivo)
                                          │
                                          ▼
                                    /cases/[id]
                                  (upload docs, note,
                                   cambio stato fino a "consegnata")
```

---

## Personalizzazione

- **Colori/tema:** [tailwind.config.ts](tailwind.config.ts) → sezione `theme.extend.colors`
- **Labels status:** [lib/constants.ts](lib/constants.ts)
- **Aggiungere status:** modifica enum in Postgres + aggiorna `constants.ts`

---

## License

Proprietary — POWER AGENCY
