import { useRef, useState } from 'react';
import { Pressable, Text } from 'react-native';
import { Link } from 'expo-router';
import { runMahoAgent, ChatFehler } from '@/lib/chatService';
import { buildSystemPrompt } from '@/lib/promptBuilder';
import { useMemoryStore, evaluateAndUpdateMemory } from '@/lib/memory';
import { useChatStore } from '@/lib/chatStore';
import { useProfileStore } from '@/lib/profileStore';
import { ChatFlaeche } from '@/components/ChatFlaeche';

/** Aus dem Fehler wird ein Satz, mit dem ein Mensch etwas anfangen kann. */
function fehlerText(e: unknown): string | undefined {
  if (!(e instanceof ChatFehler)) return 'Da ist etwas schiefgegangen.';
  switch (e.art) {
    case 'abgebrochen':
      return undefined; // selbst gestoppt, das braucht keine Meldung
    case 'offline':
      return 'Keine Verbindung. Schau kurz auf dein Internet.';
    case 'zeitueberschreitung':
      return 'Maho braucht ungewöhnlich lange. Probier es nochmal.';
    case 'ausgelastet':
      return 'Gerade zu viel los. Probier es in ein paar Sekunden nochmal.';
    default:
      return 'Da ist etwas schiefgegangen.';
  }
}

export default function ChatScreen() {
  const { name, basics, categories } = useProfileStore();
  const memory = useMemoryStore((s) => s.memory);
  const messages = useChatStore((s) => s.messages);
  const addMessage = useChatStore((s) => s.addMessage);
  const [eingabe, setEingabe] = useState('');
  const [busy, setBusy] = useState(false);
  const [fehler, setFehler] = useState<string>();
  // Für "Nochmal versuchen": der Text, der beim letzten Versuch nicht durchkam.
  const letzterVersuch = useRef<string>('');
  const abbruch = useRef<AbortController>(null);

  async function senden(text: string, erneut = false) {
    const userText = text.trim();
    if (!userText || busy) return;

    setFehler(undefined);
    letzterVersuch.current = userText;
    // Beim Wiederholen steht die Nachricht schon im Verlauf.
    if (!erneut) addMessage({ sender: 'user', text: userText });
    setEingabe('');
    setBusy(true);

    const controller = new AbortController();
    abbruch.current = controller;

    try {
      const systemPrompt = buildSystemPrompt({ profil: { name, basics, categories }, memory });

      // Verlauf: letzte 10 Nachrichten als Kontextfenster. Beim Wiederholen die
      // eigene Nachricht ausklammern, sie geht als userInput mit.
      const verlauf = erneut ? messages.slice(0, -1) : messages;
      const history = verlauf.slice(-10).map((m) => ({
        role: m.sender === 'user' ? ('user' as const) : ('assistant' as const),
        content: m.text,
      }));

      const { text: antwort, actions } = await runMahoAgent({
        systemPrompt,
        history,
        userInput: userText,
        signal: controller.signal,
      });
      addMessage({ sender: 'maho', text: antwort, actions: actions.map((a) => a.label) });

      // Gedächtnis-Auswertung im Hintergrund, blockiert den Chat nicht
      void evaluateAndUpdateMemory(userText, antwort);
    } catch (e) {
      setFehler(fehlerText(e));
      if (!(e instanceof ChatFehler)) console.error('Chat:', e);
    } finally {
      setBusy(false);
      abbruch.current = null;
    }
  }

  return (
    <ChatFlaeche
      titel="Maho"
      messages={messages}
      busy={busy}
      eingabe={eingabe}
      setEingabe={setEingabe}
      onSenden={senden}
      fehler={fehler}
      onWiederholen={() => senden(letzterVersuch.current, true)}
      onAbbrechen={() => abbruch.current?.abort()}
      kopfAktion={
        <Link href="/einstellungen" asChild>
          <Pressable
            style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
            accessibilityRole="button"
            accessibilityLabel="Einstellungen"
          >
            <Text style={{ fontSize: 20 }}>⚙️</Text>
          </Pressable>
        </Link>
      }
    />
  );
}
