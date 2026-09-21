import { chatMigrieren, useChatStore } from '../src/lib/chatStore.ts';

let fehler = 0;
function pruef(name: string, ok: boolean, info = '') {
  if (!ok) fehler++;
  console.log(`${ok ? '✓' : '✗'} ${name}${ok || !info ? '' : `\n    ${info}`}`);
}

const alt = { messages: [{ sender: 'user', text: 'Hi' }, { sender: 'maho', text: 'Servus', actions: ['📅 Termin'] }] };
const neu = chatMigrieren(alt);
pruef('alter Verlauf bekommt IDs', neu.messages.every((m) => typeof m.id === 'string' && m.id.length > 0));
pruef('die IDs sind verschieden', new Set(neu.messages.map((m) => m.id)).size === 2);
pruef('Text, Absender und Aktionen bleiben', neu.messages[1].text === 'Servus' && neu.messages[1].sender === 'maho' && neu.messages[1].actions?.[0] === '📅 Termin');
pruef('vorhandene ID bleibt', chatMigrieren({ messages: [{ id: 'x', sender: 'user', text: 'a' }] }).messages[0].id === 'x');
pruef('kaputter Zustand ergibt den Anfangsverlauf', chatMigrieren(undefined).messages.length === 1 && chatMigrieren({}).messages[0].sender === 'maho');

useChatStore.getState().leeren();
useChatStore.getState().addMessage({ sender: 'user', text: 'a' });
useChatStore.getState().addMessage({ sender: 'maho', text: 'b' });
const ids = useChatStore.getState().messages.map((m) => m.id);
pruef('neue Nachrichten bekommen eindeutige IDs', new Set(ids).size === ids.length && ids.every(Boolean), JSON.stringify(ids));

useChatStore.getState().leeren();
for (let i = 0; i < 260; i++) useChatStore.getState().addMessage({ sender: 'user', text: `n${i}` });
const m = useChatStore.getState().messages;
pruef('bei 200 wird vorne gekürzt, die neueste bleibt', m.length === 200 && m.at(-1)?.text === 'n259');
useChatStore.getState().leeren();

if (fehler) {
  console.error(`${fehler} Fehler`);
  process.exit(1);
}
