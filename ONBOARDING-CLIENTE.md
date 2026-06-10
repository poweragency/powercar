# PowerCar — Onboarding cliente (Facebook Lead Ads)

Procedura ripetibile per collegare i lead Facebook di un **nuovo cliente** (carrozzeria/officina) a PowerCar.

> **Principio chiave:** la pagina FB del cliente deve essere un **asset del Business Manager Poweragency**.
> Così l'app la legge in **Standard Access** → **niente App Review**. Se la pagina NON è nel BM,
> servirebbe l'Advanced Access (App Review): da evitare, porta sempre la pagina nel BM.

---

## Riferimenti (setup una-tantum, già fatto)

| Cosa | Valore |
|---|---|
| App Meta | **PowerCar** — App ID `2018849399007901` — **Live (pubblicata)** |
| Webhook callback | `https://powercar.poweragency.it/api/webhooks/facebook` (oggetto Page, campo `leadgen`) |
| Firma | `FB_APP_SECRET` su Vercel (handler valida HMAC) |
| System User (backend) | **PowerCar Backend** (BM Poweragency) — usato per generare i page token |
| Business Manager | Poweragency — `business_id 116455286049125` (verificato) |
| Tenant nel CRM | tabella `workshops` (lead instradati per `fb_page_id`) |

---

## Procedura per OGNI cliente nuovo

### 1. Porta la pagina del cliente nel BM Poweragency
**Business Settings → Account → Pagine → Aggiungi** → richiedi accesso alla pagina (o il cliente la condivide).
Deve risultare con **controllo completo / di proprietà di Poweragency** (è ciò che la rende un *business asset*).

### 2. Assegna la pagina al System User
**Business Settings → Utenti di sistema → PowerCar Backend → Aggiungi risorse** → seleziona la **pagina** del cliente → **controllo completo** (+ accesso ai lead).

### 3. Genera il Page Access Token della pagina
**Graph API Explorer** (developers.facebook.com/tools/explorer):
- App = **PowerCar**, incolla il **System User token** nel campo "Token d'accesso"
- `GET /{PAGE_ID}?fields=access_token` → copia il valore `access_token` (è il **Page token**)

*(In alternativa via shell, senza Explorer:)*
```bash
curl -sS "https://graph.facebook.com/v21.0/{PAGE_ID}?fields=access_token&access_token={SYSTEM_USER_TOKEN}"
```

### 4. Iscrivi la pagina all'app PowerCar
Con il **Page token** del passo 3:
```bash
curl -sS -X POST "https://graph.facebook.com/v21.0/{PAGE_ID}/subscribed_apps" \
  --data-urlencode "subscribed_fields=leadgen" \
  --data-urlencode "access_token={PAGE_TOKEN}"
# atteso: {"success":true}
```

### 5. Salva i dati nel workshop del cliente
Nel CRM (crm-officina), sul **workshop** del cliente:
- `fb_page_id` = `{PAGE_ID}`
- `fb_page_access_token` = `{PAGE_TOKEN}` (campo **write-only** in /settings)
- `fb_verify_token` = già auto-generato per il workshop

Via **/settings → Collegamento Facebook Ads** (modo consigliato, write-only).

### 6. Verifica
- **Lead Ads Testing Tool** (developers.facebook.com/tools/lead-ads-testing) → pagina del cliente → "Crea contatto" → deve risultare **success** e il lead appare nei `leads` del suo workshop con nome/email/telefono.
- Oppure attendi il **primo lead reale** dalle sue inserzioni.

---

## Note / gotcha

- **Niente App Review** finché le pagine sono asset del BM Poweragency (Standard Access).
- Il **System User token** NON va salvato nel CRM: è la "chiave madre", la usi solo per generare i page token. Tienila nel password manager. *(Se in futuro si automatizza l'onboarding, andrebbe come secret di backend, es. `FB_SYSTEM_USER_TOKEN`.)*
- Nel CRM (workshop) ci va **solo il PAGE token**.
- Rigenerare il System User token **invalida i page token derivati** → andrebbero ri-generati e ri-salvati nei workshop.
- Il `<test lead: ...>` che vedi nei lead di prova è il dato finto del Testing Tool; i lead veri hanno dati reali.
- La pagina deve avere un **Modulo istantaneo** (Instant Form) attivo perché il Testing Tool generi lead.
