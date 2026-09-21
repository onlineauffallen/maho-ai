// src/lib/chatStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { appStorage } from './storage';
import type { Vorschlag } from './vorschlaege';
import { newId } from './ids';

export type ChatMessage = {
  /** Stabile Kennung, damit die Liste Nachrichten auch nach dem Kürzen wiedererkennt. */
  id: string;
  sender: 'user' | 'maho';
  text: string;
  actions?: string[];
  /** Offene Vorschläge zu dieser Nachricht. Verschwinden, sobald entschieden. */
  vorschlaege?: Vorschlag[];
};

// 50 war zu knapp: nach zwei Wochen Nutzung fehlte der Anfang, ohne jeden
// Hinweis. Der Verlauf, der an das Modell geht, ist davon unabhängig und
// bleibt bei den letzten zehn Nachrichten.
const MAX_MESSAGES = 200;

const initialMessages: ChatMessage[] = [
  { id: 'start', sender: 'maho', text: 'Hi! Wie kann ich dir helfen?' },
];

/** Hebt einen gespeicherten Verlauf ohne IDs auf die aktuelle Fassung. */
export function chatMigrieren(persisted: unknown): { messages: ChatMessage[] } {
  const roh = (persisted as { messages?: Partial<ChatMessage>[] } | undefined)?.messages;
  if (!Array.isArray(roh)) return { messages: initialMessages };
  return {
    ...(persisted as object),
    messages: roh.map((m) => ({ ...m, id: m.id ?? newId() })) as ChatMessage[],
  };
}

type ChatState = {
  messages: ChatMessage[];
  addMessage: (message: Omit<ChatMessage, 'id'>) => void;
  /**
   * Der Nutzer hat über einen Vorschlag entschieden. Die Karte verschwindet,
   * und bei Annahme bleibt eine Zeile stehen, die sagt was passiert ist.
   */
  vorschlagAbschliessen: (vorschlagId: string, ergebnis?: string) => void;
  leeren: () => void;
};

export const useChatStore = create<ChatState>()(
  persist(
    (set) => ({
      messages: initialMessages,

      addMessage: (message) =>
        set((s) => ({ messages: [...s.messages, { ...message, id: newId() }].slice(-MAX_MESSAGES) })),

      vorschlagAbschliessen: (vorschlagId, ergebnis) =>
        set((s) => ({
          messages: s.messages.map((m) => {
            if (!m.vorschlaege?.some((v) => v.id === vorschlagId)) return m;
            return {
              ...m,
              vorschlaege: m.vorschlaege.filter((v) => v.id !== vorschlagId),
              actions: ergebnis ? [...(m.actions ?? []), ergebnis] : m.actions,
            };
          }),
        })),

      leeren: () => set({ messages: initialMessages }),
    }),
    {
      name: 'maho-chat',
      storage: appStorage,
      version: 1,
      // v0 kannte keine IDs. Bestehende Nachrichten bekommen eine, alles andere bleibt.
      migrate: (persisted) => chatMigrieren(persisted) as unknown as ChatState,
    }
  )
);
