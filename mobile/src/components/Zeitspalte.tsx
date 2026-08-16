import { StyleSheet, Text, View } from 'react-native';
import { abstand, radius, useFarben, schrift, ZEITSPALTE } from '@/lib/theme';

/**
 * Das Strukturelement der App: links steht wann, rechts steht was, dazwischen
 * läuft eine Linie durch.
 *
 * Das ist die Abfahrtstafel, übertragen. Ein Eintrag ohne Uhrzeit bekommt
 * einen Wochentag oder ein Wort statt einer Zeit, damit die Spalte nie leer
 * dasteht und die Linie nie abreißt.
 */
export function Zeile({
  zeit,
  zusatz,
  hervorgehoben,
  gedimmt,
  letzte,
  children,
}: {
  /** Was links steht. Eine Uhrzeit, ein Wochentag, ein Strich. */
  zeit: string;
  /** Kleine Zeile unter der Zeit, etwa das Ende oder "fällig". */
  zusatz?: string;
  /** Färbt Zeit und Punkt im Signalton, für alles was jetzt dran ist. */
  hervorgehoben?: boolean;
  /** Für Erledigtes. */
  gedimmt?: boolean;
  /** Bei der letzten Zeile hört die Linie unter dem Punkt auf. */
  letzte?: boolean;
  children: React.ReactNode;
}) {
  const f = useFarben();

  return (
    <View style={stil.zeile}>
      <View style={stil.spalte}>
        <Text
          style={[
            schrift.zeit,
            { color: hervorgehoben ? f.signal : gedimmt ? f.schwach : f.tinte },
          ]}
        >
          {zeit}
        </Text>
        {!!zusatz && <Text style={[schrift.winzig, { color: f.schwach }]}>{zusatz}</Text>}
      </View>

      {/* Linie und Punkt: der Punkt sitzt auf der Höhe der ersten Textzeile. */}
      <View style={stil.schiene}>
        <View
          style={[
            stil.punkt,
            {
              backgroundColor: hervorgehoben ? f.signal : gedimmt ? f.linie : f.weg,
              borderColor: f.papier,
            },
          ]}
        />
        {/* Auch bei der letzten Zeile läuft die Schiene kurz aus, statt hart
            aufzuhören. Ein Punkt ohne Linie wirkt wie ein Aufzählungszeichen,
            und genau das soll er nicht sein. */}
        <View style={[stil.linie, { backgroundColor: f.linie }, letzte && stil.linieAuslauf]} />
      </View>

      <View style={stil.inhalt}>{children}</View>
    </View>
  );
}

/** Die Jetzt-Marke: eine dünne Linie quer durch, mit der aktuellen Uhrzeit. */
export function JetztMarke({ zeit }: { zeit: string }) {
  const f = useFarben();
  return (
    <View style={stil.jetzt}>
      <Text style={[schrift.winzig, stil.jetztZeit, { color: f.signal }]}>{zeit}</Text>
      <View style={[stil.jetztPunkt, { backgroundColor: f.signal }]} />
      <View style={[stil.jetztLinie, { backgroundColor: f.signal }]} />
    </View>
  );
}

const stil = StyleSheet.create({
  zeile: { flexDirection: 'row', minHeight: 58 },
  spalte: { width: ZEITSPALTE, alignItems: 'flex-end', paddingRight: abstand.s, paddingTop: 1 },
  schiene: { width: 13, alignItems: 'center' },
  punkt: {
    width: 9,
    height: 9,
    borderRadius: radius.rund,
    marginTop: 7,
    borderWidth: 2,
  },
  linie: { flex: 1, width: 1.5, marginTop: 3, marginBottom: -10 },
  linieAuslauf: { flex: 0, height: 16, marginBottom: 0 },
  inhalt: { flex: 1, paddingLeft: abstand.m, paddingBottom: abstand.l, minWidth: 0 },
  jetzt: { flexDirection: 'row', alignItems: 'center', marginVertical: abstand.xs },
  jetztZeit: { width: ZEITSPALTE, textAlign: 'right', paddingRight: abstand.m },
  jetztPunkt: { width: 5, height: 5, borderRadius: radius.rund, marginLeft: 4 },
  jetztLinie: { flex: 1, height: 1, marginLeft: 4 },
});
