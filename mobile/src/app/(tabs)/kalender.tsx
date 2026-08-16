import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCalendarStore, type CalendarView } from '@/lib/calendarStore';
import { useTodoStore } from '@/lib/todoStore';
import { alsDatum, plusTage, today, wochenStart } from '@/lib/ids';
import { abstand, farben, radius, schrift } from '@/lib/theme';

const WOCHENTAGE = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
const MONATE = ['Jänner', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];

type Eintrag = {
  id: string;
  titel: string;
  datum: string;
  zeit?: string;
  art: 'termin' | 'aufgabe';
};

/** Zeitraum der aktuellen Ansicht, als Datumsgrenzen. */
function zeitraum(view: CalendarView, datum: string): { von: string; bis: string } {
  if (view === 'day') return { von: datum, bis: datum };
  if (view === 'week') {
    const start = wochenStart(datum);
    return { von: start, bis: plusTage(start, 6) };
  }
  const d = new Date(`${datum}T12:00:00`);
  const erster = new Date(d.getFullYear(), d.getMonth(), 1);
  const letzter = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  return { von: alsDatum(erster), bis: alsDatum(letzter) };
}

export default function KalenderScreen() {
  const { events, view, selectedDate, setView, setSelectedDate } = useCalendarStore();
  const todos = useTodoStore((s) => s.todos);
  const heute = today();
  const { von, bis } = zeitraum(view, selectedDate);

  // Termine und fällige Aufgaben in einer Liste. Aufgaben, die schon einen
  // Termin haben, kämen sonst doppelt: einmal als Termin, einmal als Fälligkeit.
  const eintraege = useMemo<Eintrag[]>(() => {
    const ausTerminen: Eintrag[] = events.map((e) => ({
      id: e.id, titel: e.title, datum: e.date, zeit: e.time, art: 'termin',
    }));
    const ausAufgaben: Eintrag[] = todos
      // Auf die Existenz des Termins prüfen, nicht auf das Vorhandensein des
      // Feldes: sonst verschwindet eine fällige Aufgabe für immer aus dem
      // Kalender, sobald ihr Termin gelöscht wurde.
      .filter((t) => t.due && !t.done && !events.some((e) => e.id === t.eventId))
      .map((t) => ({ id: t.id, titel: t.text, datum: t.due!, art: 'aufgabe' }));
    return [...ausTerminen, ...ausAufgaben].sort(
      (a, b) => a.datum.localeCompare(b.datum) || (a.zeit ?? '').localeCompare(b.zeit ?? '')
    );
  }, [events, todos]);

  const sichtbar = eintraege.filter((e) => e.datum >= von && e.datum <= bis);
  const proTag = useMemo(() => {
    const m = new Map<string, number>();
    for (const e of eintraege) m.set(e.datum, (m.get(e.datum) ?? 0) + 1);
    return m;
  }, [eintraege]);

  const d = new Date(`${selectedDate}T12:00:00`);
  const kopf =
    view === 'day'
      ? `${WOCHENTAGE[(d.getDay() + 6) % 7]}, ${d.getDate()}. ${MONATE[d.getMonth()]}`
      : view === 'week'
        ? `Woche ab ${new Date(`${von}T12:00:00`).getDate()}. ${MONATE[new Date(`${von}T12:00:00`).getMonth()]}`
        : `${MONATE[d.getMonth()]} ${d.getFullYear()}`;

  const schritt = view === 'day' ? 1 : view === 'week' ? 7 : 0;
  function blaettern(richtung: 1 | -1) {
    if (view === 'month') {
      const n = new Date(d.getFullYear(), d.getMonth() + richtung, 1);
      setSelectedDate(alsDatum(n));
    } else {
      setSelectedDate(plusTage(selectedDate, schritt * richtung));
    }
  }

  return (
    <SafeAreaView style={styles.sicher} edges={['top']}>
      <View style={styles.kopfBlock}>
        <View style={styles.umschalter}>
          {(['day', 'week', 'month'] as CalendarView[]).map((v) => (
            <Pressable
              key={v}
              onPress={() => setView(v)}
              style={({ pressed }) => [styles.umschaltKnopf, view === v && styles.umschaltAktiv, pressed && { opacity: 0.7 }]}
            >
              <Text style={[styles.umschaltText, view === v && styles.umschaltTextAktiv]}>
                {v === 'day' ? 'Tag' : v === 'week' ? 'Woche' : 'Monat'}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.navZeile}>
          <Pressable onPress={() => blaettern(-1)} hitSlop={10}><Text style={styles.pfeil}>‹</Text></Pressable>
          <Pressable onPress={() => setSelectedDate(heute)}>
            <Text style={styles.kopfText}>{kopf}</Text>
          </Pressable>
          <Pressable onPress={() => blaettern(1)} hitSlop={10}><Text style={styles.pfeil}>›</Text></Pressable>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.inhalt}>
        {view === 'week' && (
          <View style={styles.wochenRaster}>
            {Array.from({ length: 7 }, (_, i) => plusTage(von, i)).map((tag) => {
              const dd = new Date(`${tag}T12:00:00`);
              return (
                <Pressable
                  key={tag}
                  onPress={() => { setSelectedDate(tag); setView('day'); }}
                  style={[styles.wochenTag, tag === heute && styles.heuteFeld]}
                >
                  <Text style={styles.wochenTagName}>{WOCHENTAGE[(dd.getDay() + 6) % 7]}</Text>
                  <Text style={[styles.wochenTagZahl, tag === heute && styles.heuteText]}>{dd.getDate()}</Text>
                  {!!proTag.get(tag) && <View style={styles.punkt} />}
                </Pressable>
              );
            })}
          </View>
        )}

        {view === 'month' && <MonatsRaster datum={selectedDate} heute={heute} proTag={proTag}
          onTag={(tag) => { setSelectedDate(tag); setView('day'); }} />}

        <View style={{ gap: abstand.s }}>
          <Text style={styles.abschnitt}>
            {view === 'day' ? 'AN DIESEM TAG' : view === 'week' ? 'DIESE WOCHE' : 'DIESEN MONAT'}
            <Text style={styles.abschnittZahl}>  {sichtbar.length}</Text>
          </Text>

          {sichtbar.length === 0 && <Text style={styles.leer}>Nichts eingetragen.</Text>}

          {sichtbar.map((e) => (
            <View key={`${e.art}-${e.id}`} style={styles.eintrag}>
              <Text style={styles.eintragZeichen}>{e.art === 'termin' ? '📅' : '📝'}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.eintragTitel}>{e.titel}</Text>
                <Text style={styles.eintragZeit}>
                  {view === 'day' ? '' : `${e.datum} `}
                  {e.zeit ? `um ${e.zeit}` : e.art === 'aufgabe' ? 'fällig' : 'ganztägig'}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function MonatsRaster({
  datum, heute, proTag, onTag,
}: { datum: string; heute: string; proTag: Map<string, number>; onTag: (tag: string) => void }) {
  const d = new Date(`${datum}T12:00:00`);
  const erster = new Date(d.getFullYear(), d.getMonth(), 1);
  const tageImMonat = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  const versatz = (erster.getDay() + 6) % 7; // Montag als Wochenanfang

  const felder: (string | null)[] = [
    ...Array.from({ length: versatz }, () => null),
    ...Array.from({ length: tageImMonat }, (_, i) => alsDatum(new Date(d.getFullYear(), d.getMonth(), i + 1))),
  ];

  return (
    <View style={{ gap: abstand.xs }}>
      <View style={styles.monatKopf}>
        {WOCHENTAGE.map((w) => <Text key={w} style={styles.monatKopfText}>{w}</Text>)}
      </View>
      <View style={styles.monatRaster}>
        {felder.map((tag, i) => (
          <View key={tag ?? `leer-${i}`} style={styles.monatFeld}>
            {tag && (
              <Pressable onPress={() => onTag(tag)} style={[styles.monatTag, tag === heute && styles.heuteFeld]}>
                <Text style={[styles.monatTagZahl, tag === heute && styles.heuteText]}>
                  {Number(tag.slice(-2))}
                </Text>
                {!!proTag.get(tag) && <View style={styles.punkt} />}
              </Pressable>
            )}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sicher: { flex: 1, backgroundColor: farben.grund },
  kopfBlock: { paddingHorizontal: abstand.l, paddingTop: abstand.s, gap: abstand.m },
  umschalter: { flexDirection: 'row', backgroundColor: farben.flaeche, borderRadius: radius.m, padding: 3 },
  umschaltKnopf: { flex: 1, paddingVertical: abstand.s, borderRadius: radius.s, alignItems: 'center' },
  umschaltAktiv: { backgroundColor: farben.grund, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', elevation: 1 },
  umschaltText: { color: farben.gedaempft, fontSize: 14 },
  umschaltTextAktiv: { color: farben.text, fontWeight: '600' },
  navZeile: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pfeil: { fontSize: 28, color: farben.akzent, paddingHorizontal: abstand.m },
  kopfText: { ...schrift.titel, fontSize: 18, color: farben.text },
  inhalt: { padding: abstand.l, gap: abstand.l, paddingBottom: abstand.xl * 2 },
  wochenRaster: { flexDirection: 'row', justifyContent: 'space-between' },
  wochenTag: { alignItems: 'center', paddingVertical: abstand.s, paddingHorizontal: abstand.s, borderRadius: radius.m, minWidth: 40 },
  wochenTagName: { fontSize: 11, color: farben.schwach },
  wochenTagZahl: { fontSize: 16, color: farben.text, marginTop: 2 },
  monatKopf: { flexDirection: 'row' },
  monatKopfText: { flex: 1, textAlign: 'center', fontSize: 11, color: farben.schwach },
  monatRaster: { flexDirection: 'row', flexWrap: 'wrap' },
  monatFeld: { width: `${100 / 7}%`, aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
  monatTag: { alignItems: 'center', justifyContent: 'center', width: 34, height: 34, borderRadius: radius.rund },
  monatTagZahl: { fontSize: 14, color: farben.text },
  heuteFeld: { backgroundColor: farben.akzentSchwach },
  heuteText: { color: farben.akzent, fontWeight: '700' },
  punkt: { width: 4, height: 4, borderRadius: 2, backgroundColor: farben.akzent, marginTop: 2 },
  abschnitt: { ...schrift.abschnitt, color: farben.gedaempft },
  abschnittZahl: { fontWeight: '400', color: farben.schwach },
  eintrag: { flexDirection: 'row', gap: abstand.s, alignItems: 'flex-start', paddingVertical: abstand.s, borderBottomWidth: 1, borderBottomColor: farben.rand },
  eintragZeichen: { fontSize: 15 },
  eintragTitel: { fontSize: 16, color: farben.text },
  eintragZeit: { fontSize: 12, color: farben.gedaempft, marginTop: 2 },
  leer: { color: farben.schwach },
});
