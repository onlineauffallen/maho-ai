import { useState } from 'react';
import { Pressable, Text } from 'react-native';
import { runMahoAgent } from '@/lib/chatService';
import { getOnboardingToolDefinitions, executeOnboardingTool } from '@/lib/onboardingTools';
import { buildOnboardingPrompt, splitVorschlaege } from '@/lib/promptBuilder';
import { useProfileStore } from '@/lib/profileStore';
import { ChatFlaeche, type Nachricht } from '@/components/ChatFlaeche';
import { abstand, farben } from '@/lib/theme';

// Statt eines API-Calls beim Öffnen: die erste Frage steht fest. Spart
// Wartezeit und Kosten, und der Einstieg ist immer derselbe.
const START: Nachricht = {
  sender: 'maho',
  text: 'Servus! Ich bin Maho, dein persönlicher Assistent. Damit ich dir wirklich helfen kann, würde ich dich gern kurz kennenlernen. Wie soll ich dich nennen?',
};

export default function OnboardingScreen() {
  const [messages, setMessages] = useState<Nachricht[]>([START]);
  const [vorschlaege, setVorschlaege] = useState<string[]>([]);
  const [eingabe, setEingabe] = useState('');
  const [busy, setBusy] = useState(false);

  async function senden(text: string) {
    const userText = text.trim();
    if (!userText || busy) return;

    const bisher: Nachricht[] = [...messages, { sender: 'user', text: userText }];
    setMessages(bisher);
    setEingabe('');
    setVorschlaege([]);
    setBusy(true);

    try {
      // Prompt bei jeder Runde neu bauen, damit "Bisher bekannt" den Stand nach
      // dem letzten update_profile enthält. Steht mit im try, sonst bleibt bei
      // einem Fehler davor die Denkanzeige für immer stehen.
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
    <ChatFlaeche
      titel="Kennenlernen"
      messages={messages}
      busy={busy}
      eingabe={eingabe}
      setEingabe={setEingabe}
      onSenden={senden}
      vorschlaege={vorschlaege}
      platzhalter="Schreib einfach drauflos…"
      fussZeile={
        <Pressable
          onPress={() => senden('Lass uns abkürzen, den Rest lernst du unterwegs.')}
          disabled={busy}
          style={{ alignSelf: 'center', paddingBottom: abstand.s }}
        >
          <Text style={{ color: farben.schwach, fontSize: 13 }}>überspringen</Text>
        </Pressable>
      }
    />
  );
}
