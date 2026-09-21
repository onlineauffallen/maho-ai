// src/lib/chatService.ts
//
// Die Agenten-Schleife. Sie schickt Daten an den eigenen Server, bekommt eine
// Antwort mit Werkzeugaufrufen zurück, führt diese hier gegen die lokalen
// Stores aus und reicht die Ergebnisse weiter, bis Text kommt.
//
// Was hier bewusst NICHT mehr passiert: den System-Prompt bauen und den
// Werkzeugkatalog mitschicken. Beides kommt vom Server. Vorher konnte jeder,
// der die Adresse kannte, beides ersetzen und hatte damit einen freien
// Assistenten auf fremde Rechnung.
import { executeTool, type ToolAction, type ToolErgebnis } from './tools';
import type { Vorschlag } from './vorschlaege';
import { apiUrl, zugangsKopf } from './api';

type Werkzeugaufruf = { id: string; type: 'function'; function: { name: string; arguments: string } };
type Antwort = { content: string | null; tool_calls?: Werkzeugaufruf[] };

export type ToolSet = {
  /** Welcher Katalog auf dem Server gelten soll. */
  zweck: 'chat' | 'onboarding';
  execute: (name: string, args: Record<string, unknown>) => ToolErgebnis;
};

export const alltagsWerkzeuge: ToolSet = { zweck: 'chat', execute: executeTool };

const MAX_TOOL_ROUNDS = 5;
const ZEITLIMIT_MS = 30_000;

export type FehlerArt = 'offline' | 'zeitueberschreitung' | 'abgebrochen' | 'ausgelastet' | 'kein-zugang' | 'server';

export class ChatFehler extends Error {
  constructor(public art: FehlerArt, nachricht: string) {
    super(nachricht);
  }
}

/** Was der Server über den Nutzer wissen muss, um den Prompt zu bauen. */
export type Kontext = {
  name?: string;
  basics?: string;
  memory?: string;
  categories?: string[];
  faellig?: { thema: string; kontext?: string; faelligAm: string }[];
};

type Runde = { assistent: Antwort; ergebnisse: { tool_call_id: string; name: string; result: string }[] };

/**
 * Liest den Zeilenstrom des Servers: {"text"} pro Stück, am Ende {"fertig"}
 * oder {"fehler"}. Gibt die fertige Nachricht zurück, die Stücke gehen vorher
 * einzeln an `beiText`. Wo die Plattform keinen Strom liefert (`body` fehlt),
 * kommt die ganze Antwort auf einmal und wird genauso ausgewertet.
 */
async function stromLesen(res: Response, beiText: (bisher: string) => void): Promise<Antwort> {
  let bisher = '';
  let fertig: Antwort | undefined;

  const zeile = (z: string) => {
    if (!z.trim()) return;
    let e: { text?: string; fertig?: { message: Antwort }; fehler?: string };
    try {
      e = JSON.parse(z);
    } catch {
      return;
    }
    if (e.fehler) throw new ChatFehler('server', e.fehler);
    if (e.text) {
      bisher += e.text;
      beiText(bisher);
    }
    if (e.fertig) fertig = e.fertig.message;
  };

  if (res.body) {
    const leser = res.body.getReader();
    const dekoder = new TextDecoder();
    let rest = '';
    for (;;) {
      const { done, value } = await leser.read();
      if (done) break;
      rest += dekoder.decode(value, { stream: true });
      const zeilen = rest.split('\n');
      rest = zeilen.pop() ?? '';
      zeilen.forEach(zeile);
    }
    zeile(rest + dekoder.decode());
  } else {
    (await res.text()).split('\n').forEach(zeile);
  }

  if (!fertig) throw new ChatFehler('server', 'Die Antwort ist unvollständig angekommen.');
  return fertig;
}

async function anfragen(
  koerper: Record<string, unknown>,
  signal?: AbortSignal,
  beiText?: (bisher: string) => void
): Promise<Antwort> {
  const uhr = new AbortController();
  const timer = setTimeout(() => uhr.abort(), ZEITLIMIT_MS);
  const abbruchDurchNutzer = () => uhr.abort();
  signal?.addEventListener('abort', abbruchDurchNutzer);

  try {
    const res = await fetch(apiUrl('/api/openai-chat'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...zugangsKopf() },
      body: JSON.stringify(beiText ? { ...koerper, stream: true } : koerper),
      signal: uhr.signal,
    });

    if (!res.ok) {
      const { error } = await res.json().catch(() => ({ error: res.statusText }));
      if (res.status === 401) throw new ChatFehler('kein-zugang', error || 'Kein Zugang');
      if (res.status === 429) throw new ChatFehler('ausgelastet', error || 'Zu viele Anfragen');
      throw new ChatFehler('server', error || 'Fehler beim Aufruf');
    }

    if (beiText) return await stromLesen(res, beiText);

    const { message } = await res.json();
    return message as Antwort;
  } catch (e) {
    if (e instanceof ChatFehler) throw e;
    if (e instanceof Error && e.name === 'AbortError') {
      throw signal?.aborted
        ? new ChatFehler('abgebrochen', 'Abgebrochen')
        : new ChatFehler('zeitueberschreitung', 'Zeitüberschreitung');
    }
    throw new ChatFehler('offline', 'Keine Verbindung');
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', abbruchDurchNutzer);
  }
}

export async function runMahoAgent({
  kontext,
  verlauf,
  eingabe,
  toolset = alltagsWerkzeuge,
  keineVorschlaege = false,
  letzteRunde = false,
  beiText,
  signal,
}: {
  kontext: Kontext;
  verlauf: { rolle: 'user' | 'maho'; text: string }[];
  eingabe: string;
  toolset?: ToolSet;
  keineVorschlaege?: boolean;
  /** Nur im Kennenlernen: die App beendet nach dieser Antwort. */
  letzteRunde?: boolean;
  /** Bekommt den bisher eingetroffenen Antworttext, sobald er wächst. Leer, wenn eine neue Runde beginnt. */
  beiText?: (bisher: string) => void;
  signal?: AbortSignal;
}): Promise<{ text: string; actions: ToolAction[]; vorschlaege: Vorschlag[] }> {
  const actions: ToolAction[] = [];
  const vorschlaege: Vorschlag[] = [];
  const runden: Runde[] = [];

  for (let runde = 0; runde < MAX_TOOL_ROUNDS; runde++) {
    beiText?.('');
    const message = await anfragen(
      { zweck: toolset.zweck, kontext, verlauf, eingabe, runden, keineVorschlaege, letzteRunde },
      signal,
      beiText
    );

    if (message.tool_calls?.length) {
      const ergebnisse: Runde['ergebnisse'] = [];
      for (const call of message.tool_calls) {
        let args: Record<string, unknown> = {};
        try {
          args = JSON.parse(call.function.arguments || '{}');
        } catch {
          /* leere Args */
        }
        const { result, action, vorschlag } = toolset.execute(call.function.name, args);
        if (action) actions.push(action);
        if (vorschlag) vorschlaege.push(vorschlag);
        ergebnisse.push({ tool_call_id: call.id, name: call.function.name, result });
      }
      runden.push({ assistent: message, ergebnisse });
      continue;
    }

    return { text: message.content ?? '', actions, vorschlaege };
  }

  return {
    text: 'Ich habe die Aktionen ausgeführt, bin aber beim Zusammenfassen ins Limit gelaufen.',
    actions,
    vorschlaege,
  };
}
