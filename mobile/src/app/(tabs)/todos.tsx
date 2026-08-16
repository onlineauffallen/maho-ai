import { useMemo, useState } from 'react';
import {
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
import { terminAnlegen, terminLoeschen, kalenderZugriffSicherstellen } from '@/lib/kalender';
import { useProfileStore, MAX_CATEGORIES } from '@/lib/profileStore';
import { datumLesbar, plusTage, today } from '@/lib/ids';
import { abstand, radius, schrift, useFarben, type Farben } from '@/lib/theme';
import { useNachfrage } from '@/components/Nachfrage';

const OHNE = 'Ohne Bereich';

/** Wann das fällig ist, in der Sprache des Nutzers. */
function faelligText(due: string | undefined, heute: string): string | undefined {
  if (!due) return undefined;
  if (due < heute) return 'überfällig';
  return datumLesbar(due);
}

export default function TodosScreen() {
  const f = useFarben();
  const stil = useMemo(() => stile(f), [f]);
  const { todos, addTodo, updateTodo, toggleDone, removeTodo } = useTodoStore();
  const events = useCalendarStore((s) => s.events);
  const { categories, addCategory } = useProfileStore();
  const { frage, dialog } = useNachfrage();

  const [filter, setFilter] = useState<string>();
  const [neuOffen, setNeuOffen] = useState(false);
  const [erledigteZeigen, setErledigteZeigen] = useState(false);
  const heute = today();

  /** Hin und zurück: was in den Kalender geht, muss auch wieder heraus. */
  function kalenderUmschalten(todo: Todo) {
    const termin = todo.eventId && events.find((e) => e.id === todo.eventId);
    if (termin) {
      frage({
        titel: 'Aus dem Kalender nehmen?',
        text: `„${todo.text}" bleibt als Aufgabe stehen, der Termin verschwindet.`,
        knopf: 'Entfernen',
        onBestaetigen: () => {
          terminLoeschen(termin.id);
          updateTodo(todo.id, { eventId: undefined });
        },
      });
      return;
    }
    const datum = todo.due ?? heute;
    const ev = terminAnlegen({ title: todo.text, date: datum, todoId: todo.id });
    updateTodo(todo.id, { eventId: ev.id, due: datum });
    void kalenderZugriffSicherstellen();
  }

  function loeschen(todo: Todo) {
    const hatTermin = !!todo.eventId && events.some((e) => e.id === todo.eventId);
    frage({
      titel: 'Aufgabe löschen?',
      text: hatTermin
        ? `„${todo.text}" wird gelöscht, samt dem Termin im Kalender.`
        : `„${todo.text}" wird gelöscht.`,
      knopf: 'Löschen',
      onBestaetigen: () => {
        if (todo.eventId) terminLoeschen(todo.eventId);
        removeTodo(todo.id);
      },
    });
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

  function karte(todo: Todo) {
    const dringend = !!todo.due && todo.due <= heute && !todo.done;
    const ueberfaellig = !!todo.due && todo.due < heute && !todo.done;
    const faellig = faelligText(todo.due, heute);
    const imKalender = !!todo.eventId && events.some((e) => e.id === todo.eventId);

    return (
      <View key={todo.id} style={stil.karte}>
        {/* Die Kante erscheint nur, wenn es drückt. Sonst bleibt die Karte ruhig. */}
        {dringend && <View style={[stil.kante, ueberfaellig && { backgroundColor: f.warnung }]} />}

        <Pressable
          onPress={() => toggleDone(todo.id)}
          style={stil.kreisFeld}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: todo.done }}
          accessibilityLabel={todo.text}
        >
          <View style={[stil.kreis, todo.done && { backgroundColor: f.gut, borderColor: f.gut }]}>
            {todo.done && <View style={stil.kreisHaken} />}
          </View>
        </Pressable>

        <View style={stil.karteText}>
          <Text style={[schrift.normal, { color: todo.done ? f.schwach : f.tinte }, todo.done && stil.durch]}>
            {todo.text}
          </Text>
          {(faellig || imKalender) && (
            <Text style={[schrift.klein, { color: ueberfaellig ? f.warnung : f.gedaempft }]}>
              {faellig}
              {faellig && imKalender ? ' · ' : ''}
              {imKalender ? 'im Kalender' : ''}
            </Text>
          )}
        </View>

        {!todo.done && (
          <Pressable
            onPress={() => kalenderUmschalten(todo)}
            style={stil.aktion}
            accessibilityLabel={imKalender ? 'Aus dem Kalender nehmen' : 'In den Kalender'}
          >
            <KalenderSymbol farben={f} aktiv={imKalender} />
          </Pressable>
        )}
        <Pressable onPress={() => loeschen(todo)} style={stil.aktion} accessibilityLabel="Löschen">
          <KreuzSymbol farben={f} />
        </Pressable>
      </View>
    );
  }

  return (
    <SafeAreaView style={stil.sicher} edges={['top']}>
      <ScrollView contentContainerStyle={stil.inhalt} showsVerticalScrollIndicator={false}>
        <View style={stil.kopf}>
          <View>
            <Text style={[schrift.gross, { color: f.tinte }]}>Aufgaben</Text>
            <Text style={[schrift.klein, { color: f.gedaempft }]}>
              {offen.length === 0 ? 'nichts offen' : `${offen.length} offen`}
            </Text>
          </View>
          <Pressable onPress={() => setNeuOffen(true)} style={stil.plus} accessibilityLabel="Neue Aufgabe">
            <View style={[stil.plusStrich, { width: 20, height: 2.5 }]} />
            <View style={[stil.plusStrich, { width: 2.5, height: 20, position: 'absolute' }]} />
          </Pressable>
        </View>

        {categories.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={stil.filterZeile}>
            <Chip label="Alle" aktiv={!filter} onPress={() => setFilter(undefined)} farben={f} />
            {categories.map((k) => (
              <Chip key={k} label={k} aktiv={filter === k} onPress={() => setFilter(k)} farben={f} />
            ))}
          </ScrollView>
        )}

        {offen.length === 0 && (
          <Text style={[schrift.normal, { color: f.gedaempft }]}>
            {todos.length === 0
              ? 'Noch nichts zu tun. Sag Maho im Gespräch, was ansteht.'
              : 'Hier ist alles erledigt.'}
          </Text>
        )}

        {gruppen.map(([name, liste]) => (
          <View key={name} style={stil.gruppe}>
            <Text style={[schrift.titel, { color: f.gedaempft, fontSize: 17 }]}>{name}</Text>
            {liste.map(karte)}
          </View>
        ))}

        {erledigt.length > 0 && (
          <View style={stil.gruppe}>
            <Pressable onPress={() => setErledigteZeigen((z) => !z)} style={stil.erledigtKopf}>
              <Text style={[schrift.klein, { color: f.schwach }]}>
                {erledigteZeigen ? 'Erledigtes ausblenden' : `${erledigt.length} Erledigtes anzeigen`}
              </Text>
            </Pressable>
            {erledigteZeigen && erledigt.map(karte)}
          </View>
        )}
      </ScrollView>

      {dialog}

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

/** Kalender als weiche Form: abgerundete Fläche mit Kopfleiste. */
function KalenderSymbol({ farben: f, aktiv }: { farben: Farben; aktiv: boolean }) {
  const ton = aktiv ? f.signal : f.schwach;
  return (
    <View style={{ width: 20, height: 20, borderRadius: 6, borderWidth: 2, borderColor: ton, overflow: 'hidden' }}>
      <View style={{ height: 5, backgroundColor: ton }} />
    </View>
  );
}

function KreuzSymbol({ farben: f }: { farben: Farben }) {
  const strich = {
    position: 'absolute' as const,
    width: 16,
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

function Chip({
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
          <View style={stil.griff} />
          <Text style={[schrift.titel, { color: f.tinte }]}>Neue Aufgabe</Text>

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

          <Text style={[schrift.klein, { color: f.gedaempft }]}>Bis wann</Text>
          <View style={stil.chipZeile}>
            {faelligkeiten.map((x) => (
              <Chip
                key={x.wert}
                label={x.label}
                aktiv={due === x.wert}
                onPress={() => setDue(due === x.wert ? undefined : x.wert)}
                farben={f}
              />
            ))}
          </View>

          {categories.length > 0 && (
            <>
              <Text style={[schrift.klein, { color: f.gedaempft }]}>Bereich</Text>
              <View style={stil.chipZeile}>
                {categories.map((k) => (
                  <Chip
                    key={k}
                    label={k}
                    aktiv={kategorie === k}
                    onPress={() => setKategorie(kategorie === k ? undefined : k)}
                    farben={f}
                  />
                ))}
                {categories.length < MAX_CATEGORIES && (
                  <Chip label="+ neuer Bereich" aktiv={false} onPress={() => setKatFeld((s) => !s)} farben={f} />
                )}
              </View>
            </>
          )}

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

          <View style={stil.dialogKnoepfe}>
            <Pressable onPress={onAbbrechen} style={stil.abbrechen}>
              <Text style={[schrift.betont, { color: f.gedaempft }]}>Abbrechen</Text>
            </Pressable>
            <Pressable
              onPress={anlegen}
              disabled={!text.trim()}
              style={[stil.anlegen, !text.trim() && { opacity: 0.35 }]}
            >
              <Text style={[schrift.betont, { color: f.aufAkzent }]}>Anlegen</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const stile = (f: Farben) =>
  StyleSheet.create({
    sicher: { flex: 1, backgroundColor: f.papier },
    inhalt: { paddingHorizontal: abstand.l, paddingTop: abstand.s, paddingBottom: abstand.xxl * 2, gap: abstand.l },
    kopf: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
    plus: {
      width: 52,
      height: 52,
      borderRadius: radius.rund,
      backgroundColor: f.weg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    plusStrich: { backgroundColor: f.aufAkzent, borderRadius: 2 },
    filterZeile: { gap: abstand.s, paddingRight: abstand.l },
    gruppe: { gap: abstand.s },
    karte: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: f.flaeche,
      borderRadius: radius.m,
      paddingVertical: abstand.m,
      paddingRight: abstand.s,
      paddingLeft: abstand.m,
      gap: abstand.s,
      overflow: 'hidden',
    },
    kante: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, backgroundColor: f.signal },
    kreisFeld: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
    kreis: {
      width: 24,
      height: 24,
      borderRadius: radius.rund,
      borderWidth: 2,
      borderColor: f.schwach,
      alignItems: 'center',
      justifyContent: 'center',
    },
    kreisHaken: { width: 9, height: 9, borderRadius: radius.rund, backgroundColor: f.papier },
    karteText: { flex: 1, gap: 1, paddingVertical: 2 },
    durch: { textDecorationLine: 'line-through' },
    aktion: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
    erledigtKopf: { minHeight: 44, justifyContent: 'center' },
    chip: {
      borderRadius: radius.rund,
      backgroundColor: f.flaeche,
      paddingHorizontal: abstand.l,
      minHeight: 42,
      justifyContent: 'center',
    },
    chipAktiv: { backgroundColor: f.weg },
    chipText: { fontFamily: 'Manrope_500Medium', fontSize: 16, color: f.gedaempft },
    chipTextAktiv: { color: f.aufAkzent, fontFamily: 'Manrope_600SemiBold' },
    chipZeile: { flexDirection: 'row', flexWrap: 'wrap', gap: abstand.s },
    dialogHintergrund: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.55)' },
    dialog: {
      backgroundColor: f.papier,
      borderTopLeftRadius: radius.gross,
      borderTopRightRadius: radius.gross,
      padding: abstand.l,
      gap: abstand.m,
      paddingBottom: abstand.xxl,
    },
    griff: {
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: f.linie,
      alignSelf: 'center',
      marginBottom: abstand.s,
    },
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
    katZeile: { flexDirection: 'row', gap: abstand.s, alignItems: 'center' },
    katKnopf: {
      backgroundColor: f.weg,
      borderRadius: radius.m,
      paddingHorizontal: abstand.l,
      minHeight: 54,
      justifyContent: 'center',
    },
    dialogKnoepfe: { flexDirection: 'row', gap: abstand.s, marginTop: abstand.s },
    abbrechen: {
      flex: 1,
      backgroundColor: f.flaeche,
      borderRadius: radius.m,
      minHeight: 54,
      alignItems: 'center',
      justifyContent: 'center',
    },
    anlegen: {
      flex: 2,
      backgroundColor: f.weg,
      borderRadius: radius.m,
      minHeight: 54,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
