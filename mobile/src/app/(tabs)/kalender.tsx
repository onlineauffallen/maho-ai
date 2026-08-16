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
import { useCalendarStore, type CalendarView } from '@/lib/calendarStore';
import { useTodoStore } from '@/lib/todoStore';
import { terminAnlegen, terminLoeschen, kalenderZugriffSicherstellen } from '@/lib/kalender';
import { alsDatum, datumLesbar, plusTage, today, wochenStart } from '@/lib/ids';
import { abstand, radius, schrift, useFarben, type Farben } from '@/lib/theme';
import { useNachfrage } from '@/components/Nachfrage';

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

/** Die Zeile über dem Titel: wann das ist, in Messing. */
function wannText(e: Eintrag, heute: string): string {
  if (e.art === 'aufgabe') return e.datum < heute ? 'überfällig' : 'fällig';
  if (!e.zeit) return 'ganztags';
  return e.ende ? `${e.zeit} bis ${e.ende}` : e.zeit;
}

export default function KalenderScreen() {
  const f = useFarben();
  const stil = useMemo(() => stile(f), [f]);
  const { events, view, selectedDate, setView, setSelectedDate } = useCalendarStore();
  const todos = useTodoStore((s) => s.todos);
  const toggleDone = useTodoStore((s) => s.toggleDone);
  const { frage, dialog } = useNachfrage();
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

  function loeschen(id: string, titel: string) {
    frage({
      titel: 'Termin löschen?',
      text: `„${titel}" wird aus dem Kalender entfernt.`,
      knopf: 'Löschen',
      onBestaetigen: () => terminLoeschen(id),
    });
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
        : WOCHENTAGE_LANG[(d.getDay() + 6) % 7]
      : view === 'week'
        ? 'Diese Woche'
        : MONATE[d.getMonth()];
  const kopfKlein =
    view === 'day'
      ? `${d.getDate()}. ${MONATE[d.getMonth()]} ${d.getFullYear()}`
      : view === 'week'
        ? `${new Date(`${von}T12:00:00`).getDate()}. bis ${new Date(`${bis}T12:00:00`).getDate()}. ${MONATE[new Date(`${bis}T12:00:00`).getMonth()]}`
        : `${d.getFullYear()}`;

  function blaettern(richtung: 1 | -1) {
    if (view === 'month') {
      setSelectedDate(alsDatum(new Date(d.getFullYear(), d.getMonth() + richtung, 1)));
    } else {
      setSelectedDate(plusTage(selectedDate, (view === 'day' ? 1 : 7) * richtung));
    }
  }

  function karte(e: Eintrag) {
    const dringend =
      e.art === 'aufgabe' ? e.datum <= heute : e.datum === heute && (!e.zeit || e.zeit >= jetztZeit);
    const ueberfaellig = e.art === 'aufgabe' && e.datum < heute;

    return (
      <View key={`${e.art}-${e.id}`} style={stil.karte}>
        {dringend && <View style={[stil.kante, ueberfaellig && { backgroundColor: f.warnung }]} />}

        {e.art === 'aufgabe' && (
          <Pressable
            onPress={() => toggleDone(e.id)}
            style={stil.kreisFeld}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: false }}
            accessibilityLabel={e.titel}
          >
            <View style={stil.kreis} />
          </Pressable>
        )}

        <View style={stil.karteText}>
          <Text style={[schrift.klein, { color: ueberfaellig ? f.warnung : f.signalText }]}>
            {wannText(e, heute)}
          </Text>
          <Text style={[schrift.normal, { color: f.tinte }]}>{e.titel}</Text>
        </View>

        {e.art === 'termin' && (
          <Pressable onPress={() => loeschen(e.id, e.titel)} style={stil.aktion} accessibilityLabel="Löschen">
            <Kreuz farben={f} />
          </Pressable>
        )}
      </View>
    );
  }

  return (
    <SafeAreaView style={stil.sicher} edges={['top']}>
      <View style={stil.kopfBlock}>
        <View style={stil.kopfZeile}>
          <View>
            <Text style={[schrift.gross, { color: f.tinte }]}>{kopf}</Text>
            <Text style={[schrift.klein, { color: f.gedaempft }]}>{kopfKlein}</Text>
          </View>
          <View style={stil.kopfAktionen}>
            {selectedDate !== heute && (
              <Pressable onPress={() => setSelectedDate(heute)} style={stil.heuteKnopf}>
                <Text style={[schrift.klein, { color: f.signalText }]}>Heute</Text>
              </Pressable>
            )}
            <Pressable
              onPress={() => { setNeuDatum(selectedDate); setNeuOffen(true); }}
              style={stil.plus}
              accessibilityLabel="Neuen Termin anlegen"
            >
              <View style={[stil.plusStrich, { width: 20, height: 2.5 }]} />
              <View style={[stil.plusStrich, { width: 2.5, height: 20, position: 'absolute' }]} />
            </Pressable>
          </View>
        </View>

        <View style={stil.leiste}>
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
          <View style={stil.pfeile}>
            <Pressable onPress={() => blaettern(-1)} style={stil.pfeilFeld} accessibilityLabel="zurück">
              <Pfeil farben={f} richtung="links" />
            </Pressable>
            <Pressable onPress={() => blaettern(1)} style={stil.pfeilFeld} accessibilityLabel="weiter">
              <Pfeil farben={f} richtung="rechts" />
            </Pressable>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={stil.inhalt} showsVerticalScrollIndicator={false}>
        {view === 'week' && (
          <View style={stil.wochenRaster}>
            {Array.from({ length: 7 }, (_, i) => plusTage(von, i)).map((tag) => {
              const dd = new Date(`${tag}T12:00:00`);
              return (
                <Pressable
                  key={tag}
                  onPress={() => { setSelectedDate(tag); setView('day'); }}
                  style={[stil.wochenTag, tag === heute && stil.heuteFeld]}
                >
                  <Text style={[stil.wochenTagName, tag === heute && { color: f.aufAkzent }]}>
                    {WOCHENTAGE[(dd.getDay() + 6) % 7]}
                  </Text>
                  <Text style={[stil.wochenTagZahl, tag === heute && { color: f.aufAkzent }]}>{dd.getDate()}</Text>
                  <View
                    style={[
                      stil.punkt,
                      { backgroundColor: tag === heute ? f.aufAkzent : f.signal },
                      !proTag.get(tag) && { opacity: 0 },
                    ]}
                  />
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

        {sichtbar.length === 0 ? (
          <View style={{ gap: abstand.m }}>
            <Text style={[schrift.normal, { color: f.gedaempft }]}>
              {view === 'day' ? 'An diesem Tag steht nichts an.' : 'In diesem Zeitraum steht nichts an.'}
            </Text>
            {naechste.length > 0 && (
              <View style={{ gap: abstand.s }}>
                <Text style={[schrift.titel, stil.tagKopf]}>Als Nächstes</Text>
                {naechste.map((e) => (
                  <Pressable
                    key={`n-${e.id}`}
                    onPress={() => { setSelectedDate(e.datum); setView('day'); }}
                    style={stil.karte}
                  >
                    <View style={stil.karteText}>
                      <Text style={[schrift.klein, { color: f.signalText }]}>{datumLesbar(e.datum)}</Text>
                      <Text style={[schrift.normal, { color: f.tinte }]}>{e.titel}</Text>
                    </View>
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        ) : view === 'day' ? (
          <View style={{ gap: abstand.s }}>{sichtbar.map(karte)}</View>
        ) : (
          nachTag.map(([tag, liste]) => {
            const dd = new Date(`${tag}T12:00:00`);
            return (
              <View key={tag} style={{ gap: abstand.s }}>
                <Pressable onPress={() => { setSelectedDate(tag); setView('day'); }}>
                  <Text style={[schrift.titel, stil.tagKopf, tag === heute && { color: f.signalText }]}>
                    {WOCHENTAGE_LANG[(dd.getDay() + 6) % 7]}, {dd.getDate()}. {MONATE[dd.getMonth()].slice(0, 3)}
                  </Text>
                </Pressable>
                {liste.map(karte)}
              </View>
            );
          })
        )}
      </ScrollView>

      {dialog}

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

function Pfeil({ farben: f, richtung }: { farben: Farben; richtung: 'links' | 'rechts' }) {
  const strich = {
    position: 'absolute' as const,
    width: 11,
    height: 2.5,
    borderRadius: 2,
    backgroundColor: f.gedaempft,
  };
  // Bei 'links' müssen die Striche andersherum kippen, sonst zeigt der Pfeil
  // nach rechts.
  const dreh = richtung === 'links' ? -1 : 1;
  return (
    <View style={{ width: 20, height: 20, alignItems: 'center', justifyContent: 'center' }}>
      <View style={[strich, { transform: [{ translateY: -3.5 }, { rotate: `${45 * dreh}deg` }] }]} />
      <View style={[strich, { transform: [{ translateY: 3.5 }, { rotate: `${-45 * dreh}deg` }] }]} />
    </View>
  );
}

function Kreuz({ farben: f }: { farben: Farben }) {
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
                <Text style={[stil.monatZahl, tag === heute && { color: f.aufAkzent }]}>
                  {Number(tag.slice(-2))}
                </Text>
                <View
                  style={[
                    stil.punkt,
                    { backgroundColor: tag === heute ? f.aufAkzent : f.signal },
                    !proTag.get(tag) && { opacity: 0 },
                  ]}
                />
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
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={stil.dialogHintergrund}>
        <View style={stil.dialog}>
          <View style={stil.griff} />
          <Text style={[schrift.titel, { color: f.tinte }]}>Neuer Termin</Text>

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

          <Text style={[schrift.klein, { color: f.gedaempft }]}>Wann</Text>
          <View style={stil.datumZeile}>
            <Pressable onPress={() => setDatum(plusTage(datum, -1))} style={stil.pfeilFeld}>
              <Pfeil farben={f} richtung="links" />
            </Pressable>
            <Text style={[schrift.zeitGross, { color: f.tinte }]}>{datumLesbar(datum)}</Text>
            <Pressable onPress={() => setDatum(plusTage(datum, 1))} style={stil.pfeilFeld}>
              <Pfeil farben={f} richtung="rechts" />
            </Pressable>
          </View>

          <Text style={[schrift.klein, { color: f.gedaempft }]}>Um wie viel Uhr</Text>
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

          <View style={stil.dialogKnoepfe}>
            <Pressable onPress={onAbbrechen} style={stil.abbrechen}>
              <Text style={[schrift.betont, { color: f.gedaempft }]}>Abbrechen</Text>
            </Pressable>
            <Pressable
              onPress={sichern}
              disabled={!titel.trim()}
              style={[stil.sichern, !titel.trim() && { opacity: 0.35 }]}
            >
              <Text style={[schrift.betont, { color: f.aufAkzent }]}>Sichern</Text>
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
    kopfBlock: { paddingHorizontal: abstand.l, paddingTop: abstand.s, gap: abstand.m, paddingBottom: abstand.m },
    kopfZeile: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
    kopfAktionen: { flexDirection: 'row', alignItems: 'center', gap: abstand.s },
    heuteKnopf: {
      backgroundColor: f.flaeche,
      borderRadius: radius.rund,
      paddingHorizontal: abstand.l,
      minHeight: 42,
      justifyContent: 'center',
    },
    plus: {
      width: 52, height: 52, borderRadius: radius.rund, backgroundColor: f.weg,
      alignItems: 'center', justifyContent: 'center',
    },
    plusStrich: { backgroundColor: f.aufAkzent, borderRadius: 2 },
    leiste: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    umschalter: { flexDirection: 'row', backgroundColor: f.flaeche, borderRadius: radius.rund, padding: 4 },
    umschaltKnopf: { paddingHorizontal: abstand.l, minHeight: 38, justifyContent: 'center', borderRadius: radius.rund },
    umschaltAktiv: { backgroundColor: f.weg },
    umschaltText: { fontFamily: 'Manrope_500Medium', fontSize: 15, color: f.gedaempft },
    umschaltTextAktiv: { color: f.aufAkzent, fontFamily: 'Manrope_600SemiBold' },
    pfeile: { flexDirection: 'row' },
    pfeilFeld: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
    inhalt: { paddingHorizontal: abstand.l, paddingBottom: abstand.xxl * 2, gap: abstand.l },
    karte: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: f.flaeche,
      borderRadius: radius.m,
      paddingVertical: abstand.m,
      paddingRight: abstand.s,
      paddingLeft: abstand.l,
      gap: abstand.s,
      overflow: 'hidden',
    },
    kante: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, backgroundColor: f.signal },
    karteText: { flex: 1, gap: 1 },
    kreisFeld: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', marginLeft: -abstand.s },
    kreis: { width: 24, height: 24, borderRadius: radius.rund, borderWidth: 2, borderColor: f.schwach },
    aktion: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
    tagKopf: { color: f.gedaempft, fontSize: 17 },
    wochenRaster: { flexDirection: 'row', justifyContent: 'space-between' },
    wochenTag: { alignItems: 'center', paddingVertical: abstand.s, width: 46, borderRadius: radius.m, gap: 2 },
    wochenTagName: { fontFamily: 'Manrope_500Medium', fontSize: 13, color: f.schwach },
    wochenTagZahl: { fontFamily: 'Manrope_700Bold', fontSize: 18, color: f.tinte },
    heuteFeld: { backgroundColor: f.weg },
    punkt: { width: 5, height: 5, borderRadius: radius.rund },
    monat: { gap: abstand.s },
    monatKopf: { flexDirection: 'row' },
    monatKopfText: { flex: 1, textAlign: 'center', fontFamily: 'Manrope_500Medium', fontSize: 13, color: f.schwach },
    monatRaster: { flexDirection: 'row', flexWrap: 'wrap' },
    monatFeld: { width: `${100 / 7}%`, aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
    monatTag: {
      width: 40, height: 40, borderRadius: radius.rund,
      alignItems: 'center', justifyContent: 'center', gap: 2,
    },
    monatZahl: { fontFamily: 'Manrope_500Medium', fontSize: 16, color: f.tinte },
    dialogHintergrund: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.55)' },
    dialog: {
      backgroundColor: f.papier, borderTopLeftRadius: radius.gross, borderTopRightRadius: radius.gross,
      padding: abstand.l, gap: abstand.m, paddingBottom: abstand.xxl,
    },
    griff: {
      width: 40, height: 4, borderRadius: 2, backgroundColor: f.linie,
      alignSelf: 'center', marginBottom: abstand.s,
    },
    feld: {
      backgroundColor: f.flaeche, borderRadius: radius.m,
      paddingHorizontal: abstand.l, paddingVertical: abstand.m,
      fontFamily: 'Manrope_400Regular', fontSize: 18, color: f.tinte, minHeight: 54,
    },
    datumZeile: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    chipZeile: { flexDirection: 'row', flexWrap: 'wrap', gap: abstand.s },
    chip: {
      borderRadius: radius.rund, backgroundColor: f.flaeche,
      paddingHorizontal: abstand.l, minHeight: 42, justifyContent: 'center',
    },
    chipAktiv: { backgroundColor: f.weg },
    chipText: { fontFamily: 'Manrope_500Medium', fontSize: 16, color: f.gedaempft },
    chipTextAktiv: { color: f.aufAkzent, fontFamily: 'Manrope_600SemiBold' },
    dialogKnoepfe: { flexDirection: 'row', gap: abstand.s, marginTop: abstand.s },
    abbrechen: {
      flex: 1, backgroundColor: f.flaeche, borderRadius: radius.m,
      minHeight: 54, alignItems: 'center', justifyContent: 'center',
    },
    sichern: {
      flex: 2, backgroundColor: f.weg, borderRadius: radius.m,
      minHeight: 54, alignItems: 'center', justifyContent: 'center',
    },
  });
