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
import { useCalendarStore, type CalendarView } from '@/lib/calendarStore';
import { useTodoStore } from '@/lib/todoStore';
import { terminAnlegen, terminLoeschen, kalenderZugriffSicherstellen } from '@/lib/kalender';
import { alsDatum, datumLesbar, plusTage, today, wochenStart } from '@/lib/ids';
import { abstand, radius, schrift, useFarben, type Farben, ZEITSPALTE } from '@/lib/theme';
import { Zeile, JetztMarke } from '@/components/Zeitspalte';

const WOCHENTAGE = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
const WOCHENTAGE_LANG = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];
const MONATE = ['Jänner', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];

type Eintrag = {
  id: string;
  titel: string;
  datum: string;
  zeit?: string;
  ende?: string;
  art: 'termin' | 'aufgabe';
};

function zeitraum(view: CalendarView, datum: string): { von: string; bis: string } {
  if (view === 'day') return { von: datum, bis: datum };
  if (view === 'week') {
    const start = wochenStart(datum);
    return { von: start, bis: plusTage(start, 6) };
  }
  const d = new Date(`${datum}T12:00:00`);
  return {
    von: alsDatum(new Date(d.getFullYear(), d.getMonth(), 1)),
    bis: alsDatum(new Date(d.getFullYear(), d.getMonth() + 1, 0)),
  };
}

/** Was in der Zeitspalte links steht. Nie leer, sonst reißt die Schiene ab. */
function spaltenText(e: Eintrag): { zeit: string; zusatz?: string } {
  if (e.art === 'aufgabe') return { zeit: 'offen', zusatz: 'fällig' };
  if (!e.zeit) return { zeit: 'ganz', zusatz: 'tags' };
  return { zeit: e.zeit, zusatz: e.ende ? `bis ${e.ende}` : undefined };
}

export default function KalenderScreen() {
  const f = useFarben();
  const stil = useMemo(() => stile(f), [f]);
  const { events, view, selectedDate, setView, setSelectedDate } = useCalendarStore();
  const todos = useTodoStore((s) => s.todos);
  const toggleDone = useTodoStore((s) => s.toggleDone);
  const heute = today();
  const { von, bis } = zeitraum(view, selectedDate);
  const [neuOffen, setNeuOffen] = useState(false);
  const [neuDatum, setNeuDatum] = useState(selectedDate);

  const jetzt = new Date();
  const jetztZeit = `${`${jetzt.getHours()}`.padStart(2, '0')}:${`${jetzt.getMinutes()}`.padStart(2, '0')}`;

  function terminSichern(titel: string, zeit?: string) {
    terminAnlegen({ title: titel, date: neuDatum, time: zeit });
    setNeuOffen(false);
    setSelectedDate(neuDatum);
    void kalenderZugriffSicherstellen();
  }

  function loeschenMitRueckfrage(id: string, titel: string) {
    Alert.alert('Termin löschen?', `„${titel}" wird entfernt.`, [
      { text: 'Abbrechen', style: 'cancel' },
      { text: 'Löschen', style: 'destructive', onPress: () => terminLoeschen(id) },
    ]);
  }

  const eintraege = useMemo<Eintrag[]>(() => {
    const ausTerminen: Eintrag[] = events.map((e) => ({
      id: e.id, titel: e.title, datum: e.date, zeit: e.time, ende: e.endTime, art: 'termin',
    }));
    const ausAufgaben: Eintrag[] = todos
      .filter((t) => t.due && !t.done && !events.some((e) => e.id === t.eventId))
      .map((t) => ({ id: t.id, titel: t.text, datum: t.due!, art: 'aufgabe' }));
    return [...ausTerminen, ...ausAufgaben].sort(
      (a, b) => a.datum.localeCompare(b.datum) || (a.zeit ?? '').localeCompare(b.zeit ?? '')
    );
  }, [events, todos]);

  const sichtbar = eintraege.filter((e) => e.datum >= von && e.datum <= bis);
  const naechste = eintraege.filter((e) => e.datum > bis).slice(0, 3);
  const proTag = useMemo(() => {
    const m = new Map<string, number>();
    for (const e of eintraege) m.set(e.datum, (m.get(e.datum) ?? 0) + 1);
    return m;
  }, [eintraege]);

  // In Woche und Monat nach Tagen gruppieren. Eine ungegliederte Liste über
  // dreißig Tage kann niemand lesen.
  const nachTag = useMemo(() => {
    const m = new Map<string, Eintrag[]>();
    for (const e of sichtbar) m.set(e.datum, [...(m.get(e.datum) ?? []), e]);
    return [...m.entries()];
  }, [sichtbar]);

  const d = new Date(`${selectedDate}T12:00:00`);
  const kopf =
    view === 'day'
      ? selectedDate === heute
        ? 'Heute'
        : `${WOCHENTAGE_LANG[(d.getDay() + 6) % 7]}, ${d.getDate()}.`
      : view === 'week'
        ? `${new Date(`${von}T12:00:00`).getDate()}. bis ${new Date(`${bis}T12:00:00`).getDate()}. ${MONATE[new Date(`${bis}T12:00:00`).getMonth()]}`
        : `${MONATE[d.getMonth()]}`;
  const kopfKlein =
    view === 'day' ? `${d.getDate()}. ${MONATE[d.getMonth()]} ${d.getFullYear()}` : `${d.getFullYear()}`;

  function blaettern(richtung: 1 | -1) {
    if (view === 'month') {
      setSelectedDate(alsDatum(new Date(d.getFullYear(), d.getMonth() + richtung, 1)));
    } else {
      setSelectedDate(plusTage(selectedDate, (view === 'day' ? 1 : 7) * richtung));
    }
  }

  function eintragZeile(e: Eintrag, letzte: boolean) {
    const { zeit, zusatz } = spaltenText(e);
    const ueberfaellig = e.art === 'aufgabe' && e.datum < heute;
    return (
      <Zeile
        key={`${e.art}-${e.id}`}
        zeit={ueberfaellig ? 'offen' : zeit}
        zusatz={ueberfaellig ? 'überfällig' : zusatz}
        hervorgehoben={ueberfaellig}
        letzte={letzte}
      >
        <View style={stil.eintrag}>
          {/* Eine Aufgabe lässt sich hier direkt abhaken. Das Etikett "Termin"
              oder "Aufgabe" ist dafür weggefallen: die Spalte links sagt schon,
              was es ist, und ein Häkchen ist nützlicher als eine Beschriftung. */}
          {e.art === 'aufgabe' && (
            <Pressable
              onPress={() => toggleDone(e.id)}
              style={stil.hakenFeld}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: false }}
              accessibilityLabel={e.titel}
            >
              <View style={stil.kasten} />
            </Pressable>
          )}
          <Pressable
            onLongPress={e.art === 'termin' ? () => loeschenMitRueckfrage(e.id, e.titel) : undefined}
            style={{ flex: 1 }}
          >
            <Text style={[schrift.betont, { color: f.tinte }]}>{e.titel}</Text>
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
            <Text style={[schrift.gross, { color: f.tinte }]}>{kopf}</Text>
            <Text style={[schrift.klein, { color: f.schwach }]}>{kopfKlein}</Text>
          </View>
          <View style={stil.titelAktionen}>
            {selectedDate !== heute && (
              <Pressable onPress={() => setSelectedDate(heute)} style={stil.heuteKnopf}>
                <Text style={[schrift.klein, { color: f.weg, fontFamily: 'Barlow_500Medium' }]}>Heute</Text>
              </Pressable>
            )}
            <Pressable
              onPress={() => { setNeuDatum(selectedDate); setNeuOffen(true); }}
              style={stil.plusKnopf}
              accessibilityRole="button"
              accessibilityLabel="Neuen Termin anlegen"
            >
              <Text style={stil.plusText}>+</Text>
            </Pressable>
          </View>
        </View>

        <View style={stil.leiste}>
          <Pressable onPress={() => blaettern(-1)} style={stil.pfeilFeld} accessibilityLabel="zurück">
            <Text style={stil.pfeil}>‹</Text>
          </Pressable>
          <View style={stil.umschalter}>
            {(['day', 'week', 'month'] as CalendarView[]).map((v) => (
              <Pressable
                key={v}
                onPress={() => setView(v)}
                style={[stil.umschaltKnopf, view === v && stil.umschaltAktiv]}
              >
                <Text style={[stil.umschaltText, view === v && stil.umschaltTextAktiv]}>
                  {v === 'day' ? 'Tag' : v === 'week' ? 'Woche' : 'Monat'}
                </Text>
              </Pressable>
            ))}
          </View>
          <Pressable onPress={() => blaettern(1)} style={stil.pfeilFeld} accessibilityLabel="weiter">
            <Text style={stil.pfeil}>›</Text>
          </Pressable>
        </View>
      </View>

      <ScrollView contentContainerStyle={stil.inhalt}>
        {view === 'week' && (
          <View style={stil.wochenRaster}>
            {Array.from({ length: 7 }, (_, i) => plusTage(von, i)).map((tag) => {
              const dd = new Date(`${tag}T12:00:00`);
              const aktiv = tag === selectedDate;
              return (
                <Pressable
                  key={tag}
                  onPress={() => { setSelectedDate(tag); setView('day'); }}
                  style={[stil.wochenTag, tag === heute && stil.heuteFeld, aktiv && stil.gewaehltFeld]}
                >
                  <Text style={[stil.wochenTagName, tag === heute && { color: f.signal }]}>
                    {WOCHENTAGE[(dd.getDay() + 6) % 7]}
                  </Text>
                  <Text style={[stil.wochenTagZahl, tag === heute && { color: f.signal }]}>{dd.getDate()}</Text>
                  <View style={[stil.punktZeile, !proTag.get(tag) && { opacity: 0 }]}>
                    <View style={[stil.punkt, { backgroundColor: tag === heute ? f.signal : f.weg }]} />
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}

        {view === 'month' && (
          <MonatsRaster
            datum={selectedDate}
            heute={heute}
            proTag={proTag}
            farben={f}
            onTag={(tag) => { setSelectedDate(tag); setView('day'); }}
          />
        )}

        <View style={stil.liste}>
          {sichtbar.length === 0 ? (
            <View style={{ gap: abstand.m }}>
              <Text style={[schrift.normal, { color: f.gedaempft }]}>
                {view === 'day' ? 'An diesem Tag steht nichts an.' : 'In diesem Zeitraum steht nichts an.'}
              </Text>
              {naechste.length > 0 && (
                <>
                  <Text style={[schrift.abschnitt, stil.abschnitt]}>ALS NÄCHSTES</Text>
                  {naechste.map((e, i) => {
                    const { zeit, zusatz } = spaltenText(e);
                    return (
                      <Zeile key={`n-${e.id}`} zeit={zeit} zusatz={zusatz} letzte={i === naechste.length - 1}>
                        <Pressable onPress={() => { setSelectedDate(e.datum); setView('day'); }}>
                          <Text style={[schrift.betont, { color: f.tinte }]}>{e.titel}</Text>
                          <Text style={[schrift.klein, { color: f.gedaempft }]}>{datumLesbar(e.datum)}</Text>
                        </Pressable>
                      </Zeile>
                    );
                  })}
                </>
              )}
            </View>
          ) : view === 'day' ? (
            <>
              {sichtbar.map((e, i) => {
                const vorherNach =
                  selectedDate === heute &&
                  !!e.zeit &&
                  e.zeit > jetztZeit &&
                  (i === 0 || !sichtbar[i - 1].zeit || sichtbar[i - 1].zeit! <= jetztZeit);
                return (
                  <View key={`w-${e.art}-${e.id}`}>
                    {vorherNach && <JetztMarke zeit={jetztZeit} />}
                    {eintragZeile(e, i === sichtbar.length - 1)}
                  </View>
                );
              })}
              {/* Jetzt-Marke ans Ende, wenn alles Heutige schon vorbei ist. */}
              {selectedDate === heute &&
                sichtbar.every((e) => !e.zeit || e.zeit <= jetztZeit) && <JetztMarke zeit={jetztZeit} />}
            </>
          ) : (
            nachTag.map(([tag, liste]) => {
              const dd = new Date(`${tag}T12:00:00`);
              return (
                <View key={tag}>
                  <Pressable onPress={() => { setSelectedDate(tag); setView('day'); }} style={stil.tagKopf}>
                    <Text style={[schrift.abschnitt, stil.abschnitt, tag === heute && { color: f.signal }]}>
                      {WOCHENTAGE_LANG[(dd.getDay() + 6) % 7].toUpperCase()}, {dd.getDate()}.{dd.getMonth() + 1}.
                    </Text>
                  </Pressable>
                  {liste.map((e, i) => eintragZeile(e, i === liste.length - 1))}
                </View>
              );
            })
          )}
        </View>
      </ScrollView>

      <NeuerTermin
        sichtbar={neuOffen}
        datum={neuDatum}
        setDatum={setNeuDatum}
        farben={f}
        onAbbrechen={() => setNeuOffen(false)}
        onSichern={terminSichern}
      />
    </SafeAreaView>
  );
}

function MonatsRaster({
  datum, heute, proTag, farben: f, onTag,
}: {
  datum: string; heute: string; proTag: Map<string, number>; farben: Farben; onTag: (tag: string) => void;
}) {
  const stil = stile(f);
  const d = new Date(`${datum}T12:00:00`);
  const erster = new Date(d.getFullYear(), d.getMonth(), 1);
  const tage = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  const versatz = (erster.getDay() + 6) % 7;

  const felder: (string | null)[] = [
    ...Array.from({ length: versatz }, () => null),
    ...Array.from({ length: tage }, (_, i) => alsDatum(new Date(d.getFullYear(), d.getMonth(), i + 1))),
  ];

  return (
    <View style={stil.monat}>
      <View style={stil.monatKopf}>
        {WOCHENTAGE.map((w) => (
          <Text key={w} style={stil.monatKopfText}>{w}</Text>
        ))}
      </View>
      <View style={stil.monatRaster}>
        {felder.map((tag, i) => (
          <View key={tag ?? `leer-${i}`} style={stil.monatFeld}>
            {tag && (
              <Pressable onPress={() => onTag(tag)} style={[stil.monatTag, tag === heute && stil.heuteFeld]}>
                <Text style={[stil.monatZahl, tag === heute && { color: f.signal }]}>
                  {Number(tag.slice(-2))}
                </Text>
                <View style={[stil.punktZeile, !proTag.get(tag) && { opacity: 0 }]}>
                  <View style={[stil.punkt, { backgroundColor: tag === heute ? f.signal : f.weg }]} />
                </View>
              </Pressable>
            )}
          </View>
        ))}
      </View>
    </View>
  );
}

function NeuerTermin({
  sichtbar, datum, setDatum, farben: f, onAbbrechen, onSichern,
}: {
  sichtbar: boolean; datum: string; setDatum: (d: string) => void; farben: Farben;
  onAbbrechen: () => void; onSichern: (titel: string, zeit?: string) => void;
}) {
  const stil = stile(f);
  const [titel, setTitel] = useState('');
  const [zeit, setZeit] = useState('');

  function sichern() {
    if (!titel.trim()) return;
    onSichern(titel.trim(), zeit.trim() || undefined);
    setTitel('');
    setZeit('');
  }

  return (
    <Modal visible={sichtbar} animationType="slide" transparent onRequestClose={onAbbrechen}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={stil.dialogHintergrund}
      >
        <View style={stil.dialog}>
          <View style={stil.dialogKopf}>
            <Pressable onPress={onAbbrechen} style={stil.dialogKnopfLinks}>
              <Text style={[schrift.normal, { color: f.gedaempft }]}>Abbrechen</Text>
            </Pressable>
            <Text style={[schrift.titel, { color: f.tinte }]}>Neuer Termin</Text>
            <Pressable onPress={sichern} style={stil.dialogKnopfRechts} disabled={!titel.trim()}>
              <Text style={[schrift.betont, { color: f.weg }, !titel.trim() && { opacity: 0.3 }]}>Sichern</Text>
            </Pressable>
          </View>

          <TextInput
            style={stil.feld}
            value={titel}
            onChangeText={setTitel}
            placeholder="Worum geht es?"
            placeholderTextColor={f.schwach}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={sichern}
          />

          <Text style={[schrift.abschnitt, stil.abschnitt]}>WANN</Text>
          <View style={stil.datumZeile}>
            <Pressable onPress={() => setDatum(plusTage(datum, -1))} style={stil.pfeilFeld}>
              <Text style={stil.pfeil}>‹</Text>
            </Pressable>
            <Text style={[schrift.zeitGross, { color: f.tinte }]}>{datumLesbar(datum)}</Text>
            <Pressable onPress={() => setDatum(plusTage(datum, 1))} style={stil.pfeilFeld}>
              <Text style={stil.pfeil}>›</Text>
            </Pressable>
          </View>

          <Text style={[schrift.abschnitt, stil.abschnitt]}>UM WIE VIEL UHR</Text>
          <View style={stil.chipZeile}>
            {['', '08:00', '09:00', '12:00', '14:00', '17:00', '19:00'].map((z) => (
              <Pressable
                key={z || 'ganz'}
                onPress={() => setZeit(z)}
                style={[stil.chip, zeit === z && stil.chipAktiv]}
              >
                <Text style={[stil.chipText, zeit === z && stil.chipTextAktiv]}>{z || 'ganztags'}</Text>
              </Pressable>
            ))}
          </View>
          <TextInput
            style={stil.feld}
            value={zeit}
            onChangeText={setZeit}
            placeholder="oder eigene Uhrzeit, etwa 15:45"
            placeholderTextColor={f.schwach}
            keyboardType="numbers-and-punctuation"
          />
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
    titelAktionen: { flexDirection: 'row', alignItems: 'center', gap: abstand.s },
    heuteKnopf: {
      borderWidth: 1,
      borderColor: f.weg,
      borderRadius: radius.s,
      paddingHorizontal: abstand.m,
      minHeight: 38,
      justifyContent: 'center',
    },
    plusKnopf: {
      width: 44,
      height: 44,
      borderRadius: radius.s,
      backgroundColor: f.weg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    plusText: { color: f.aufAkzent, fontSize: 28, lineHeight: 32, fontFamily: 'BarlowSemiCondensed_500Medium' },
    leiste: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    umschalter: { flexDirection: 'row', borderWidth: 1, borderColor: f.linie, borderRadius: radius.s },
    umschaltKnopf: { paddingHorizontal: abstand.l, paddingVertical: abstand.s, minHeight: 38, justifyContent: 'center' },
    umschaltAktiv: { backgroundColor: f.tinte },
    umschaltText: { fontFamily: 'BarlowSemiCondensed_600SemiBold', fontSize: 15, color: f.gedaempft, letterSpacing: 0.3 },
    umschaltTextAktiv: { color: f.aufDunkel },
    pfeilFeld: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
    pfeil: { fontSize: 30, color: f.weg, lineHeight: 34 },
    inhalt: { paddingHorizontal: abstand.l, paddingBottom: abstand.xxl * 2, gap: abstand.l },
    liste: { paddingTop: abstand.s },
    eintrag: { flexDirection: 'row', alignItems: 'flex-start', gap: abstand.s },
    hakenFeld: { width: 28, height: 26, alignItems: 'flex-start', justifyContent: 'center' },
    kasten: { width: 20, height: 20, borderWidth: 2, borderColor: f.schwach, borderRadius: radius.s },
    abschnitt: { color: f.schwach },
    tagKopf: { paddingBottom: abstand.s, paddingTop: abstand.s },
    wochenRaster: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: abstand.s },
    wochenTag: { alignItems: 'center', paddingVertical: abstand.s, width: 44, borderRadius: radius.s },
    wochenTagName: { fontFamily: 'BarlowSemiCondensed_500Medium', fontSize: 12, color: f.schwach, letterSpacing: 0.5 },
    wochenTagZahl: { fontFamily: 'BarlowSemiCondensed_700Bold', fontSize: 19, color: f.tinte, marginTop: 1 },
    gewaehltFeld: { borderWidth: 1, borderColor: f.weg },
    heuteFeld: { backgroundColor: f.signalSchwach },
    punktZeile: { height: 8, justifyContent: 'center' },
    punkt: { width: 5, height: 5, borderRadius: radius.rund },
    monat: { gap: abstand.xs, paddingTop: abstand.s },
    monatKopf: { flexDirection: 'row' },
    monatKopfText: {
      flex: 1,
      textAlign: 'center',
      fontFamily: 'BarlowSemiCondensed_500Medium',
      fontSize: 12,
      color: f.schwach,
      letterSpacing: 0.5,
    },
    monatRaster: { flexDirection: 'row', flexWrap: 'wrap' },
    monatFeld: { width: `${100 / 7}%`, aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
    monatTag: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: radius.s },
    monatZahl: { fontFamily: 'BarlowSemiCondensed_600SemiBold', fontSize: 16, color: f.tinte },
    dialogHintergrund: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(16,49,78,0.4)' },
    dialog: {
      backgroundColor: f.papier,
      borderTopLeftRadius: radius.gross,
      borderTopRightRadius: radius.gross,
      padding: abstand.l,
      gap: abstand.s,
      paddingBottom: abstand.xxl,
    },
    dialogKopf: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: abstand.s },
    dialogKnopfLinks: { minWidth: 92, minHeight: 44, justifyContent: 'center' },
    dialogKnopfRechts: { minWidth: 92, minHeight: 44, justifyContent: 'center', alignItems: 'flex-end' },
    feld: {
      borderWidth: 1,
      borderColor: f.linie,
      backgroundColor: f.flaeche,
      borderRadius: radius.s,
      paddingHorizontal: abstand.m,
      paddingVertical: abstand.m,
      fontFamily: 'Barlow_400Regular',
      fontSize: 17,
      color: f.tinte,
      minHeight: 50,
    },
    datumZeile: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    chipZeile: { flexDirection: 'row', flexWrap: 'wrap', gap: abstand.s },
    chip: {
      borderWidth: 1,
      borderColor: f.linie,
      borderRadius: radius.s,
      paddingHorizontal: abstand.m,
      minHeight: 40,
      justifyContent: 'center',
    },
    chipAktiv: { backgroundColor: f.tinte, borderColor: f.tinte },
    chipText: { fontFamily: 'BarlowSemiCondensed_500Medium', fontSize: 16, color: f.gedaempft },
    chipTextAktiv: { color: f.aufDunkel },
  });
