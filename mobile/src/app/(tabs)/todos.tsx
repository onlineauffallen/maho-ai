import { useMemo, useState } from 'react';
import {
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
import { useProfileStore, MAX_CATEGORIES } from '@/lib/profileStore';
import { plusTage, today } from '@/lib/ids';
import { abstand, farben, radius, schrift } from '@/lib/theme';

const OHNE = 'Ohne Kategorie';

/** Fälligkeit ohne Datumswähler: die drei Fälle, die im Alltag zählen. */
function faelligkeitsChips(): { label: string; wert: string }[] {
  const heute = today();
  return [
    { label: 'Heute', wert: heute },
    { label: 'Morgen', wert: plusTage(heute, 1) },
    { label: 'In einer Woche', wert: plusTage(heute, 7) },
  ];
}

export default function TodosScreen() {
  const { todos, addTodo, updateTodo, toggleDone, removeTodo } = useTodoStore();
  const { events, addEvent, updateEvent, removeEvent } = useCalendarStore();
  const { categories, addCategory } = useProfileStore();

  const [text, setText] = useState('');
  const [kategorie, setKategorie] = useState<string | undefined>();
  const [due, setDue] = useState<string | undefined>();
  const [neueKategorie, setNeueKategorie] = useState('');
  const [neueSichtbar, setNeueSichtbar] = useState(false);

  const heute = today();

  function hinzufuegen() {
    if (!text.trim()) return;
    addTodo({ text: text.trim(), category: kategorie, due });
    setText('');
    setDue(undefined);
  }

  function kategorieAnlegen() {
    const echt = addCategory(neueKategorie);
    if (echt) setKategorie(echt);
    setNeueKategorie('');
    setNeueSichtbar(false);
  }

  /** Aufgabe in den Kalender. Sie bleibt bestehen, der Termin wird verknüpft. */
  function inKalender(todo: Todo) {
    const datum = todo.due ?? heute;
    if (todo.eventId && events.some((e) => e.id === todo.eventId)) {
      updateEvent(todo.eventId, { date: datum });
      updateTodo(todo.id, { due: datum });
      return;
    }
    const ev = addEvent({ title: todo.text, date: datum, todoId: todo.id });
    updateTodo(todo.id, { eventId: ev.id, due: datum });
  }

  function loeschen(todo: Todo) {
    if (todo.eventId) removeEvent(todo.eventId); // sonst bleibt eine Leiche im Kalender
    removeTodo(todo.id);
  }

  const gruppen = useMemo(() => {
    const map = new Map<string, Todo[]>();
    for (const k of categories) map.set(k, []);
    for (const t of todos) {
      const key = t.category && categories.includes(t.category) ? t.category : OHNE;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(t);
    }
    for (const liste of map.values()) {
      liste.sort((a, b) => {
        if (a.done !== b.done) return a.done ? 1 : -1;
        if (a.due && b.due) return a.due.localeCompare(b.due);
        if (a.due) return -1;
        if (b.due) return 1;
        return a.createdAt.localeCompare(b.createdAt);
      });
    }
    return [...map.entries()]
      .filter(([, l]) => l.length > 0)
      .sort(([a], [b]) => (a === OHNE ? 1 : b === OHNE ? -1 : 0));
  }, [todos, categories]);

  return (
    <SafeAreaView style={styles.sicher} edges={['top']}>
      <ScrollView contentContainerStyle={styles.inhalt} keyboardShouldPersistTaps="handled">
        <Text style={styles.titel}>Aufgaben</Text>

        <View style={styles.eingabeBlock}>
          <View style={styles.eingabeZeile}>
            <TextInput
              style={styles.feld}
              value={text}
              onChangeText={setText}
              placeholder="Neue Aufgabe…"
              placeholderTextColor={farben.schwach}
              onSubmitEditing={hinzufuegen}
              returnKeyType="done"
            />
            <Pressable
              onPress={hinzufuegen}
              disabled={!text.trim()}
              style={({ pressed }) => [styles.knopf, !text.trim() && { opacity: 0.4 }, pressed && { opacity: 0.7 }]}
            >
              <Text style={styles.knopfText}>Hinzufügen</Text>
            </Pressable>
          </View>

          <View style={styles.chipZeile}>
            {categories.map((k) => (
              <Chip key={k} label={k} aktiv={kategorie === k} onPress={() => setKategorie(kategorie === k ? undefined : k)} />
            ))}
            {categories.length < MAX_CATEGORIES && (
              <Chip label="＋" aktiv={false} onPress={() => setNeueSichtbar((s) => !s)} />
            )}
          </View>

          {neueSichtbar && (
            <View style={styles.eingabeZeile}>
              <TextInput
                style={styles.feld}
                value={neueKategorie}
                onChangeText={setNeueKategorie}
                placeholder="Name der Kategorie"
                placeholderTextColor={farben.schwach}
                onSubmitEditing={kategorieAnlegen}
                returnKeyType="done"
              />
              <Pressable onPress={kategorieAnlegen} style={styles.knopf}>
                <Text style={styles.knopfText}>Anlegen</Text>
              </Pressable>
            </View>
          )}

          <View style={styles.chipZeile}>
            {faelligkeitsChips().map((f) => (
              <Chip key={f.wert} label={f.label} aktiv={due === f.wert} onPress={() => setDue(due === f.wert ? undefined : f.wert)} />
            ))}
          </View>
        </View>

        {todos.length === 0 && <Text style={styles.leer}>Keine Aufgaben. Angenehm.</Text>}

        {gruppen.map(([name, liste]) => (
          <View key={name} style={{ gap: abstand.s }}>
            <Text style={styles.abschnitt}>
              {name.toUpperCase()}
              <Text style={styles.abschnittZahl}>  {liste.filter((t) => !t.done).length} offen</Text>
            </Text>
            {liste.map((todo) => {
              const ueberfaellig = !todo.done && todo.due && todo.due < heute;
              const imKalender = !!todo.eventId && events.some((e) => e.id === todo.eventId);
              return (
                <View key={todo.id} style={styles.zeile}>
                  <Pressable onPress={() => toggleDone(todo.id)} style={styles.hakenFeld} hitSlop={8}>
                    <Text style={styles.haken}>{todo.done ? '☑' : '☐'}</Text>
                  </Pressable>

                  <View style={{ flex: 1 }}>
                    <Text style={[styles.aufgabe, todo.done && styles.erledigt]}>{todo.text}</Text>
                    {todo.due && (
                      <Text style={[styles.faellig, ueberfaellig && styles.ueberfaellig]}>
                        fällig {todo.due}
                        {ueberfaellig ? ' (überfällig)' : ''}
                      </Text>
                    )}
                  </View>

                  <Pressable onPress={() => inKalender(todo)} hitSlop={8} style={styles.aktion}>
                    <Text style={{ fontSize: 16, opacity: imKalender ? 1 : 0.4 }}>📅</Text>
                  </Pressable>
                  <Pressable onPress={() => loeschen(todo)} hitSlop={8} style={styles.aktion}>
                    <Text style={{ color: farben.warnung, fontSize: 16 }}>✕</Text>
                  </Pressable>
                </View>
              );
            })}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

function Chip({ label, aktiv, onPress }: { label: string; aktiv: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.chip, aktiv && styles.chipAktiv, pressed && { opacity: 0.7 }]}
    >
      <Text style={[styles.chipText, aktiv && styles.chipTextAktiv]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  sicher: { flex: 1, backgroundColor: farben.grund },
  inhalt: { padding: abstand.l, gap: abstand.l, paddingBottom: abstand.xl * 2 },
  titel: { ...schrift.titel, color: farben.text },
  eingabeBlock: { gap: abstand.s, borderBottomWidth: 1, borderBottomColor: farben.rand, paddingBottom: abstand.l },
  eingabeZeile: { flexDirection: 'row', gap: abstand.s },
  feld: {
    flex: 1,
    borderWidth: 1,
    borderColor: farben.rand,
    borderRadius: radius.m,
    paddingHorizontal: abstand.m,
    paddingVertical: abstand.s,
    fontSize: 16,
    color: farben.text,
  },
  knopf: { backgroundColor: farben.akzent, borderRadius: radius.m, paddingHorizontal: abstand.m, justifyContent: 'center' },
  knopfText: { color: '#fff', fontWeight: '600' },
  chipZeile: { flexDirection: 'row', flexWrap: 'wrap', gap: abstand.s },
  chip: {
    borderWidth: 1,
    borderColor: farben.rand,
    borderRadius: radius.rund,
    paddingHorizontal: abstand.m,
    paddingVertical: abstand.xs + 2,
  },
  chipAktiv: { backgroundColor: farben.akzentSchwach, borderColor: '#ddd6fe' },
  chipText: { color: farben.gedaempft, fontSize: 14 },
  chipTextAktiv: { color: farben.akzent, fontWeight: '600' },
  abschnitt: { ...schrift.abschnitt, color: farben.gedaempft },
  abschnittZahl: { fontWeight: '400', color: farben.schwach },
  zeile: { flexDirection: 'row', alignItems: 'center', gap: abstand.s, paddingVertical: abstand.s, borderBottomWidth: 1, borderBottomColor: farben.rand },
  hakenFeld: { width: 28 },
  haken: { fontSize: 20, color: farben.akzent },
  aufgabe: { fontSize: 16, color: farben.text },
  erledigt: { textDecorationLine: 'line-through', color: farben.schwach },
  faellig: { fontSize: 12, color: farben.gedaempft, marginTop: 2 },
  ueberfaellig: { color: farben.warnung, fontWeight: '600' },
  aktion: { paddingHorizontal: abstand.xs },
  leer: { color: farben.schwach },
});
