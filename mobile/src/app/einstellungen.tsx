import { useMemo, useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useProfileStore, MAX_PROFILE_CHARS } from '@/lib/profileStore';
import { useMemoryStore, MAX_MEMORY_CHARS } from '@/lib/memory';
import { useChatStore } from '@/lib/chatStore';
import { useTodoStore } from '@/lib/todoStore';
import { useCalendarStore } from '@/lib/calendarStore';
import { alleTermineLoeschen } from '@/lib/kalender';
import { useFollowupStore } from '@/lib/followupStore';
import { useZustimmungStore } from '@/lib/zustimmungStore';
import { datumLesbar } from '@/lib/ids';
import { kategorieLoeschen, kategorieUmbenennen, aufgabenIn } from '@/lib/kategorien';
import { abstand, radius, schrift, useFarben, type Farben } from '@/lib/theme';
import { useNachfrage } from '@/components/Nachfrage';

/**
 * Der Rückweg zu allem, was Maho über den Nutzer gespeichert hat.
 *
 * Ohne diesen Screen war die App eine Einbahnstraße: ein einmal gesetzter Name
 * ließ sich nie mehr ändern, das Gedächtnis war unsichtbar, und Auskunft,
 * Berichtigung und Löschung waren technisch unmöglich.
 */
export default function EinstellungenScreen() {
  const f = useFarben();
  const stil = useMemo(() => stile(f), [f]);
  const router = useRouter();
  const profil = useProfileStore();
  const { memory, setMemory } = useMemoryStore();
  const chat = useChatStore();
  const todos = useTodoStore();
  const followups = useFollowupStore();
  const widerrufen = useZustimmungStore((s) => s.widerrufen);
  const { frage, dialog } = useNachfrage();

  const [name, setName] = useState(profil.name);
  const [basics, setBasics] = useState(profil.basics);
  const [hinweis, setHinweis] = useState<string>();

  const belegt = basics.length;
  const zuLang = belegt > MAX_PROFILE_CHARS;
  const gedaechtnisZeilen = memory.split('\n').filter((z) => z.trim());

  function basicsSichern() {
    const { ok, overflow } = profil.setBasics(basics);
    setHinweis(ok ? 'Gespeichert.' : `${overflow} Zeichen zu viel. Kürz es noch etwas.`);
  }

  function zeileLoeschen(zeile: string) {
    setMemory(memory.split('\n').filter((z) => z !== zeile).join('\n'));
  }

  function allesLoeschen() {
    frage({
      titel: 'Alle Daten löschen?',
      text: 'Profil, Gedächtnis, Chatverlauf, Aufgaben und Termine. Das lässt sich nicht rückgängig machen.',
      knopf: 'Alles löschen',
      onBestaetigen: () => {
        setMemory('');
        chat.leeren();
        todos.leeren();
        alleTermineLoeschen();
        followups.leeren();
        profil.setName('');
        profil.setBasics('');
        for (const k of [...profil.categories]) profil.removeCategory(k);
        profil.setSummaryReady(false);
        profil.setOnboardingDone(false);
        widerrufen();
        router.replace('/onboarding');
      },
    });
  }

  /**
   * Alles herausgeben, was gespeichert ist. Zwei Gründe: die DSGVO verlangt
   * Datenübertragbarkeit, und beim Nachvollziehen eines Fehlers ist der echte
   * Verlauf durch nichts zu ersetzen.
   */
  async function datenExportieren() {
    const daten = {
      exportiertAm: new Date().toISOString(),
      profil: useProfileStore.getState(),
      gedaechtnis: memory,
      chat: chat.messages,
      aufgaben: todos.todos,
      termine: useCalendarStore.getState().events,
      wiedervorlagen: followups.wiedervorlagen,
    };
    const text = JSON.stringify(daten, null, 2);

    if (Platform.OS === 'web') {
      const blob = new Blob([text], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `maho-daten-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setHinweis('Datei wurde heruntergeladen.');
      return;
    }
    await Share.share({ message: text });
  }

  const offeneWiedervorlagen = followups.wiedervorlagen.filter((w) => !w.angesprochen);

  return (
    <SafeAreaView style={stil.sicher}>
      <View style={stil.kopf}>
        <Pressable onPress={() => router.back()} style={stil.zurueck} accessibilityRole="button">
          <ZurueckPfeil farben={f} />
          <Text style={[schrift.normal, { color: f.signalText }]}>Zurück</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={stil.inhalt} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Text style={[schrift.gross, { color: f.tinte }]}>Einstellungen</Text>

        <View style={stil.block}>
          <Text style={stil.abschnitt}>Über dich</Text>

          <Text style={stil.beschriftung}>Wie ich dich nenne</Text>
          <TextInput
            style={stil.feld}
            value={name}
            onChangeText={setName}
            onBlur={() => profil.setName(name)}
            placeholder="du"
            placeholderTextColor={f.schwach}
          />

          <Text style={stil.beschriftung}>Was ich über dich weiß</Text>
          <TextInput
            style={[stil.feld, stil.feldGross, zuLang && { borderWidth: 1, borderColor: f.warnung }]}
            value={basics}
            onChangeText={setBasics}
            multiline
            textAlignVertical="top"
            placeholder="Noch nichts hinterlegt."
            placeholderTextColor={f.schwach}
          />

          <Balken anteil={belegt / MAX_PROFILE_CHARS} farben={f} />
          <View style={stil.zeile}>
            <Text style={[schrift.klein, { color: zuLang ? f.warnung : f.gedaempft }]}>
              {belegt} von {MAX_PROFILE_CHARS} Zeichen
            </Text>
            <Pressable onPress={basicsSichern} style={stil.kleinerKnopf}>
              <Text style={[schrift.betont, { color: f.aufAkzent, fontSize: 16 }]}>Sichern</Text>
            </Pressable>
          </View>
          {!!hinweis && <Text style={[schrift.klein, { color: f.gedaempft }]}>{hinweis}</Text>}
        </View>

        <View style={stil.block}>
          <Text style={stil.abschnitt}>Was Maho gelernt hat</Text>
          {gedaechtnisZeilen.length === 0 && (
            <Text style={[schrift.klein, { color: f.gedaempft }]}>Noch nichts.</Text>
          )}
          {gedaechtnisZeilen.map((z, i) => (
            <View key={`${i}-${z.slice(0, 12)}`} style={stil.karte}>
              <Text style={[schrift.klein, stil.karteText, { color: f.tinte }]}>
                {z.replace(/^-\s*/, '')}
              </Text>
              <Pressable
                onPress={() => zeileLoeschen(z)}
                style={stil.karteAktion}
                accessibilityLabel="Diese Erinnerung löschen"
              >
                <Kreuz farben={f} />
              </Pressable>
            </View>
          ))}
          {gedaechtnisZeilen.length > 0 && (
            <>
              <Balken anteil={memory.length / MAX_MEMORY_CHARS} farben={f} />
              <Text style={[schrift.klein, { color: f.gedaempft }]}>
                {memory.length} von {MAX_MEMORY_CHARS} Zeichen. Wird es eng, verdichtet Maho selbst.
              </Text>
            </>
          )}
        </View>

        {offeneWiedervorlagen.length > 0 && (
          <View style={stil.block}>
            <Text style={stil.abschnitt}>Worüber wir nochmal reden</Text>
            {offeneWiedervorlagen.map((w) => (
              <View key={w.id} style={stil.karte}>
                <View style={stil.karteText}>
                  <Text style={[schrift.klein, { color: f.signalText }]}>{datumLesbar(w.faelligAm)}</Text>
                  <Text style={[schrift.normal, { color: f.tinte }]}>{w.thema}</Text>
                </View>
                <Pressable
                  onPress={() => followups.entfernen(w.id)}
                  style={stil.karteAktion}
                  accessibilityLabel={`${w.thema} entfernen`}
                >
                  <Kreuz farben={f} />
                </Pressable>
              </View>
            ))}
          </View>
        )}

        <View style={stil.block}>
          <Text style={stil.abschnitt}>Bereiche</Text>
          {profil.categories.length === 0 && (
            <Text style={[schrift.klein, { color: f.gedaempft }]}>Noch keine.</Text>
          )}
          {profil.categories.map((k) => (
            <KategorieZeile key={k} name={k} farben={f} onFrage={frage} />
          ))}
        </View>

        <View style={stil.block}>
          <Text style={stil.abschnitt}>Deine Daten</Text>
          <Text style={[schrift.klein, { color: f.gedaempft }]}>
            Maho denkt mit einem Sprachmodell von OpenAI (USA). Was du schreibst, dein Profil und
            dein Gedächtnis werden dorthin übertragen, um die Antwort zu erzeugen, Aufgaben und Termine
            nur, wenn Maho sie nachschlägt. Dem hast du zugestimmt.
          </Text>

          <Pressable
            onPress={() =>
              frage({
                titel: 'Zustimmung widerrufen?',
                text: 'Danach überträgt die App nichts mehr, und Maho kann nicht antworten. Beim nächsten Öffnen fragt die App wieder. Deine Daten auf dem Gerät bleiben.',
                knopf: 'Widerrufen',
                onBestaetigen: () => {
                  widerrufen();
                  router.replace('/zustimmung');
                },
              })
            }
            style={stil.aktionKnopf}
          >
            <Text style={[schrift.normal, { color: f.tinte }]}>Zustimmung widerrufen</Text>
          </Pressable>

          <Pressable onPress={datenExportieren} style={stil.aktionKnopf}>
            <Text style={[schrift.normal, { color: f.tinte }]}>Meine Daten exportieren</Text>
          </Pressable>

          <Pressable
            onPress={() =>
              frage({
                titel: 'Chatverlauf löschen?',
                text: 'Die Unterhaltung wird gelöscht. Was Maho gelernt hat, bleibt.',
                knopf: 'Löschen',
                onBestaetigen: () => chat.leeren(),
              })
            }
            style={stil.aktionKnopf}
          >
            <Text style={[schrift.normal, { color: f.tinte }]}>Chatverlauf löschen</Text>
          </Pressable>

          <Pressable onPress={allesLoeschen} style={[stil.aktionKnopf, stil.gefahr]}>
            <Text style={[schrift.normal, { color: f.warnung }]}>Alle meine Daten löschen</Text>
          </Pressable>
        </View>
      </ScrollView>

      {dialog}
    </SafeAreaView>
  );
}

function Balken({ anteil, farben: f }: { anteil: number; farben: Farben }) {
  const voll = anteil > 0.9;
  return (
    <View style={{ height: 6, backgroundColor: f.flaeche, borderRadius: radius.rund, overflow: 'hidden' }}>
      <View
        style={{
          height: 6,
          width: `${Math.min(100, anteil * 100)}%`,
          backgroundColor: voll ? f.warnung : f.weg,
          borderRadius: radius.rund,
        }}
      />
    </View>
  );
}

function Kreuz({ farben: f }: { farben: Farben }) {
  const strich = {
    position: 'absolute' as const,
    width: 15,
    height: 2,
    borderRadius: 1,
    backgroundColor: f.schwach,
  };
  return (
    <View style={{ width: 18, height: 18, alignItems: 'center', justifyContent: 'center' }}>
      <View style={[strich, { transform: [{ rotate: '45deg' }] }]} />
      <View style={[strich, { transform: [{ rotate: '-45deg' }] }]} />
    </View>
  );
}

function ZurueckPfeil({ farben: f }: { farben: Farben }) {
  const strich = {
    position: 'absolute' as const,
    width: 11,
    height: 2.5,
    borderRadius: 2,
    backgroundColor: f.signalText,
  };
  return (
    <View style={{ width: 20, height: 20, alignItems: 'center', justifyContent: 'center' }}>
      <View style={[strich, { transform: [{ translateY: -3.5 }, { rotate: '-45deg' }] }]} />
      <View style={[strich, { transform: [{ translateY: 3.5 }, { rotate: '45deg' }] }]} />
    </View>
  );
}

function KategorieZeile({
  name, farben: f, onFrage,
}: {
  name: string;
  farben: Farben;
  onFrage: (d: { titel: string; text?: string; knopf: string; onBestaetigen: () => void }) => void;
}) {
  const stil = stile(f);
  const [wert, setWert] = useState(name);

  function loeschen() {
    const anzahl = aufgabenIn(name);
    onFrage({
      titel: `„${name}" löschen?`,
      text:
        anzahl > 0
          ? `${anzahl} Aufgabe${anzahl === 1 ? '' : 'n'} verliert die Zuordnung, bleibt aber bestehen.`
          : 'Der Bereich wird entfernt.',
      knopf: 'Löschen',
      onBestaetigen: () => kategorieLoeschen(name),
    });
  }

  return (
    <View style={stil.karte}>
      <TextInput
        style={[stil.karteText, schrift.normal, { color: f.tinte, paddingVertical: abstand.xs }]}
        value={wert}
        onChangeText={setWert}
        onBlur={() => kategorieUmbenennen(name, wert)}
      />
      <Pressable onPress={loeschen} style={stil.karteAktion} accessibilityLabel={`${name} löschen`}>
        <Kreuz farben={f} />
      </Pressable>
    </View>
  );
}

const stile = (f: Farben) =>
  StyleSheet.create({
    sicher: { flex: 1, backgroundColor: f.papier },
    kopf: { paddingHorizontal: abstand.m, paddingTop: abstand.s },
    zurueck: { flexDirection: 'row', alignItems: 'center', gap: abstand.xs, minHeight: 44, paddingRight: abstand.m },
    inhalt: { paddingHorizontal: abstand.l, paddingBottom: abstand.xxl * 2, gap: abstand.xl },
    block: { gap: abstand.s },
    abschnitt: { ...schrift.titel, color: f.gedaempft, fontSize: 17 },
    beschriftung: { ...schrift.klein, color: f.gedaempft, marginTop: abstand.s },
    feld: {
      backgroundColor: f.flaeche,
      borderRadius: radius.m,
      paddingHorizontal: abstand.l,
      paddingVertical: abstand.m,
      fontFamily: 'Manrope_400Regular',
      fontSize: 18,
      color: f.tinte,
      minHeight: 54,
    },
    feldGross: { minHeight: 150, lineHeight: 26 },
    zeile: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: abstand.s },
    kleinerKnopf: {
      backgroundColor: f.weg,
      borderRadius: radius.rund,
      paddingHorizontal: abstand.xl,
      minHeight: 44,
      justifyContent: 'center',
    },
    karte: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: f.flaeche,
      borderRadius: radius.m,
      paddingLeft: abstand.l,
      paddingRight: abstand.s,
      paddingVertical: abstand.m,
      gap: abstand.s,
    },
    karteText: { flex: 1, gap: 1 },
    karteAktion: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
    aktionKnopf: {
      backgroundColor: f.flaeche,
      borderRadius: radius.m,
      paddingHorizontal: abstand.l,
      minHeight: 56,
      justifyContent: 'center',
    },
    gefahr: { backgroundColor: 'transparent', borderWidth: 1, borderColor: f.linie },
  });
