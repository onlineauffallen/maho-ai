import { useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { runMahoAgent, ChatFehler } from '@/lib/chatService';
import { getOnboardingToolDefinitions, executeOnboardingTool } from '@/lib/onboardingTools';
import { buildOnboardingPrompt, splitVorschlaege } from '@/lib/promptBuilder';
import { useProfileStore, MAX_PROFILE_CHARS } from '@/lib/profileStore';
import { ChatFlaeche, type Nachricht } from '@/components/ChatFlaeche';
import { abstand, farben, radius, schrift } from '@/lib/theme';

// Statt eines API-Calls beim Öffnen: die erste Frage steht fest. Spart
// Wartezeit und Kosten, und der Einstieg ist immer derselbe.
const START: Nachricht = {
  sender: 'maho',
  text: 'Servus! Ich bin Maho, dein persönlicher Assistent. Damit ich dir wirklich helfen kann, würde ich dich gern kurz kennenlernen. Wie soll ich dich nennen?',
};

/**
 * Harte Obergrenze im Code, nicht im Prompt. Eine Anweisung wie "fünf bis
 * sieben Wortwechsel reichen" ist eine Bitte, keine Garantie: im Test hat das
 * Modell einsilbige Nutzer vier Runden lang weiter befragt, ohne je etwas zu
 * speichern.
 */
const MAX_RUNDEN = 6;

export default function OnboardingScreen() {
  const profil = useProfileStore();
  const [messages, setMessages] = useState<Nachricht[]>([START]);
  const [vorschlaege, setVorschlaege] = useState<string[]>([]);
  const [eingabe, setEingabe] = useState('');
  const [busy, setBusy] = useState(false);
  const [fehler, setFehler] = useState<string>();
  const [runden, setRunden] = useState(0);
  const abbruch = useRef<AbortController>(null);

  /**
   * Beenden ohne Umweg über das Modell.
   *
   * Vorher schickte "überspringen" einen Satz an die KI und hoffte, dass sie
   * das Gespräch beendet. Ohne Namen verweigerte das Werkzeug, die KI fragte
   * erneut nach dem Namen, und der Nutzer kam nie in die App.
   */
  function abkuerzen() {
    abbruch.current?.abort();
    profil.setSummaryReady(true);
  }

  async function senden(text: string) {
    const userText = text.trim();
    if (!userText || busy) return;

    const bisher: Nachricht[] = [...messages, { sender: 'user', text: userText }];
    setMessages(bisher);
    setEingabe('');
    setVorschlaege([]);
    setFehler(undefined);
    setBusy(true);

    const controller = new AbortController();
    abbruch.current = controller;

    try {
      // Prompt bei jeder Runde neu bauen, damit "Bisher bekannt" den Stand nach
      // dem letzten update_profile enthält. Steht mit im try, sonst bleibt bei
      // einem Fehler davor die Denkanzeige für immer stehen.
      const { name, basics, categories } = useProfileStore.getState();
      const letzteRunde = runden + 1 >= MAX_RUNDEN;
      const systemPrompt = buildOnboardingPrompt({
        profil: { name, basics, categories },
        letzteRunde,
      });

      const history = bisher.slice(0, -1).slice(-10).map((m) => ({
        role: m.sender === 'user' ? ('user' as const) : ('assistant' as const),
        content: m.text,
      }));

      const { text: antwort, actions } = await runMahoAgent({
        systemPrompt,
        history,
        userInput: userText,
        toolset: { definitions: getOnboardingToolDefinitions, execute: executeOnboardingTool },
        signal: controller.signal,
      });

      const geteilt = splitVorschlaege(antwort);
      setMessages((m) => [
        ...m,
        { sender: 'maho', text: geteilt.text, actions: actions.map((a) => a.label) },
      ]);
      setVorschlaege(geteilt.vorschlaege);
      setRunden((r) => r + 1);

      // Das Modell hat die letzte Runde verstreichen lassen, ohne zu beenden.
      // Dann beenden wir.
      if (letzteRunde) profil.setSummaryReady(true);
    } catch (e) {
      if (e instanceof ChatFehler && e.art === 'abgebrochen') return;
      setFehler(
        e instanceof ChatFehler && e.art === 'offline'
          ? 'Keine Verbindung. Du kannst auch ohne weitermachen.'
          : 'Da ist etwas schiefgegangen.'
      );
    } finally {
      setBusy(false);
      abbruch.current = null;
    }
  }

  if (profil.summaryReady) return <Zusammenfassung />;

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
      fehler={fehler}
      onAbbrechen={() => abbruch.current?.abort()}
      fussZeile={
        <Pressable onPress={abkuerzen} style={styles.ueberspringen} accessibilityRole="button">
          <Text style={styles.ueberspringenText}>Das reicht, los geht&apos;s</Text>
        </Pressable>
      }
    />
  );
}

/**
 * Der Abschluss, den vorher niemand zu sehen bekam: das Tool setzte früher
 * direkt onboardingDone, die Weiche im Layout leitete mitten in der
 * Agenten-Schleife um, und die Abschlussnachricht landete auf einem Screen,
 * den es nicht mehr gab.
 */
function Zusammenfassung() {
  const { name, basics, categories, setOnboardingDone } = useProfileStore();
  const belegt = basics.length;

  return (
    <SafeAreaView style={styles.sicher}>
      <ScrollView contentContainerStyle={styles.inhalt}>
        <Text style={styles.titel}>Das hab ich mir gemerkt</Text>

        <View style={styles.block}>
          <Text style={styles.beschriftung}>Ich nenne dich</Text>
          <Text style={styles.wert}>{name || 'einfach du'}</Text>
        </View>

        {!!basics && (
          <View style={styles.block}>
            <Text style={styles.beschriftung}>Über dich</Text>
            <Text style={styles.wert}>{basics}</Text>
            <View style={styles.balkenRahmen}>
              <View style={[styles.balken, { width: `${Math.min(100, (belegt / MAX_PROFILE_CHARS) * 100)}%` }]} />
            </View>
            <Text style={styles.klein}>
              {belegt} von {MAX_PROFILE_CHARS} Zeichen. Wird es eng, verdichte ich das Wichtigste.
            </Text>
          </View>
        )}

        {categories.length > 0 && (
          <View style={styles.block}>
            <Text style={styles.beschriftung}>Deine Bereiche</Text>
            <View style={styles.chipZeile}>
              {categories.map((k) => (
                <View key={k} style={styles.chip}>
                  <Text style={styles.chipText}>{k}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <Text style={styles.klein}>
          Das kannst du jederzeit unter Einstellungen ändern oder löschen.
        </Text>

        <Pressable
          onPress={() => setOnboardingDone(true)}
          style={({ pressed }) => [styles.knopf, pressed && { opacity: 0.7 }]}
          accessibilityRole="button"
        >
          <Text style={styles.knopfText}>Passt, los geht&apos;s</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  sicher: { flex: 1, backgroundColor: farben.grund },
  inhalt: { padding: abstand.l, gap: abstand.l },
  titel: { ...schrift.titel, color: farben.text, marginTop: abstand.l },
  block: { gap: abstand.s },
  beschriftung: { ...schrift.abschnitt, color: farben.gedaempft, textTransform: 'uppercase' },
  wert: { fontSize: 16, color: farben.text, lineHeight: 23 },
  klein: { fontSize: 13, color: farben.schwach },
  balkenRahmen: { height: 6, backgroundColor: farben.flaeche, borderRadius: radius.rund, overflow: 'hidden' },
  balken: { height: 6, backgroundColor: farben.akzent, borderRadius: radius.rund },
  chipZeile: { flexDirection: 'row', flexWrap: 'wrap', gap: abstand.s },
  chip: {
    backgroundColor: farben.akzentSchwach,
    borderColor: '#ddd6fe',
    borderWidth: 1,
    borderRadius: radius.rund,
    paddingHorizontal: abstand.m,
    paddingVertical: abstand.xs + 2,
  },
  chipText: { color: farben.akzent, fontSize: 14 },
  knopf: {
    backgroundColor: farben.akzent,
    borderRadius: radius.m,
    paddingVertical: abstand.m,
    alignItems: 'center',
    marginTop: abstand.s,
  },
  knopfText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  ueberspringen: {
    alignSelf: 'center',
    paddingVertical: abstand.m,
    paddingHorizontal: abstand.l,
    minHeight: 44,
    justifyContent: 'center',
  },
  ueberspringenText: { color: farben.gedaempft, fontSize: 15 },
});
