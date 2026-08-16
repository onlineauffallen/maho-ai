// src/lib/chatService.ts
// Agenten-Schleife: Nachricht + Tools an die API, Tool-Calls clientseitig
// gegen die Stores ausführen, Ergebnisse zurückgeben, bis eine Textantwort kommt.
import { getToolDefinitions, executeTool, type ToolAction, type ToolErgebnis } from './tools';
import type { Vorschlag } from './vorschlaege';
import { apiUrl } from './api';

type ApiMessage = {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  tool_calls?: { id: string; type: 'function'; function: { name: string; arguments: string } }[];
  tool_call_id?: string;
};

/**
 * Welche Werkzeuge in diesem Gespräch erlaubt sind. Im Alltag sind das Termine
 * und Aufgaben, im Kennenlerngespräch nur das Profil. Beides läuft durch dieselbe
 * Schleife, damit es nur eine Stelle gibt, die Tool-Calls abarbeitet.
 */
export type ToolSet = {
  definitions: () => unknown[];
  execute: (name: string, args: Record<string, unknown>) => ToolErgebnis;
};

export const alltagsWerkzeuge: ToolSet = {
  definitions: getToolDefinitions,
  execute: executeTool,
};

const MAX_TOOL_ROUNDS = 5;
const ZEITLIMIT_MS = 30_000;

/** Unterscheidbare Fehler, damit die Oberfläche etwas Brauchbares sagen kann. */
export type FehlerArt = 'offline' | 'zeitueberschreitung' | 'abgebrochen' | 'ausgelastet' | 'server';

export class ChatFehler extends Error {
  constructor(public art: FehlerArt, nachricht: string) {
    super(nachricht);
  }
}

async function callApi(messages: ApiMessage[], tools: unknown[] | undefined, signal?: AbortSignal) {
  // Ohne eigenes Zeitlimit wartet fetch endlos. Vorher hing die App in dem Fall
  // mit gesperrter Eingabe und drehendem Rad, ohne jeden Ausweg.
  const uhr = new AbortController();
  const timer = setTimeout(() => uhr.abort(), ZEITLIMIT_MS);
  const abbruchDurchNutzer = () => uhr.abort();
  signal?.addEventListener('abort', abbruchDurchNutzer);

  try {
    const res = await fetch(apiUrl('/api/openai-chat'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ purpose: 'chat', messages, ...(tools?.length ? { tools } : {}) }),
      signal: uhr.signal,
    });

    if (!res.ok) {
      const { error } = await res.json().catch(() => ({ error: res.statusText }));
      if (res.status === 429) throw new ChatFehler('ausgelastet', error || 'Zu viele Anfragen');
      throw new ChatFehler('server', error || 'Fehler beim KI-API-Call');
    }

    const { message } = await res.json();
    return message as ApiMessage;
  } catch (e) {
    if (e instanceof ChatFehler) throw e;
    if (e instanceof Error && e.name === 'AbortError') {
      // War es der Nutzer oder die Uhr? Der Unterschied entscheidet, ob eine
      // Fehlermeldung angezeigt wird oder gar nichts.
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
  systemPrompt,
  history,
  userInput,
  toolset = alltagsWerkzeuge,
  signal,
}: {
  systemPrompt: string;
  history: { role: 'user' | 'assistant'; content: string }[];
  userInput: string;
  toolset?: ToolSet;
  /** Zum Abbrechen durch den Nutzer. */
  signal?: AbortSignal;
}): Promise<{ text: string; actions: ToolAction[]; vorschlaege: Vorschlag[] }> {
  const messages: ApiMessage[] = [
    { role: 'system', content: systemPrompt },
    ...history,
    { role: 'user', content: userInput },
  ];
  const actions: ToolAction[] = [];
  const vorschlaege: Vorschlag[] = [];

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    // In der letzten erlaubten Runde ohne Tools fragen. Das erzwingt eine
    // Textantwort statt der Abbruchmeldung unten und spart die Tool-Definitionen
    // im Prompt, die in einer reinen Zusammenfassung nichts zu suchen haben.
    const letzteRunde = round === MAX_TOOL_ROUNDS - 1;
    const message = await callApi(messages, letzteRunde ? undefined : toolset.definitions(), signal);

    if (message.tool_calls?.length) {
      messages.push(message);
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
        messages.push({ role: 'tool', tool_call_id: call.id, content: result });
      }
      continue; // nächste Runde: KI sieht die Tool-Ergebnisse
    }

    return { text: message.content ?? '', actions, vorschlaege };
  }

  return {
    text: 'Ich habe die Aktionen ausgeführt, bin aber beim Zusammenfassen ins Limit gelaufen.',
    actions,
    vorschlaege,
  };
}
