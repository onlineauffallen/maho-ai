import { useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
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
import { alleTermineLoeschen } from '@/lib/kalender';
import { useFollowupStore } from '@/lib/followupStore';
import { datumLesbar } from '@/lib/ids';
import { kategorieLoeschen, kategorieUmbenennen, aufgabenIn } from '@/lib/kategorien';
import { abstand, farben, radius, schrift } from '@/lib/theme';

/**
 * Der Rückweg zu allem, was Maho über den Nutzer gespeichert hat.
 *
 * Ohne diesen Screen war die App eine Einbahnstraße: ein einmal gesetzter Name
 * ließ sich nie mehr ändern, das Gedächtnis war unsichtbar, und Auskunft,
 * Berichtigung und Löschung waren technisch unmöglich.
 */
export default function EinstellungenScreen() {
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

  const gedaechtnisZeilen = memory.split('\n').filter((z) => z.trim());

  return (
    <SafeAreaView style={styles.sicher}>
      <View style={styles.kopf}>
        <Pressable onPress={() => router.back()} style={styles.zurueck} accessibilityRole="button">
          <Text style={styles.zurueckText}>‹ Zurück</Text>
        </Pressable>
        <Text style={styles.kopfTitel}>Einstellungen</Text>
        <View style={styles.zurueck} />
      </View>

      <ScrollView contentContainerStyle={styles.inhalt} keyboardShouldPersistTaps="handled">
        <View style={styles.block}>
          <Text style={styles.abschnitt}>ÜBER DICH</Text>
          <Text style={styles.beschriftung}>Wie ich dich nenne</Text>
          <TextInput
            style={styles.feld}
            value={name}
            onChangeText={setName}
            onBlur={() => profil.setName(name)}
            placeholder="du"
            placeholderTextColor={farben.schwach}
          />

          <Text style={styles.beschriftung}>Was ich über dich weiß</Text>
          <TextInput
            style={[styles.feld, styles.feldGross, zuLang && styles.feldFehler]}
            value={basics}
            onChangeText={setBasics}
            multiline
            textAlignVertical="top"
            placeholder="Noch nichts hinterlegt."
            placeholderTextColor={farben.schwach}
          />
          <View style={styles.balkenRahmen}>
            <View
              style={[
                styles.balken,
                { width: `${Math.min(100, (belegt / MAX_PROFILE_CHARS) * 100)}%` },
                belegt > MAX_PROFILE_CHARS * 0.9 && { backgroundColor: farben.warnung },
              ]}
            />
          </View>
          <View style={styles.zeile}>
            <Text style={[styles.klein, zuLang && { color: farben.warnung }]}>
              {belegt} von {MAX_PROFILE_CHARS} Zeichen
            </Text>
            <Pressable onPress={basicsSichern} style={styles.kleinerKnopf}>
              <Text style={styles.kleinerKnopfText}>Sichern</Text>
            </Pressable>
          </View>
          {!!hinweis && <Text style={styles.klein}>{hinweis}</Text>}
        </View>

        <View style={styles.block}>
          <Text style={styles.abschnitt}>WAS MAHO GELERNT HAT</Text>
          {gedaechtnisZeilen.length === 0 && <Text style={styles.klein}>Noch nichts.</Text>}
          {gedaechtnisZeilen.map((z, i) => (
            <View key={`${i}-${z.slice(0, 12)}`} style={styles.gedaechtnisZeile}>
              <Text style={styles.gedaechtnisText}>{z}</Text>
              <Pressable
                onPress={() => gedaechtnisZeileLoeschen(z)}
                style={styles.miniKnopf}
                accessibilityRole="button"
                accessibilityLabel="Diese Erinnerung löschen"
              >
                <Text style={{ color: farben.warnung }}>✕</Text>
              </Pressable>
            </View>
          ))}
          {gedaechtnisZeilen.length > 0 && (
            <>
              <View style={styles.balkenRahmen}>
                <View
                  style={[styles.balken, { width: `${Math.min(100, (memory.length / MAX_MEMORY_CHARS) * 100)}%` }]}
                />
              </View>
              <Text style={styles.klein}>
                {memory.length} von {MAX_MEMORY_CHARS} Zeichen. Wird es eng, verdichtet Maho selbst.
              </Text>
            </>
          )}
        </View>

        {followups.wiedervorlagen.filter((w) => !w.angesprochen).length > 0 && (
          <View style={styles.block}>
            <Text style={styles.abschnitt}>WORÜBER WIR NOCHMAL REDEN</Text>
            {followups.wiedervorlagen
              .filter((w) => !w.angesprochen)
              .map((w) => (
                <View key={w.id} style={styles.gedaechtnisZeile}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.gedaechtnisText}>{w.thema}</Text>
                    <Text style={styles.klein}>{datumLesbar(w.faelligAm)}</Text>
                  </View>
                  <Pressable
                    onPress={() => followups.entfernen(w.id)}
                    style={styles.miniKnopf}
                    accessibilityLabel={`${w.thema} entfernen`}
                  >
                    <Text style={{ color: farben.warnung }}>✕</Text>
                  </Pressable>
                </View>
              ))}
          </View>
        )}

        <View style={styles.block}>
          <Text style={styles.abschnitt}>BEREICHE</Text>
          {profil.categories.length === 0 && <Text style={styles.klein}>Noch keine.</Text>}
          {profil.categories.map((k) => (
            <KategorieZeile key={k} name={k} />
          ))}
        </View>

        <View style={styles.block}>
          <Text style={styles.abschnitt}>DATEN</Text>
          <Text style={styles.klein}>
            Maho denkt mit einem Sprachmodell von OpenAI. Was du schreibst, und was hier oben
            gespeichert ist, wird dorthin übertragen, um die Antwort zu erzeugen.
          </Text>
          <Pressable
            onPress={() =>
              Alert.alert('Chatverlauf löschen?', 'Die Unterhaltung wird gelöscht. Was Maho gelernt hat, bleibt.', [
                { text: 'Abbrechen', style: 'cancel' },
                { text: 'Löschen', style: 'destructive', onPress: () => chat.leeren() },
              ])
            }
            style={styles.aktionZeile}
          >
            <Text style={styles.aktionText}>Chatverlauf löschen</Text>
          </Pressable>
          <Pressable onPress={allesLoeschen} style={styles.aktionZeile}>
            <Text style={[styles.aktionText, { color: farben.warnung }]}>Alle meine Daten löschen</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function KategorieZeile({ name }: { name: string }) {
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
    <View style={styles.zeile}>
      <TextInput
        style={[styles.feld, { flex: 1 }]}
        value={wert}
        onChangeText={setWert}
        onBlur={() => kategorieUmbenennen(name, wert)}
      />
      <Pressable onPress={loeschen} style={styles.miniKnopf} accessibilityLabel={`${name} löschen`}>
        <Text style={{ color: farben.warnung }}>✕</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  sicher: { flex: 1, backgroundColor: farben.grund },
  kopf: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: abstand.l,
    paddingVertical: abstand.s,
    borderBottomWidth: 1,
    borderBottomColor: farben.rand,
  },
  zurueck: { minWidth: 80, minHeight: 44, justifyContent: 'center' },
  zurueckText: { color: farben.akzent, fontSize: 16 },
  kopfTitel: { ...schrift.titel, fontSize: 17, color: farben.text },
  inhalt: { padding: abstand.l, gap: abstand.xl, paddingBottom: abstand.xl * 2 },
  block: { gap: abstand.s },
  abschnitt: { ...schrift.abschnitt, color: farben.gedaempft },
  beschriftung: { fontSize: 13, color: farben.gedaempft, marginTop: abstand.s },
  feld: {
    borderWidth: 1,
    borderColor: farben.rand,
    borderRadius: radius.m,
    paddingHorizontal: abstand.m,
    paddingVertical: abstand.s,
    fontSize: 16,
    color: farben.text,
    minHeight: 44,
  },
  feldGross: { minHeight: 140 },
  feldFehler: { borderColor: farben.warnung },
  balkenRahmen: { height: 6, backgroundColor: farben.flaeche, borderRadius: radius.rund, overflow: 'hidden' },
  balken: { height: 6, backgroundColor: farben.akzent, borderRadius: radius.rund },
  zeile: { flexDirection: 'row', alignItems: 'center', gap: abstand.s, justifyContent: 'space-between' },
  klein: { fontSize: 13, color: farben.gedaempft, flexShrink: 1 },
  kleinerKnopf: {
    backgroundColor: farben.akzent,
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
    borderBottomColor: farben.rand,
    paddingVertical: abstand.xs,
  },
  gedaechtnisText: { flex: 1, fontSize: 15, color: farben.text },
  miniKnopf: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  aktionZeile: { paddingVertical: abstand.m, borderBottomWidth: 1, borderBottomColor: farben.rand, minHeight: 44 },
  aktionText: { fontSize: 16, color: farben.akzent },
});
