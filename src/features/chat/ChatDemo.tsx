'use client';
import { useState, useRef, useEffect } from 'react';
import { runMahoAgent } from '@/lib/chatService';
import { useOnboardingStore } from '@/lib/useOnboardingStore';
import { buildSystemPrompt } from '@/lib/promptBuilder';
import { useMemoryStore, evaluateAndUpdateMemory } from '@/lib/memory';
import BubbleNav from '@/features/common/BubbleNav';

type Message = { sender: 'user' | 'maho'; text: string; actions?: string[] };

export default function ChatDemo() {
  const { name, selectedAreas, answers } = useOnboardingStore();
  const memory = useMemoryStore((s) => s.memory);
  const [messages, setMessages] = useState<Message[]>([
    { sender: 'maho', text: 'Hi! Wie kann ich dir helfen?' },
  ]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleSend() {
    if (!input.trim() || busy) return;

    const userText = input.trim();
    setMessages((msgs) => [...msgs, { sender: 'user', text: userText }]);
    setInput('');
    setBusy(true);

    const systemPrompt = buildSystemPrompt({
      userData: { name, selectedAreas, answers },
      memory,
    });

    // Verlauf: letzte 10 Nachrichten als Kontextfenster
    const history = messages.slice(-10).map((m) => ({
      role: m.sender === 'user' ? ('user' as const) : ('assistant' as const),
      content: m.text,
    }));

    try {
      const { text, actions } = await runMahoAgent({ systemPrompt, history, userInput: userText });
      setMessages((msgs) => [
        ...msgs,
        { sender: 'maho', text, actions: actions.map((a) => a.label) },
      ]);
      // Gedächtnis-Evaluierung im Hintergrund - blockiert den Chat nicht
      void evaluateAndUpdateMemory(userText, text);
    } catch (error) {
      setMessages((msgs) => [
        ...msgs,
        { sender: 'maho', text: '🚨 Sorry, Maho hatte gerade einen Aussetzer. Versuch es bitte nochmal!' },
      ]);
      console.error('Fehler beim Senden:', error);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-white">
      <div className="w-full max-w-md flex flex-col gap-4 border p-6 rounded-2xl shadow-2xl bg-white">
        <BubbleNav active="Chat" />
        <div className="flex-1 flex flex-col gap-2 mb-2 max-h-80 overflow-y-auto">
          {messages.map((m, i) => (
            <div key={i} className={m.sender === 'user' ? 'text-right' : 'text-left'}>
              <span
                className={
                  m.sender === 'user'
                    ? 'inline-block bg-purple-700 text-white px-3 py-2 rounded-2xl rounded-br-sm'
                    : 'inline-block bg-gray-100 text-gray-900 px-3 py-2 rounded-2xl rounded-bl-sm'
                }
              >
                {m.text}
              </span>
              {m.actions?.map((a, j) => (
                <div key={j} className="mt-1">
                  <span className="inline-block text-xs bg-green-50 text-green-700 border border-green-200 px-2 py-1 rounded-full">
                    {a}
                  </span>
                </div>
              ))}
            </div>
          ))}
          {busy && <div className="text-gray-400 text-sm">Maho denkt nach…</div>}
          <div ref={chatEndRef} />
        </div>
        <div className="flex gap-2">
          <input
            className="flex-1 px-3 py-2 border rounded"
            placeholder="Schreib Maho…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            disabled={busy}
          />
          <button
            onClick={handleSend}
            disabled={busy}
            className="bg-purple-700 text-white px-4 py-2 rounded hover:bg-black transition disabled:opacity-50"
          >
            Senden
          </button>
        </div>
      </div>
    </div>
  );
}
