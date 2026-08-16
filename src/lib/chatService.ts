// src/lib/chatService.ts
// Agenten-Schleife: Nachricht + Tools an die API, Tool-Calls clientseitig
// gegen die Stores ausführen, Ergebnisse zurückgeben, bis eine Textantwort kommt.
import { getToolDefinitions, executeTool, ToolAction } from './tools';

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
  execute: (name: string, args: Record<string, unknown>) => { result: string; action?: ToolAction };
};

export const alltagsWerkzeuge: ToolSet = {
  definitions: getToolDefinitions,
  execute: executeTool,
};

const MAX_TOOL_ROUNDS = 5;

async function callApi(messages: ApiMessage[], tools: unknown[] | undefined) {
  const res = await fetch('/api/openai-chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ purpose: 'chat', messages, ...(tools?.length ? { tools } : {}) }),
  });
  if (!res.ok) {
    const { error } = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(error || 'Fehler beim KI-API-Call');
  }
  const { message } = await res.json();
  return message as ApiMessage;
}

export async function runMahoAgent({
  systemPrompt,
  history,
  userInput,
  toolset = alltagsWerkzeuge,
}: {
  systemPrompt: string;
  history: { role: 'user' | 'assistant'; content: string }[];
  userInput: string;
  toolset?: ToolSet;
}): Promise<{ text: string; actions: ToolAction[] }> {
  const messages: ApiMessage[] = [
    { role: 'system', content: systemPrompt },
    ...history,
    { role: 'user', content: userInput },
  ];
  const actions: ToolAction[] = [];

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    // In der letzten erlaubten Runde ohne Tools fragen. Das erzwingt eine
    // Textantwort statt der Abbruchmeldung unten und spart die Tool-Definitionen
    // im Prompt, die in einer reinen Zusammenfassung nichts zu suchen haben.
    const letzteRunde = round === MAX_TOOL_ROUNDS - 1;
    const message = await callApi(messages, letzteRunde ? undefined : toolset.definitions());

    if (message.tool_calls?.length) {
      messages.push(message);
      for (const call of message.tool_calls) {
        let args: Record<string, unknown> = {};
        try {
          args = JSON.parse(call.function.arguments || '{}');
        } catch {
          /* leere Args */
        }
        const { result, action } = toolset.execute(call.function.name, args);
        if (action) actions.push(action);
        messages.push({ role: 'tool', tool_call_id: call.id, content: result });
      }
      continue; // nächste Runde: KI sieht die Tool-Ergebnisse
    }

    return { text: message.content ?? '', actions };
  }

  return {
    text: 'Ich habe die Aktionen ausgeführt, bin aber beim Zusammenfassen ins Limit gelaufen.',
    actions,
  };
}
