import { useState } from 'react';
import { runMahoAgent } from '@/lib/chatService';
import { buildSystemPrompt } from '@/lib/promptBuilder';
import { useMemoryStore, evaluateAndUpdateMemory } from '@/lib/memory';
import { useChatStore } from '@/lib/chatStore';
import { useProfileStore } from '@/lib/profileStore';
import { ChatFlaeche } from '@/components/ChatFlaeche';

export default function ChatScreen() {
  const { name, basics, categories } = useProfileStore();
  const memory = useMemoryStore((s) => s.memory);
  const messages = useChatStore((s) => s.messages);
  const addMessage = useChatStore((s) => s.addMessage);
  const [eingabe, setEingabe] = useState('');
  const [busy, setBusy] = useState(false);

  async function senden(text: string) {
    const userText = text.trim();
    if (!userText || busy) return;

    addMessage({ sender: 'user', text: userText });
    setEingabe('');
    setBusy(true);

    try {
      const systemPrompt = buildSystemPrompt({ profil: { name, basics, categories }, memory });

      // Verlauf: letzte 10 Nachrichten als Kontextfenster
      const history = messages.slice(-10).map((m) => ({
        role: m.sender === 'user' ? ('user' as const) : ('assistant' as const),
        content: m.text,
      }));

      const { text: antwort, actions } = await runMahoAgent({ systemPrompt, history, userInput: userText });
      addMessage({ sender: 'maho', text: antwort, actions: actions.map((a) => a.label) });

      // Gedächtnis-Auswertung im Hintergrund, blockiert den Chat nicht
      void evaluateAndUpdateMemory(userText, antwort);
    } catch (e) {
      addMessage({ sender: 'maho', text: 'Sorry, da hat gerade etwas nicht funktioniert. Probier es nochmal.' });
      console.error('Chat:', e);
    } finally {
      setBusy(false);
    }
  }

  return (
    <ChatFlaeche
      messages={messages}
      busy={busy}
      eingabe={eingabe}
      setEingabe={setEingabe}
      onSenden={senden}
    />
  );
}
