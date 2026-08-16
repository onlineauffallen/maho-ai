import { useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Link } from 'expo-router';
import { runMahoAgent, ChatFehler } from '@/lib/chatService';
import { buildSystemPrompt } from '@/lib/promptBuilder';
import { useMemoryStore, evaluateAndUpdateMemory } from '@/lib/memory';
import { useChatStore } from '@/lib/chatStore';
import { useProfileStore } from '@/lib/profileStore';
import { useFarben } from '@/lib/theme';
import { useFollowupStore, faelligeWiedervorlagen } from '@/lib/followupStore';
import { vorschlagAusfuehren } from '@/lib/vorschlaege';
import { erinnerungenAktualisieren } from '@/lib/benachrichtigungen';
import { kalenderZugriffSicherstellen } from '@/lib/kalender';
import { ChatFlaeche } from '@/components/ChatFlaeche';

function Regler({ oben }: { oben?: boolean }) {
  const f = useFarben();
  return (
    <View style={reglerStil.zeile}>
      <View style={[reglerStil.schiene, { backgroundColor: f.gedaempft }]} />
      <View
        style={[
          reglerStil.knopf,
          { backgroundColor: f.papier, borderColor: f.gedaempft, left: oben ? 11 : 3 },
        ]}
      />
    </View>
  );
}

const reglerStil = StyleSheet.create({
  feld: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', gap: 6 },
  zeile: { width: 20, height: 8, justifyContent: 'center' },
  schiene: { height: 1.5, width: '100%', borderRadius: 1 },
  knopf: { position: 'absolute', width: 7, height: 7, borderRadius: 4, borderWidth: 1.5 },
});

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
  const vorschlagAbschliessen = useChatStore((s) => s.vorschlagAbschliessen);
  const [eingabe, setEingabe] = useState('');
  const [busy, setBusy] = useState(false);
  const [fehler, setFehler] = useState<string>();
  // Für "Nochmal versuchen": der Text, der beim letzten Versuch nicht durchkam.
  const letzterVersuch = useRef<string>('');
  const abbruch = useRef<AbortController>(null);
  /**
   * Nach einer Ablehnung ein paar Wortwechsel Ruhe geben. Ein Assistent, der
   * nach jedem "nein danke" gleich das Nächste anbietet, ist der einzige
   * echte Fehlermodus dieser Funktion.
   */
  const ruheZaehler = useRef(0);

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
      // Nur die älteste fällige Wiedervorlage mitgeben, nicht alle: Maho soll
      // ein Thema aufgreifen, nicht eine Liste vorlesen.
      const { wiedervorlagen, alsAngesprochenMarkieren } = useFollowupStore.getState();
      const dran = faelligeWiedervorlagen(wiedervorlagen)[0];

      const systemPrompt = buildSystemPrompt({
        profil: { name, basics, categories },
        memory,
        keineVorschlaege: ruheZaehler.current > 0,
        faellig: dran ? [dran] : [],
      });
      if (ruheZaehler.current > 0) ruheZaehler.current -= 1;

      // Verlauf: letzte 10 Nachrichten als Kontextfenster. Beim Wiederholen die
      // eigene Nachricht ausklammern, sie geht als userInput mit.
      const verlauf = erneut ? messages.slice(0, -1) : messages;
      const history = verlauf.slice(-10).map((m) => ({
        role: m.sender === 'user' ? ('user' as const) : ('assistant' as const),
        content: m.text,
      }));

      const { text: antwort, actions, vorschlaege } = await runMahoAgent({
        systemPrompt,
        history,
        userInput: userText,
        signal: controller.signal,
      });
      addMessage({
        sender: 'maho',
        text: antwort,
        actions: actions.map((a) => a.label),
        vorschlaege: vorschlaege.length ? vorschlaege : undefined,
      });

      // Das Thema war jetzt dran, es soll nicht bei jeder Nachricht wiederkommen.
      if (dran) alsAngesprochenMarkieren(dran.id);

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
      onVorschlagAnnehmen={(v) => {
        // Läuft rein lokal, kostet keinen weiteren Aufruf beim Anbieter.
        const ergebnis = vorschlagAusfuehren(v);
        vorschlagAbschliessen(v.id, `✓ ${ergebnis}`);
        // Erst hier nach den Systemrechten fragen: jetzt weiß der Nutzer, wofür
        // sie gut sind. Ein Dialog beim ersten Start wird weggetippt und ist
        // dann dauerhaft verloren.
        if (v.art === 'termin') void kalenderZugriffSicherstellen();
        if (v.art !== 'aufgabe') void erinnerungenAktualisieren(true);
      }}
      onVorschlagAblehnen={(v) => {
        vorschlagAbschliessen(v.id);
        ruheZaehler.current = 3;
      }}
      kopfAktion={
        <Link href="/einstellungen" asChild>
          <Pressable style={reglerStil.feld} accessibilityRole="button" accessibilityLabel="Einstellungen">
            {/* Zwei Schieberegler statt Zahnrad-Emoji: leicht zu zeichnen, in
                jeder Größe scharf, und es nimmt die Farbe der Gestaltung an. */}
            <Regler oben />
            <Regler />
          </Pressable>
        </Link>
      }
    />
  );
}
