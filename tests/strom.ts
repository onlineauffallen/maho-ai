import { stromLesen, type Ereignis } from '../src/server/strom.ts';

let fehler = 0;
function pruef(name: string, ok: boolean, info = '') {
  if (!ok) fehler++;
  console.log(`${ok ? '✓' : '✗'} ${name}${ok || !info ? '' : `\n    ${info}`}`);
}

/** Stellt einen Antwortstrom aus Brocken zusammen, die an beliebiger Stelle enden dürfen. */
function strom(brocken: string[]): ReadableStream<Uint8Array> {
  const enc = new TextEncoder();
  return new ReadableStream({
    start(c) {
      for (const b of brocken) c.enqueue(enc.encode(b));
      c.close();
    },
  });
}
async function alle(s: ReadableStream<Uint8Array>): Promise<Ereignis[]> {
  const aus: Ereignis[] = [];
  for await (const e of stromLesen(s)) aus.push(e);
  return aus;
}
const zeile = (o: unknown) => `data: ${JSON.stringify(o)}\n\n`;

// Reiner Text, an ungünstiger Stelle zerschnitten (mitten im JSON und mitten im Umlaut)
const t1 = zeile({ choices: [{ delta: { role: 'assistant', content: 'Ser' } }] });
const t2 = zeile({ choices: [{ delta: { content: 'vus, schön' } }] });
const t3 = zeile({ choices: [], usage: { prompt_tokens: 10, completion_tokens: 3 } });
const roh = t1 + t2 + t3 + 'data: [DONE]\n\n';
const bytes = new TextEncoder().encode(roh);
const schnitt = roh.indexOf('ö') ; // Umlaut zwei Bytes, Schnitt dazwischen
const schnittByte = new TextEncoder().encode(roh.slice(0, schnitt)).length + 1;
const enc = new ReadableStream<Uint8Array>({
  start(c) {
    c.enqueue(bytes.slice(0, 40));
    c.enqueue(bytes.slice(40, schnittByte));
    c.enqueue(bytes.slice(schnittByte));
    c.close();
  },
});
let e = await alle(enc);
const texte = e.filter((x) => x.art === 'text').map((x) => (x as { text: string }).text).join('');
const ende = e.at(-1) as Extract<Ereignis, { art: 'fertig' }>;
pruef('Textstücke kommen einzeln und ergeben zusammen den Satz', texte === 'Servus, schön', texte);
pruef('am Ende steht die vollständige Nachricht', ende.art === 'fertig' && ende.message.content === 'Servus, schön' && !ende.message.tool_calls);
pruef('der Verbrauch aus dem letzten Stück kommt an', JSON.stringify(ende.usage) === '{"prompt_tokens":10,"completion_tokens":3}');

// Werkzeugaufruf in Bruchstücken, zwei Aufrufe parallel
e = await alle(
  strom([
    zeile({ choices: [{ delta: { tool_calls: [{ index: 0, id: 'call_a', type: 'function', function: { name: 'add_todo', arguments: '' } }] } }] }),
    zeile({ choices: [{ delta: { tool_calls: [{ index: 0, function: { arguments: '{"text":"Mi' } }] } }] }),
    zeile({ choices: [{ delta: { tool_calls: [{ index: 1, id: 'call_b', type: 'function', function: { name: 'list_state', arguments: '{}' } }] } }] }),
    zeile({ choices: [{ delta: { tool_calls: [{ index: 0, function: { arguments: 'lch"}' } }] } }] }),
  ])
);
const f = e.at(-1) as Extract<Ereignis, { art: 'fertig' }>;
pruef('kein Text vorab bei reinem Werkzeugaufruf', e.every((x) => x.art === 'fertig'));
pruef('Inhalt ist null bei reinem Werkzeugaufruf', f.message.content === null);
pruef('beide Aufrufe sind da, in Reihenfolge des Index', f.message.tool_calls?.length === 2 && f.message.tool_calls[0].id === 'call_a' && f.message.tool_calls[1].function.name === 'list_state');
pruef('Argumente sind aus den Bruchstücken zusammengesetzt und gültiges JSON', JSON.parse(f.message.tool_calls![0].function.arguments).text === 'Milch');

// Windows-Zeilenenden, Kommentarzeilen, kaputte Zeile dazwischen
e = await alle(strom([': ping\r\n\r\n', 'data: {kaputt\r\n\r\n', 'data: ' + JSON.stringify({ choices: [{ delta: { content: 'ok' } }] }) + '\r\n\r\n']));
pruef('Kommentare und kaputte Zeilen werden übersprungen', (e[0] as { text: string }).text === 'ok' && e.length === 2);

// Letzte Zeile ohne Zeilenumbruch
e = await alle(strom(['data: ' + JSON.stringify({ choices: [{ delta: { content: 'Ende' } }] })]));
pruef('letzte Zeile ohne Umbruch geht nicht verloren', (e[0] as { text: string }).text === 'Ende');

// Leerer Strom
e = await alle(strom([]));
pruef('leerer Strom ergibt eine leere Nachricht statt eines Absturzes', e.length === 1 && (e[0] as Extract<Ereignis, { art: 'fertig' }>).message.content === null);

if (fehler) {
  console.error(`${fehler} Fehler`);
  process.exit(1);
}
