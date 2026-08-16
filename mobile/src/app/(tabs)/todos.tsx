import { useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTodoStore, type Todo } from '@/lib/todoStore';
import { useCalendarStore } from '@/lib/calendarStore';
import {
  terminAnlegen,
  terminAendern,
  terminLoeschen,
  kalenderZugriffSicherstellen,
} from '@/lib/kalender';
import { useProfileStore, MAX_CATEGORIES } from '@/lib/profileStore';
import { datumLesbar, plusTage, today } from '@/lib/ids';
import { abstand, radius, schrift, useFarben, type Farben } from '@/lib/theme';
import { Zeile } from '@/components/Zeitspalte';

const OHNE = 'Ohne Bereich';
const WOCHENTAGE = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];

/** Was links in der Spalte steht: wann das fällig ist, kurz genug für die Breite. */
function faelligKurz(due: string | undefined, heute: string): { zeit: string; zusatz?: string } {
  if (!due) return { zeit: '–' };
  if (due < heute) return { zeit: 'offen', zusatz: 'überfällig' };
  if (due === heute) return { zeit: 'heute' };
  if (due === plusTage(heute, 1)) return { zeit: 'morgen' };
  const d = new Date(`${due}T12:00:00`);
  return { zeit: WOCHENTAGE[d.getDay()], zusatz: `${d.getDate()}.${d.getMonth() + 1}.` };
}

export default function TodosScreen() {
  const f = useFarben();
  const stil = useMemo(() => stile(f), [f]);
  const { todos, addTodo, updateTodo, toggleDone, removeTodo } = useTodoStore();
  const events = useCalendarStore((s) => s.events);
  const { categories, addCategory } = useProfileStore();

  const [filter, setFilter] = useState<string>();
  const [neuOffen, setNeuOffen] = useState(false);
  const [erledigteZeigen, setErledigteZeigen] = useState(false);
  const heute = today();

  function inKalender(todo: Todo) {
    const datum = todo.due ?? heute;
    if (todo.eventId && events.some((e) => e.id === todo.eventId)) {
      terminAendern(todo.eventId, { date: datum });
      updateTodo(todo.id, { due: datum });
      return;
    }
    const ev = terminAnlegen({ title: todo.text, date: datum, todoId: todo.id });
    updateTodo(todo.id, { eventId: ev.id, due: datum });
    void kalenderZugriffSicherstellen();
  }

  function loeschen(todo: Todo) {
    const hatTermin = !!todo.eventId && events.some((e) => e.id === todo.eventId);
    Alert.alert(
      'Aufgabe löschen?',
      hatTermin ? `„${todo.text}" wird gelöscht, samt Termin im Kalender.` : `„${todo.text}" wird gelöscht.`,
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Löschen',
          style: 'destructive',
          onPress: () => {
            if (todo.eventId) terminLoeschen(todo.eventId);
            removeTodo(todo.id);
          },
        },
      ]
    );
  }

  const gefiltert = filter ? todos.filter((t) => t.category === filter) : todos;
  const offen = gefiltert.filter((t) => !t.done);
  const erledigt = gefiltert.filter((t) => t.done);

  const gruppen = useMemo(() => {
    const m = new Map<string, Todo[]>();
    for (const k of categories) m.set(k, []);
    for (const t of offen) {
      const key = t.category && categories.includes(t.category) ? t.category : OHNE;
      if (!m.has(key)) m.set(key, []);
      m.get(key)!.push(t);
    }
    for (const liste of m.values()) {
      liste.sort((a, b) => {
        if (a.due && b.due) return a.due.localeCompare(b.due);
        if (a.due) return -1;
        if (b.due) return 1;
        return a.createdAt.localeCompare(b.createdAt);
      });
    }
    return [...m.entries()]
      .filter(([, l]) => l.length > 0)
      .sort(([a], [b]) => (a === OHNE ? 1 : b === OHNE ? -1 : 0));
  }, [offen, categories]);

  function aufgabenZeile(todo: Todo, letzte: boolean) {
    const { zeit, zusatz } = faelligKurz(todo.due, heute);
    const ueberfaellig = !!todo.due && todo.due < heute && !todo.done;
    const imKalender = !!todo.eventId && events.some((e) => e.id === todo.eventId);

    return (
      <Zeile
        key={todo.id}
        zeit={zeit}
        zusatz={zusatz}
        hervorgehoben={ueberfaellig}
        gedimmt={todo.done}
        letzte={letzte}
      >
        <View style={stil.aufgabe}>
          <Pressable
            onPress={() => toggleDone(todo.id)}
            style={stil.hakenFeld}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: todo.done }}
            accessibilityLabel={todo.text}
          >
            <View style={[stil.kasten, todo.done && { backgroundColor: f.gut, borderColor: f.gut }]}>
              {todo.done && <Text style={stil.haken}>✓</Text>}
            </View>
          </Pressable>

          <View style={{ flex: 1 }}>
            <Text style={[schrift.normal, { color: todo.done ? f.schwach : f.tinte }, todo.done && stil.durch]}>
              {todo.text}
            </Text>
            {imKalender && (
              <Text style={[schrift.winzig, { color: f.gedaempft }]}>
                steht am {datumLesbar(todo.due ?? heute)} im Kalender
              </Text>
            )}
          </View>

          {!todo.done && (
            <Pressable onPress={() => inKalender(todo)} style={stil.aktion} accessibilityLabel="In den Kalender">
              <View style={[stil.miniRaster, { borderColor: imKalender ? f.weg : f.schwach }]}>
                <View style={[stil.miniLinie, { backgroundColor: imKalender ? f.weg : f.schwach }]} />
              </View>
            </Pressable>
          )}
          <Pressable onPress={() => loeschen(todo)} style={stil.aktion} accessibilityLabel="Löschen">
            <Text style={[stil.kreuz, { color: f.schwach }]}>✕</Text>
          </Pressable>
        </View>
      </Zeile>
    );
  }

  return (
    <SafeAreaView style={stil.sicher} edges={['top']}>
      <View style={stil.kopfBlock}>
        <View style={stil.titelZeile}>
          <View>
            <Text style={[schrift.gross, { color: f.tinte }]}>Aufgaben</Text>
            <Text style={[schrift.klein, { color: f.schwach }]}>
              {offen.length === 0 ? 'nichts offen' : `${offen.length} offen`}
            </Text>
          </View>
          <Pressable onPress={() => setNeuOffen(true)} style={stil.plusKnopf} accessibilityLabel="Neue Aufgabe">
            <Text style={stil.plusText}>+</Text>
          </Pressable>
        </View>

        {categories.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={stil.filterZeile}>
            <Filterchip label="Alle" aktiv={!filter} onPress={() => setFilter(undefined)} farben={f} />
            {categories.map((k) => (
              <Filterchip key={k} label={k} aktiv={filter === k} onPress={() => setFilter(k)} farben={f} />
            ))}
          </ScrollView>
        )}
      </View>

      <ScrollView contentContainerStyle={stil.inhalt}>
        {offen.length === 0 && (
          <Text style={[schrift.normal, { color: f.gedaempft }]}>
            {todos.length === 0
              ? 'Noch nichts zu tun. Sag Maho im Gespräch, was ansteht.'
              : 'Hier ist alles erledigt.'}
          </Text>
        )}

        {gruppen.map(([name, liste]) => (
          <View key={name}>
            <Text style={[schrift.abschnitt, stil.abschnitt]}>{name.toUpperCase()}</Text>
            {liste.map((t, i) => aufgabenZeile(t, i === liste.length - 1))}
          </View>
        ))}

        {erledigt.length > 0 && (
          <View>
            <Pressable onPress={() => setErledigteZeigen((z) => !z)} style={stil.erledigtKopf}>
              <Text style={[schrift.abschnitt, stil.abschnitt]}>
                {erledigteZeigen ? '▾' : '▸'}  {erledigt.length} ERLEDIGT
              </Text>
            </Pressable>
            {erledigteZeigen && erledigt.map((t, i) => aufgabenZeile(t, i === erledigt.length - 1))}
          </View>
        )}
      </ScrollView>

      <NeueAufgabe
        sichtbar={neuOffen}
        farben={f}
        categories={categories}
        onAbbrechen={() => setNeuOffen(false)}
        onAnlegen={(text, kategorie, due) => {
          addTodo({ text, category: kategorie, due });
          setNeuOffen(false);
        }}
        onNeueKategorie={(name) => addCategory(name)}
      />
    </SafeAreaView>
  );
}

function Filterchip({
  label, aktiv, onPress, farben: f,
}: { label: string; aktiv: boolean; onPress: () => void; farben: Farben }) {
  const stil = stile(f);
  return (
    <Pressable onPress={onPress} style={[stil.chip, aktiv && stil.chipAktiv]}>
      <Text style={[stil.chipText, aktiv && stil.chipTextAktiv]}>{label}</Text>
    </Pressable>
  );
}

function NeueAufgabe({
  sichtbar, farben: f, categories, onAbbrechen, onAnlegen, onNeueKategorie,
}: {
  sichtbar: boolean;
  farben: Farben;
  categories: string[];
  onAbbrechen: () => void;
  onAnlegen: (text: string, kategorie?: string, due?: string) => void;
  onNeueKategorie: (name: string) => string | undefined;
}) {
  const stil = stile(f);
  const heute = today();
  const [text, setText] = useState('');
  const [kategorie, setKategorie] = useState<string>();
  const [due, setDue] = useState<string>();
  const [neueKat, setNeueKat] = useState('');
  const [katFeld, setKatFeld] = useState(false);

  function anlegen() {
    if (!text.trim()) return;
    onAnlegen(text.trim(), kategorie, due);
    setText('');
    setDue(undefined);
  }

  const faelligkeiten = [
    { label: 'heute', wert: heute },
    { label: 'morgen', wert: plusTage(heute, 1) },
    { label: 'nächste Woche', wert: plusTage(heute, 7) },
  ];

  return (
    <Modal visible={sichtbar} animationType="slide" transparent onRequestClose={onAbbrechen}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={stil.dialogHintergrund}>
        <View style={stil.dialog}>
          <View style={stil.dialogKopf}>
            <Pressable onPress={onAbbrechen} style={stil.dialogKnopfLinks}>
              <Text style={[schrift.normal, { color: f.gedaempft }]}>Abbrechen</Text>
            </Pressable>
            <Text style={[schrift.titel, { color: f.tinte }]}>Neue Aufgabe</Text>
            <Pressable onPress={anlegen} style={stil.dialogKnopfRechts} disabled={!text.trim()}>
              <Text style={[schrift.betont, { color: f.weg }, !text.trim() && { opacity: 0.3 }]}>Anlegen</Text>
            </Pressable>
          </View>

          <TextInput
            style={stil.feld}
            value={text}
            onChangeText={setText}
            placeholder="Was ist zu tun?"
            placeholderTextColor={f.schwach}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={anlegen}
          />

          <Text style={[schrift.abschnitt, stil.abschnitt]}>BIS WANN</Text>
          <View style={stil.chipZeile}>
            {faelligkeiten.map((x) => (
              <Pressable
                key={x.wert}
                onPress={() => setDue(due === x.wert ? undefined : x.wert)}
                style={[stil.chip, due === x.wert && stil.chipAktiv]}
              >
                <Text style={[stil.chipText, due === x.wert && stil.chipTextAktiv]}>{x.label}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={[schrift.abschnitt, stil.abschnitt]}>BEREICH</Text>
          <View style={stil.chipZeile}>
            {categories.map((k) => (
              <Pressable
                key={k}
                onPress={() => setKategorie(kategorie === k ? undefined : k)}
                style={[stil.chip, kategorie === k && stil.chipAktiv]}
              >
                <Text style={[stil.chipText, kategorie === k && stil.chipTextAktiv]}>{k}</Text>
              </Pressable>
            ))}
            {categories.length < MAX_CATEGORIES && (
              <Pressable onPress={() => setKatFeld((s) => !s)} style={stil.chip}>
                <Text style={stil.chipText}>+ neuer Bereich</Text>
              </Pressable>
            )}
          </View>

          {katFeld && (
            <View style={stil.katZeile}>
              <TextInput
                style={[stil.feld, { flex: 1 }]}
                value={neueKat}
                onChangeText={setNeueKat}
                placeholder="Wie soll der Bereich heißen?"
                placeholderTextColor={f.schwach}
                returnKeyType="done"
              />
              <Pressable
                onPress={() => {
                  const echt = onNeueKategorie(neueKat);
                  if (echt) setKategorie(echt);
                  setNeueKat('');
                  setKatFeld(false);
                }}
                style={stil.katKnopf}
              >
                <Text style={[schrift.betont, { color: f.aufAkzent }]}>Anlegen</Text>
              </Pressable>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const stile = (f: Farben) =>
  StyleSheet.create({
    sicher: { flex: 1, backgroundColor: f.papier },
    kopfBlock: { paddingHorizontal: abstand.l, paddingTop: abstand.s, gap: abstand.m, paddingBottom: abstand.m },
    titelZeile: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
    plusKnopf: {
      width: 44, height: 44, borderRadius: radius.s, backgroundColor: f.weg,
      alignItems: 'center', justifyContent: 'center',
    },
    plusText: { color: f.aufAkzent, fontSize: 28, lineHeight: 32, fontFamily: 'BarlowSemiCondensed_500Medium' },
    filterZeile: { gap: abstand.s, paddingRight: abstand.l },
    inhalt: { paddingHorizontal: abstand.l, paddingBottom: abstand.xxl * 2, gap: abstand.l },
    abschnitt: { color: f.schwach, paddingBottom: abstand.s, paddingTop: abstand.s },
    aufgabe: { flexDirection: 'row', alignItems: 'flex-start', gap: abstand.s },
    hakenFeld: { width: 30, height: 30, alignItems: 'flex-start', justifyContent: 'center' },
    kasten: {
      width: 21, height: 21, borderWidth: 2, borderColor: f.schwach, borderRadius: radius.s,
      alignItems: 'center', justifyContent: 'center',
    },
    haken: { color: f.aufAkzent, fontSize: 13, lineHeight: 16 },
    durch: { textDecorationLine: 'line-through' },
    aktion: { width: 32, height: 34, alignItems: 'center', justifyContent: 'center' },
    miniRaster: { width: 15, height: 15, borderWidth: 1.5, borderRadius: 2 },
    miniLinie: { height: 1.5, width: '100%', marginTop: 2 },
    kreuz: { fontSize: 15 },
    erledigtKopf: { minHeight: 44, justifyContent: 'center' },
    chip: {
      borderWidth: 1, borderColor: f.linie, borderRadius: radius.s,
      paddingHorizontal: abstand.m, minHeight: 38, justifyContent: 'center',
    },
    chipAktiv: { backgroundColor: f.tinte, borderColor: f.tinte },
    chipText: { fontFamily: 'BarlowSemiCondensed_500Medium', fontSize: 16, color: f.gedaempft },
    chipTextAktiv: { color: f.aufDunkel },
    chipZeile: { flexDirection: 'row', flexWrap: 'wrap', gap: abstand.s },
    dialogHintergrund: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(16,49,78,0.4)' },
    dialog: {
      backgroundColor: f.papier, borderTopLeftRadius: radius.gross, borderTopRightRadius: radius.gross,
      padding: abstand.l, gap: abstand.s, paddingBottom: abstand.xxl,
    },
    dialogKopf: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: abstand.s },
    dialogKnopfLinks: { minWidth: 92, minHeight: 44, justifyContent: 'center' },
    dialogKnopfRechts: { minWidth: 92, minHeight: 44, justifyContent: 'center', alignItems: 'flex-end' },
    feld: {
      borderWidth: 1, borderColor: f.linie, backgroundColor: f.flaeche, borderRadius: radius.s,
      paddingHorizontal: abstand.m, paddingVertical: abstand.m,
      fontFamily: 'Barlow_400Regular', fontSize: 17, color: f.tinte, minHeight: 50,
    },
    katZeile: { flexDirection: 'row', gap: abstand.s, alignItems: 'center' },
    katKnopf: {
      backgroundColor: f.weg, borderRadius: radius.s, paddingHorizontal: abstand.l,
      minHeight: 50, justifyContent: 'center',
    },
  });
