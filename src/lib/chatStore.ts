// src/lib/chatStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type ChatMessage = { sender: 'user' | 'maho'; text: string; actions?: string[] };

const MAX_MESSAGES = 50;

const initialMessages: ChatMessage[] = [
  { sender: 'maho', text: 'Hi! Wie kann ich dir helfen?' },
];

type ChatState = {
  messages: ChatMessage[];
  addMessage: (message: ChatMessage) => void;
};

export const useChatStore = create<ChatState>()(
  persist(
    (set) => ({
      messages: initialMessages,
      addMessage: (message) =>
        set((s) => ({ messages: [...s.messages, message].slice(-MAX_MESSAGES) })),
    }),
    { name: 'maho-chat', storage: createJSONStorage(() => localStorage) }
  )
);
