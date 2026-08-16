'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { runMahoAgent } from '@/lib/chatService';
import { getOnboardingToolDefinitions, executeOnboardingTool } from '@/lib/onboardingTools';
import { buildOnboardingPrompt, splitVorschlaege } from '@/lib/promptBuilder';
import { useProfileStore } from '@/lib/profileStore';
import { useHydrated } from '@/lib/useHydrated';

type Nachricht = { sender: 'user' | 'maho'; text: string; actions?: string[] };

// Statt eines API-Calls beim Öffnen: die erste Frage steht fest. Spart Wartezeit
// und Kosten, und der Einstieg ist immer derselbe.
const START: Nachricht = {
  sender: 'maho',
  text: 'Servus! Ich bin Maho, dein persönlicher Assistent. Damit ich dir wirklich helfen kann, würde ich dich gern kurz kennenlernen. Wie soll ich dich nennen?',
};

export default function OnboardingChat() {
  const router = useRouter();
  const hydrated = useHydrated();
  const profil = useProfileStore();
  const [messages, setMessages] = useState<Nachricht[]>([START]);
  const [vorschlaege, setVorschlaege] = useState<string[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const endeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endeRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, busy]);

  // Sobald Maho finish_onboarding aufgerufen hat, geht es in den Alltag.
  useEffect(() => {
    if (hydrated && profil.onboardingDone) {
      const t = setTimeout(() => router.push('/chat'), 2500);
      return () => clearTimeout(t);
    }
  }, [hydrated, profil.onboardingDone, router]);

  async function senden(text: string) {
    const userText = text.trim();
    if (!userText || busy) return;

    const bisher = [...messages, { sender: 'user' as const, text: userText }];
    setMessages(bisher);
    setInput('');
    setVorschlaege([]);
    setBusy(true);

    try {
      // Der Prompt wird bei jeder Runde neu gebaut, damit "Bisher bekannt" den
      // Stand nach dem letzten update_profile enthält. Steht mit im try, sonst
      // bleibt bei einem Fehler davor das "Maho denkt nach…" für immer stehen.
      const { name, basics, categories } = useProfileStore.getState();
      const systemPrompt = buildOnboardingPrompt({ profil: { name, basics, categories } });

      const history = bisher.slice(0, -1).slice(-10).map((m) => ({
        role: m.sender === 'user' ? ('user' as const) : ('assistant' as const),
        content: m.text,
      }));

      const { text: antwort, actions } = await runMahoAgent({
        systemPrompt,
        history,
        userInput: userText,
        toolset: { definitions: getOnboardingToolDefinitions, execute: executeOnboardingTool },
      });
      const geteilt = splitVorschlaege(antwort);
      setMessages((m) => [
        ...m,
        { sender: 'maho', text: geteilt.text, actions: actions.map((a) => a.label) },
      ]);
      setVorschlaege(geteilt.vorschlaege);
    } catch (e) {
      setMessages((m) => [
        ...m,
        { sender: 'maho', text: 'Da ist gerade etwas schiefgegangen. Probier es bitte nochmal.' },
      ]);
      console.error('Onboarding:', e);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-center min-h-screen bg-white py-8">
      <div className="w-full max-w-md flex flex-col gap-4 border p-6 rounded-2xl shadow-2xl bg-white">
        <h1 className="text-xl font-bold">Kennenlernen</h1>

        <div className="flex flex-col gap-2 max-h-96 overflow-y-auto">
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
          <div ref={endeRef} />
        </div>

        {hydrated && profil.onboardingDone ? (
          <p className="text-sm text-green-700">Passt, wir sind durch. Ich bring dich zum Chat…</p>
        ) : (
          <>
            {vorschlaege.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {vorschlaege.map((v) => (
                  <button
                    key={v}
                    onClick={() => senden(v)}
                    disabled={busy}
                    className="text-sm border border-purple-200 text-purple-700 px-3 py-1 rounded-full hover:bg-purple-50 transition disabled:opacity-50"
                  >
                    {v}
                  </button>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <input
                className="flex-1 px-3 py-2 border rounded"
                placeholder="Schreib einfach drauflos…"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && senden(input)}
                disabled={busy}
              />
              <button
                onClick={() => senden(input)}
                disabled={busy}
                className="bg-purple-700 text-white px-4 py-2 rounded hover:bg-black transition disabled:opacity-50"
              >
                Senden
              </button>
            </div>
            <button
              onClick={() => senden('Lass uns abkürzen, den Rest lernst du unterwegs.')}
              disabled={busy}
              className="text-xs text-gray-400 hover:text-gray-600 self-center"
            >
              überspringen
            </button>
          </>
        )}
      </div>
    </div>
  );
}
