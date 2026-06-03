#!/usr/bin/env node
/**
 * Setup ambiente di sviluppo su Windows quando il repo gira da un drive di rete.
 *
 * PROBLEMA
 * --------
 * Qui si lavora dal server (es. drive Z: mappato su \\Pa-server\progetti\...).
 * `cmd.exe` NON supporta i percorsi UNC come directory corrente: quando un tool
 * (npm/npx/lint-staged invocati dagli hook git) viene avviato con CWD = UNC,
 * cmd ripiega su C:\Windows e gli hook husky falliscono con
 * "Current directory is not a git directory!".
 *
 * FIX
 * ---
 * La chiave di registro DisableUNCCheck = 1 dice a cmd.exe di accettare un
 * percorso UNC come CWD invece di scappare su C:\Windows. È in HKCU (nessun
 * permesso di admin) ed è reversibile. Una volta impostata, l'intera catena
 * (commit + hook husky + qualsiasi tool che usa cmd) funziona.
 *
 * Caratteristiche di questo script:
 *  - no-op su sistemi non-Windows (es. CI Linux), così non rompe `npm install`/`npm ci`;
 *  - idempotente: se la chiave è già a 1 non fa nulla;
 *  - usa reg.exe via execFile (niente shell cmd), quindi funziona anche PRIMA del fix;
 *  - non fallisce mai: qualsiasi errore è solo un warning, l'install prosegue.
 *
 * Si lancia da solo via `postinstall`, oppure manualmente con `npm run setup:dev`.
 */
import { execFileSync } from "node:child_process";

const REG_KEY = "HKCU\\Software\\Microsoft\\Command Processor";
const REG_VALUE = "DisableUNCCheck";

function log(msg) {
  console.log(`[setup-windows-dev] ${msg}`);
}

if (process.platform !== "win32") {
  // Niente da fare fuori da Windows (la CI gira su Linux).
  process.exit(0);
}

try {
  // Leggi il valore attuale (se la chiave/valore non esiste, reg query esce != 0).
  let current = null;
  try {
    const out = execFileSync("reg", ["query", REG_KEY, "/v", REG_VALUE], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    const m = out.match(/DisableUNCCheck\s+REG_DWORD\s+0x([0-9a-fA-F]+)/);
    if (m) current = parseInt(m[1], 16);
  } catch {
    current = null; // valore non presente
  }

  if (current === 1) {
    log("OK: DisableUNCCheck è già attiva. Nessuna modifica necessaria.");
    process.exit(0);
  }

  execFileSync(
    "reg",
    [
      "add",
      REG_KEY,
      "/v",
      REG_VALUE,
      "/t",
      "REG_DWORD",
      "/d",
      "1",
      "/f",
    ],
    { stdio: ["ignore", "ignore", "pipe"] }
  );

  log(
    "Fatto: impostata DisableUNCCheck=1 (HKCU). cmd.exe ora accetta i percorsi UNC " +
      "come directory corrente — gli hook git/husky funzioneranno dal drive di rete."
  );
  log("Per annullare: reg delete \"" + REG_KEY + "\" /v " + REG_VALUE + " /f");
} catch (err) {
  // Non bloccare mai l'install: segnala soltanto.
  log(
    "ATTENZIONE: impossibile impostare DisableUNCCheck automaticamente " +
      `(${err?.message ?? err}). Se lavori da un drive di rete e gli hook git ` +
      'falliscono, lancia manualmente: npm run setup:dev'
  );
  process.exit(0);
}
