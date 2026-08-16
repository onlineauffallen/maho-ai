// src/server/schutz.ts
//
// Zugang und Ratenbegrenzung.
//
// Ohne das ist der Endpunkt ein kostenloser Sprachmodell-Zugang auf fremde
// Rechnung: wer die Adresse kennt, kann ihn in einer Schleife abrufen, und
// auffallen würde es erst auf der Abrechnung.

/**
 * Zugelassene Zugangscodes, kommagetrennt in MAHO_ZUGANG.
 *
 * Für eine Beta mit wenigen Testern reicht das: jeder bekommt einen Code, ein
 * missbrauchter lässt sich einzeln streichen. Ein echtes Kontosystem ersetzt
 * das später, die Stelle bleibt dieselbe.
 */
const CODES = (process.env.MAHO_ZUGANG ?? '')
  .split(',')
  .map((c) => c.trim())
  .filter(Boolean);

/** Ohne gesetzte Codes läuft alles offen. Das ist nur in der Entwicklung vertretbar. */
export const zugangOffen = CODES.length === 0;

export type Absender = { code: string; geraet: string };

export function absenderPruefen(req: Request): Absender | undefined {
  const kopf = req.headers.get('authorization') ?? '';
  const code = kopf.startsWith('Bearer ') ? kopf.slice(7).trim() : '';
  const geraet = (req.headers.get('x-maho-geraet') ?? '').slice(0, 64) || 'unbekannt';

  if (zugangOffen) return { code: 'offen', geraet };
  if (!code || !CODES.includes(code)) return undefined;
  return { code, geraet };
}

/**
 * Ratenbegrenzung im Arbeitsspeicher.
 *
 * Wichtige Einschränkung: das gilt je Serverprozess. Läuft die App später auf
 * mehreren Instanzen oder serverlos, greift es nur teilweise, dann gehört der
 * Zähler in einen gemeinsamen Speicher wie Redis. Für einen einzelnen Server
 * und eine Beta ist es wirksam, und es ist besser als gar nichts.
 */
const PRO_MINUTE = 12;
const PRO_TAG = 300;

type Zaehler = { minute: number; minuteAb: number; tag: number; tagAb: number };
const zaehler = new Map<string, Zaehler>();

export type LimitErgebnis = { erlaubt: true } | { erlaubt: false; grund: string; sekunden: number };

export function limitPruefen(schluessel: string, jetzt = Date.now()): LimitErgebnis {
  const z = zaehler.get(schluessel) ?? { minute: 0, minuteAb: jetzt, tag: 0, tagAb: jetzt };

  if (jetzt - z.minuteAb >= 60_000) {
    z.minute = 0;
    z.minuteAb = jetzt;
  }
  if (jetzt - z.tagAb >= 86_400_000) {
    z.tag = 0;
    z.tagAb = jetzt;
  }

  if (z.minute >= PRO_MINUTE) {
    zaehler.set(schluessel, z);
    return {
      erlaubt: false,
      grund: 'zu viele Anfragen in kurzer Zeit',
      sekunden: Math.ceil((60_000 - (jetzt - z.minuteAb)) / 1000),
    };
  }
  if (z.tag >= PRO_TAG) {
    zaehler.set(schluessel, z);
    return {
      erlaubt: false,
      grund: 'Tageskontingent aufgebraucht',
      sekunden: Math.ceil((86_400_000 - (jetzt - z.tagAb)) / 1000),
    };
  }

  z.minute += 1;
  z.tag += 1;
  zaehler.set(schluessel, z);
  return { erlaubt: true };
}

/** Nur fürs Aufräumen in Tests. */
export function limitZuruecksetzen() {
  zaehler.clear();
}
