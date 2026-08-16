import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { abstand, radius, schrift, useFarben, type Farben } from '@/lib/theme';

/**
 * Rückfrage vor etwas Unumkehrbarem.
 *
 * Ersetzt Alert.alert, das es nur nativ gibt: in der Web-Ausgabe passierte beim
 * Druck auf Löschen schlicht nichts. Nebenbei sieht der eigene Dialog auf
 * beiden Seiten gleich aus und trägt die Gestaltung der App mit.
 */
export type NachfrageDaten = {
  titel: string;
  text?: string;
  knopf: string;
  onBestaetigen: () => void;
};

export function useNachfrage() {
  const [daten, setDaten] = useState<NachfrageDaten>();
  return {
    frage: setDaten,
    dialog: <Nachfrage daten={daten} onSchliessen={() => setDaten(undefined)} />,
  };
}

function Nachfrage({ daten, onSchliessen }: { daten?: NachfrageDaten; onSchliessen: () => void }) {
  const f = useFarben();
  const stil = stile(f);

  return (
    <Modal visible={!!daten} transparent animationType="fade" onRequestClose={onSchliessen}>
      <Pressable style={stil.hintergrund} onPress={onSchliessen}>
        <Pressable style={stil.kasten} onPress={(e) => e.stopPropagation()}>
          <Text style={[schrift.titel, { color: f.tinte }]}>{daten?.titel}</Text>
          {!!daten?.text && <Text style={[schrift.normal, { color: f.gedaempft }]}>{daten.text}</Text>}

          <View style={stil.knoepfe}>
            <Pressable onPress={onSchliessen} style={stil.abbrechen}>
              <Text style={[schrift.betont, { color: f.tinte }]}>Abbrechen</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                daten?.onBestaetigen();
                onSchliessen();
              }}
              style={stil.bestaetigen}
            >
              <Text style={[schrift.betont, { color: '#FFFFFF' }]}>{daten?.knopf}</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const stile = (f: Farben) =>
  StyleSheet.create({
    hintergrund: {
      flex: 1,
      backgroundColor: 'rgba(16,49,78,0.45)',
      alignItems: 'center',
      justifyContent: 'center',
      padding: abstand.xl,
    },
    kasten: {
      width: '100%',
      maxWidth: 340,
      backgroundColor: f.papier,
      borderRadius: radius.gross,
      padding: abstand.l,
      gap: abstand.s,
    },
    knoepfe: { flexDirection: 'row', gap: abstand.s, marginTop: abstand.m },
    abbrechen: {
      flex: 1,
      borderWidth: 1,
      borderColor: f.linie,
      borderRadius: radius.s,
      minHeight: 48,
      alignItems: 'center',
      justifyContent: 'center',
    },
    bestaetigen: {
      flex: 1,
      backgroundColor: f.warnung,
      borderRadius: radius.s,
      minHeight: 48,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
