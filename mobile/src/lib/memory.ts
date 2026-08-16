// src/lib/memory.ts
// Persistentes, größenbegrenztes Gedächtnis. Nach jedem Wortwechsel entscheidet
// ein Evaluierungsschritt, was (verdichtet) gespeichert wird - Kernidee von Maho.
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { appStorage } from './storage';
import { apiUrl, zugangsKopf } from './api';

export const MAX_MEMORY_CHARS = 1500;

type MemoryState = {
  memory: string;
  setMemory: (m: string) => void;
};

export const useMemoryStore = create<MemoryState>()(
  persist(
    (set) => ({
      memory: '',
      setMemory: (m) => set({ memory: m.slice(0, MAX_MEMORY_CHARS) }),
    }),
    { name: 'maho-memory', storage: appStorage }
  )
);

/**
 * Auswertungen laufen streng nacheinander.
 *
 * Vorher konnten sich zwei überholen: beide lesen denselben alten Stand, die
 * später zurückkommende schreibt ihn samt ihrer Ergänzung, und alles, was die
 * andere gelernt hatte, ist weg. Wer schnell zwei Nachrichten schickt, hat
 * genau das ausgelöst.
 */
let warteschlange: Promise<void> = Promise.resolve();

/** Bewertet den letzten Wortwechsel und aktualisiert das Gedächtnis (fire-and-forget). */
export function evaluateAndUpdateMemory(userText: string, assistantText: string): Promise<void> {
  warteschlange = warteschlange.then(() => bewerten(userText, assistantText));
  return warteschlange;
}

async function bewerten(userText: string, assistantText: string) {
  // Zustand erst hier lesen, nicht beim Einreihen: sonst arbeitet die zweite
  // Auswertung wieder mit dem Stand von vor der ersten.
  const { memory, setMemory } = useMemoryStore.getState();
  try {
    const res = await fetch(apiUrl('/api/openai-chat'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...zugangsKopf() },
      body: JSON.stringify({
        // Eigener Zweck: günstigeres Modell, kürzere Antwortgrenze, eigener
        // Prompt. Alles davon entscheidet der Server.
        zweck: 'memory',
        kontext: { memory },
        eingabe: `User: ${userText}\nMaho: ${assistantText}`,
      }),
    });
    if (!res.ok) return;
    const { message } = await res.json();
    const text: string = (message?.content ?? '').trim();
    if (!text || text === 'UNVERÄNDERT') return;

    // Ein Gedächtnis, das plötzlich fast leer ist, ist kein Ergebnis, sondern
    // ein Ausrutscher des Modells. Lieber den alten Stand behalten.
    if (memory.length > 200 && text.length < memory.length * 0.4) {
      console.warn('Gedächtnis-Auswertung verworfen: Ergebnis unplausibel kurz');
      return;
    }
    setMemory(text);
  } catch {
    // Gedächtnis-Update darf den Chat nie blockieren oder brechen
  }
}
