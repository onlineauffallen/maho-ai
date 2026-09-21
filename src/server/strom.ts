// src/server/strom.ts
//
// Liest den Antwortstrom des Anbieters (Server-Sent Events) und macht daraus
// zwei Sorten Ereignisse: Textstücke, die sofort weitergehen, und am Ende die
// fertig zusammengesetzte Nachricht mit Werkzeugaufrufen und Verbrauch.
//
// Werkzeugaufrufe kommen als Bruchstücke: Name und Argumente treffen in vielen
// kleinen Deltas ein, mit einem Index als einzigem Zusammenhalt. Erst die
// Summe ist ein gültiger Aufruf, deshalb geht davon nichts vorab an die App.

export type Werkzeugaufruf = { id: string; type: 'function'; function: { name: string; arguments: string } };
export type Nachricht = { role: 'assistant'; content: string | null; tool_calls?: Werkzeugaufruf[] };

export type Ereignis =
  | { art: 'text'; text: string }
  | { art: 'fertig'; message: Nachricht; usage: unknown };

export async function* stromLesen(body: ReadableStream<Uint8Array>): AsyncGenerator<Ereignis> {
  const dekoder = new TextDecoder();
  const leser = body.getReader();
  let rest = '';
  let inhalt = '';
  let usage: unknown;
  const aufrufe: Werkzeugaufruf[] = [];

  function zeile(z: string): string | undefined {
    if (!z.startsWith('data:')) return undefined;
    const daten = z.slice(5).trim();
    if (!daten || daten === '[DONE]') return undefined;
    let chunk: {
      choices?: { delta?: { content?: string | null; tool_calls?: { index: number; id?: string; function?: { name?: string; arguments?: string } }[] } }[];
      usage?: unknown;
    };
    try {
      chunk = JSON.parse(daten);
    } catch {
      return undefined;
    }
    if (chunk.usage) usage = chunk.usage;
    const delta = chunk.choices?.[0]?.delta;
    for (const tc of delta?.tool_calls ?? []) {
      const a = (aufrufe[tc.index] ??= { id: '', type: 'function', function: { name: '', arguments: '' } });
      if (tc.id) a.id = tc.id;
      if (tc.function?.name) a.function.name += tc.function.name;
      if (tc.function?.arguments) a.function.arguments += tc.function.arguments;
    }
    if (delta?.content) {
      inhalt += delta.content;
      return delta.content;
    }
    return undefined;
  }

  for (;;) {
    const { done, value } = await leser.read();
    if (done) break;
    rest += dekoder.decode(value, { stream: true });
    const zeilen = rest.split('\n');
    rest = zeilen.pop() ?? '';
    for (const z of zeilen) {
      const text = zeile(z.replace(/\r$/, ''));
      if (text) yield { art: 'text', text };
    }
  }
  rest += dekoder.decode();
  if (rest.trim()) {
    const text = zeile(rest.trim());
    if (text) yield { art: 'text', text };
  }

  const vollstaendig = aufrufe.filter(Boolean);
  yield {
    art: 'fertig',
    message: {
      role: 'assistant',
      content: inhalt || null,
      ...(vollstaendig.length ? { tool_calls: vollstaendig } : {}),
    },
    usage,
  };
}
