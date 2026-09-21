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

/**
 * Verbrauchsbudget je Zugangscode und Tag.
 *
 * Die Anfragenzahl allein deckelt die Kosten nicht: eine einzelne Anfrage mit
 * langem Verlauf und fünf Werkzeugrunden kostet ein Vielfaches einer kurzen.
 * Gezählt wird deshalb, was der Anbieter meldet, als gewichtete Token:
 * Eingabe zählt einfach, Ausgabe vierfach (Annahme: Ausgabe kostet bei den
 * gängigen Modellen ein Mehrfaches der Eingabe, die genauen Preise stehen
 * nicht im Code). Zwischengespeicherte Eingabe zählt zu einem Zehntel.
 *
 * Grenzen: gleicher Speicher wie die Ratenbegrenzung, also je Serverprozess
 * und nach einem Neustart bei null. Für eine Beta mit wenigen Codes reicht
 * das, für den Store gehört es in eine Datenbank.
 *
 * Der Wert ist absichtlich großzügig: ein aktiver Nutzer mit 20 Nachrichten
 * am Tag liegt bei rund 100.000, die Grenze fängt Ausreißer und Schleifen ab,
 * nicht normale Nutzung. Einstellbar über MAHO_TAGESBUDGET und
 * MAHO_TAGESBUDGET_GESAMT.
 */
function zahlAusUmgebung(name: string, standard: number): number {
  const wert = Number(process.env[name]);
  return Number.isFinite(wert) && wert > 0 ? wert : standard;
}

const BUDGET_JE_CODE = zahlAusUmgebung('MAHO_TAGESBUDGET', 400_000);
const BUDGET_GESAMT = zahlAusUmgebung('MAHO_TAGESBUDGET_GESAMT', 3_000_000);

type Tagesverbrauch = { tag: string; einheiten: number };
const verbrauch = new Map<string, Tagesverbrauch>();
const GESAMT = '__gesamt__';

const tagesschluessel = (jetzt: number) => new Date(jetzt).toISOString().slice(0, 10);

function heute(schluessel: string, jetzt: number): Tagesverbrauch {
  const tag = tagesschluessel(jetzt);
  const alt = verbrauch.get(schluessel);
  if (alt && alt.tag === tag) return alt;
  const neu = { tag, einheiten: 0 };
  verbrauch.set(schluessel, neu);
  return neu;
}

export type Nutzung = { prompt_tokens?: number; completion_tokens?: number; prompt_tokens_details?: { cached_tokens?: number } };

/** Gewichtete Einheiten einer Antwort, wie sie der Anbieter in `usage` meldet. */
export function einheiten(nutzung: Nutzung | undefined): number {
  if (!nutzung) return 0;
  const rein = Math.max(0, nutzung.prompt_tokens ?? 0);
  const zwischengespeichert = Math.min(rein, Math.max(0, nutzung.prompt_tokens_details?.cached_tokens ?? 0));
  const aus = Math.max(0, nutzung.completion_tokens ?? 0);
  return Math.round(rein - zwischengespeichert + zwischengespeichert * 0.1 + aus * 4);
}

export function budgetPruefen(code: string, jetzt = Date.now()): LimitErgebnis {
  const bisDahin = Math.ceil((Date.parse(`${tagesschluessel(jetzt)}T00:00:00Z`) + 86_400_000 - jetzt) / 1000);
  if (heute(GESAMT, jetzt).einheiten >= BUDGET_GESAMT) {
    return { erlaubt: false, grund: 'Heute ist der Assistent ausgelastet, morgen wieder', sekunden: bisDahin };
  }
  if (heute(code, jetzt).einheiten >= BUDGET_JE_CODE) {
    return { erlaubt: false, grund: 'Tagesbudget aufgebraucht', sekunden: bisDahin };
  }
  return { erlaubt: true };
}

/** Bucht nach der Antwort. Die Prüfung davor lässt die letzte Anfrage über die Grenze laufen, das ist gewollt. */
export function verbrauchBuchen(code: string, nutzung: Nutzung | undefined, jetzt = Date.now()) {
  const n = einheiten(nutzung);
  heute(code, jetzt).einheiten += n;
  heute(GESAMT, jetzt).einheiten += n;
}

export function budgetZuruecksetzen() {
  verbrauch.clear();
}
