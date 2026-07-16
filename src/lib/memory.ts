// src/lib/memory.ts
// Persistentes, größenbegrenztes Gedächtnis. Nach jedem Wortwechsel entscheidet
// ein Evaluierungsschritt, was (verdichtet) gespeichert wird - Kernidee von Maho.
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { buildMemoryEvalPrompt } from './promptBuilder';

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
    { name: 'maho-memory', storage: createJSONStorage(() => localStorage) }
  )
);

/** Bewertet den letzten Wortwechsel und aktualisiert das Gedächtnis (fire-and-forget). */
export async function evaluateAndUpdateMemory(userText: string, assistantText: string) {
  const { memory, setMemory } = useMemoryStore.getState();
  try {
    const res = await fetch('/api/openai-chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [
          { role: 'system', content: buildMemoryEvalPrompt({ currentMemory: memory, maxChars: MAX_MEMORY_CHARS }) },
          { role: 'user', content: `User: ${userText}\nMaho: ${assistantText}` },
        ],
      }),
    });
    if (!res.ok) return;
    const { message } = await res.json();
    const text: string = (message?.content ?? '').trim();
    if (text && text !== 'UNVERÄNDERT') setMemory(text);
  } catch {
    // Gedächtnis-Update darf den Chat nie blockieren oder brechen
  }
}
