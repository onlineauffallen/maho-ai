import { useState } from 'react';
import {
  Alert,
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
import { datumLesbar } from '@/lib/ids';
import { kategorieLoeschen, kategorieUmbenennen, aufgabenIn } from '@/lib/kategorien';
import { abstand, radius, schrift, useFarben, type Farben } from '@/lib/theme';

/**
 * Der Rückweg zu allem, was Maho über den Nutzer gespeichert hat.
 *
 * Ohne diesen Screen war die App eine Einbahnstraße: ein einmal gesetzter Name
 * ließ sich nie mehr ändern, das Gedächtnis war unsichtbar, und Auskunft,
 * Berichtigung und Löschung waren technisch unmöglich.
 */
export default function EinstellungenScreen() {
  const f = useFarben();
  const stil = stile(f);
  const router = useRouter();
  const profil = useProfileStore();
  const { memory, setMemory } = useMemoryStore();
  const chat = useChatStore();
  const todos = useTodoStore();
  const followups = useFollowupStore();

  const [name, setName] = useState(profil.name);
  const [basics, setBasics] = useState(profil.basics);
  const [hinweis, setHinweis] = useState<string>();

  const belegt = basics.length;
  const zuLang = belegt > MAX_PROFILE_CHARS;

  function basicsSichern() {
    const { ok, overflow } = profil.setBasics(basics);
    setHinweis(ok ? 'Gespeichert.' : `${overflow} Zeichen zu viel. Kürz es noch etwas.`);
  }

  function gedaechtnisZeileLoeschen(zeile: string) {
    const rest = memory
      .split('\n')
      .filter((z) => z !== zeile)
      .join('\n');
    setMemory(rest);
  }

  function allesLoeschen() {
    Alert.alert(
      'Alle Daten löschen?',
      'Profil, Gedächtnis, Chatverlauf, Aufgaben und Termine werden gelöscht. Das lässt sich nicht rückgängig machen.',
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Alles löschen',
          style: 'destructive',
          onPress: () => {
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
            router.replace('/onboarding');
          },
        },
      ]
    );
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
      // Im Browser als Datei zum Herunterladen.
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

  const gedaechtnisZeilen = memory.split('\n').filter((z) => z.trim());

  return (
    <SafeAreaView style={stil.sicher}>
      <View style={stil.kopf}>
        <Pressable onPress={() => router.back()} style={stil.zurueck} accessibilityRole="button">
          <Text style={stil.zurueckText}>‹ Zurück</Text>
        </Pressable>
        <Text style={stil.kopfTitel}>Einstellungen</Text>
        <View style={stil.zurueck} />
      </View>

      <ScrollView contentContainerStyle={stil.inhalt} keyboardShouldPersistTaps="handled">
        <View style={stil.block}>
          <Text style={stil.abschnitt}>ÜBER DICH</Text>
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
            style={[stil.feld, stil.feldGross, zuLang && stil.feldFehler]}
            value={basics}
            onChangeText={setBasics}
            multiline
            textAlignVertical="top"
            placeholder="Noch nichts hinterlegt."
            placeholderTextColor={f.schwach}
          />
          <View style={stil.balkenRahmen}>
            <View
              style={[
                stil.balken,
                { width: `${Math.min(100, (belegt / MAX_PROFILE_CHARS) * 100)}%` },
                belegt > MAX_PROFILE_CHARS * 0.9 && { backgroundColor: f.warnung },
              ]}
            />
          </View>
          <View style={stil.zeile}>
            <Text style={[stil.klein, zuLang && { color: f.warnung }]}>
              {belegt} von {MAX_PROFILE_CHARS} Zeichen
            </Text>
            <Pressable onPress={basicsSichern} style={stil.kleinerKnopf}>
              <Text style={stil.kleinerKnopfText}>Sichern</Text>
            </Pressable>
          </View>
          {!!hinweis && <Text style={stil.klein}>{hinweis}</Text>}
        </View>

        <View style={stil.block}>
          <Text style={stil.abschnitt}>WAS MAHO GELERNT HAT</Text>
          {gedaechtnisZeilen.length === 0 && <Text style={stil.klein}>Noch nichts.</Text>}
          {gedaechtnisZeilen.map((z, i) => (
            <View key={`${i}-${z.slice(0, 12)}`} style={stil.gedaechtnisZeile}>
              <Text style={stil.gedaechtnisText}>{z}</Text>
              <Pressable
                onPress={() => gedaechtnisZeileLoeschen(z)}
                style={stil.miniKnopf}
                accessibilityRole="button"
                accessibilityLabel="Diese Erinnerung löschen"
              >
                <Text style={{ color: f.warnung }}>✕</Text>
              </Pressable>
            </View>
          ))}
          {gedaechtnisZeilen.length > 0 && (
            <>
              <View style={stil.balkenRahmen}>
                <View
                  style={[stil.balken, { width: `${Math.min(100, (memory.length / MAX_MEMORY_CHARS) * 100)}%` }]}
                />
              </View>
              <Text style={stil.klein}>
                {memory.length} von {MAX_MEMORY_CHARS} Zeichen. Wird es eng, verdichtet Maho selbst.
              </Text>
            </>
          )}
        </View>

        {followups.wiedervorlagen.filter((w) => !w.angesprochen).length > 0 && (
          <View style={stil.block}>
            <Text style={stil.abschnitt}>WORÜBER WIR NOCHMAL REDEN</Text>
            {followups.wiedervorlagen
              .filter((w) => !w.angesprochen)
              .map((w) => (
                <View key={w.id} style={stil.gedaechtnisZeile}>
                  <View style={{ flex: 1 }}>
                    <Text style={stil.gedaechtnisText}>{w.thema}</Text>
                    <Text style={stil.klein}>{datumLesbar(w.faelligAm)}</Text>
                  </View>
                  <Pressable
                    onPress={() => followups.entfernen(w.id)}
                    style={stil.miniKnopf}
                    accessibilityLabel={`${w.thema} entfernen`}
                  >
                    <Text style={{ color: f.warnung }}>✕</Text>
                  </Pressable>
                </View>
              ))}
          </View>
        )}

        <View style={stil.block}>
          <Text style={stil.abschnitt}>BEREICHE</Text>
          {profil.categories.length === 0 && <Text style={stil.klein}>Noch keine.</Text>}
          {profil.categories.map((k) => (
            <KategorieZeile key={k} name={k} />
          ))}
        </View>

        <View style={stil.block}>
          <Text style={stil.abschnitt}>DATEN</Text>
          <Text style={stil.klein}>
            Maho denkt mit einem Sprachmodell von OpenAI. Was du schreibst, und was hier oben
            gespeichert ist, wird dorthin übertragen, um die Antwort zu erzeugen.
          </Text>
          <Pressable onPress={datenExportieren} style={stil.aktionZeile}>
            <Text style={stil.aktionText}>Meine Daten exportieren</Text>
          </Pressable>
          <Pressable
            onPress={() =>
              Alert.alert('Chatverlauf löschen?', 'Die Unterhaltung wird gelöscht. Was Maho gelernt hat, bleibt.', [
                { text: 'Abbrechen', style: 'cancel' },
                { text: 'Löschen', style: 'destructive', onPress: () => chat.leeren() },
              ])
            }
            style={stil.aktionZeile}
          >
            <Text style={stil.aktionText}>Chatverlauf löschen</Text>
          </Pressable>
          <Pressable onPress={allesLoeschen} style={stil.aktionZeile}>
            <Text style={[stil.aktionText, { color: f.warnung }]}>Alle meine Daten löschen</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function KategorieZeile({ name }: { name: string }) {
  const f = useFarben();
  const stil = stile(f);
  const [wert, setWert] = useState(name);

  function loeschen() {
    const anzahl = aufgabenIn(name);
    Alert.alert(
      `„${name}" löschen?`,
      anzahl > 0
        ? `${anzahl} Aufgabe${anzahl === 1 ? '' : 'n'} verliert die Zuordnung, bleibt aber bestehen.`
        : 'Die Kategorie wird entfernt.',
      [
        { text: 'Abbrechen', style: 'cancel' },
        { text: 'Löschen', style: 'destructive', onPress: () => kategorieLoeschen(name) },
      ]
    );
  }

  return (
    <View style={stil.zeile}>
      <TextInput
        style={[stil.feld, { flex: 1 }]}
        value={wert}
        onChangeText={setWert}
        onBlur={() => kategorieUmbenennen(name, wert)}
      />
      <Pressable onPress={loeschen} style={stil.miniKnopf} accessibilityLabel={`${name} löschen`}>
        <Text style={{ color: f.warnung }}>✕</Text>
      </Pressable>
    </View>
  );
}

const stile = (f: Farben) =>
  StyleSheet.create({
  sicher: { flex: 1, backgroundColor: f.papier },
  kopf: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: abstand.l,
    paddingVertical: abstand.s,
    borderBottomWidth: 1,
    borderBottomColor: f.linie,
  },
  zurueck: { minWidth: 80, minHeight: 44, justifyContent: 'center' },
  zurueckText: { color: f.weg, fontSize: 16 },
  kopfTitel: { ...schrift.titel, fontSize: 17, color: f.tinte },
  inhalt: { padding: abstand.l, gap: abstand.xl, paddingBottom: abstand.xl * 2 },
  block: { gap: abstand.s },
  abschnitt: { ...schrift.abschnitt, color: f.gedaempft },
  beschriftung: { fontSize: 13, color: f.gedaempft, marginTop: abstand.s },
  feld: {
    borderWidth: 1,
    borderColor: f.linie,
    borderRadius: radius.m,
    paddingHorizontal: abstand.m,
    paddingVertical: abstand.s,
    fontSize: 16,
    color: f.tinte,
    minHeight: 44,
  },
  feldGross: { minHeight: 140 },
  feldFehler: { borderColor: f.warnung },
  balkenRahmen: { height: 6, backgroundColor: f.flaeche, borderRadius: radius.rund, overflow: 'hidden' },
  balken: { height: 6, backgroundColor: f.weg, borderRadius: radius.rund },
  zeile: { flexDirection: 'row', alignItems: 'center', gap: abstand.s, justifyContent: 'space-between' },
  klein: { fontSize: 13, color: f.gedaempft, flexShrink: 1 },
  kleinerKnopf: {
    backgroundColor: f.weg,
    borderRadius: radius.s,
    paddingHorizontal: abstand.m,
    paddingVertical: abstand.s,
    minHeight: 36,
    justifyContent: 'center',
  },
  kleinerKnopfText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  gedaechtnisZeile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: abstand.s,
    borderBottomWidth: 1,
    borderBottomColor: f.linie,
    paddingVertical: abstand.xs,
  },
  gedaechtnisText: { flex: 1, fontSize: 15, color: f.tinte },
  miniKnopf: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  aktionZeile: { paddingVertical: abstand.m, borderBottomWidth: 1, borderBottomColor: f.linie, minHeight: 44 },
  aktionText: { fontSize: 16, color: f.weg },
});
