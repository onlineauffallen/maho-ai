import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useZustimmungStore } from '@/lib/zustimmungStore';
import { abstand, radius, schrift, useFarben, type Farben } from '@/lib/theme';

/**
 * Vor der ersten Nachricht. Steht vor dem Kennenlernen und ist der einzige
 * Weg dorthin: die Weiche im Layout schickt jeden hierher, der nicht
 * zugestimmt hat, auch bestehende Nutzer nach einer neuen Fassung.
 *
 * Der Text nennt, WAS übertragen wird und AN WEN. Aufgaben und Termine stehen
 * nicht immer dabei: sie gehen nur mit, wenn Maho sie nachschlägt, weil du
 * danach fragst oder etwas ändern willst.
 */
export default function ZustimmungScreen() {
  const f = useFarben();
  const stil = stile(f);
  const zustimmen = useZustimmungStore((s) => s.zustimmen);

  return (
    <SafeAreaView style={stil.sicher}>
      <ScrollView contentContainerStyle={stil.inhalt} showsVerticalScrollIndicator={false}>
        <Text style={[schrift.gross, { color: f.tinte }]}>Bevor wir reden</Text>

        <Text style={[schrift.normal, { color: f.tinte }]}>
          Maho ist eine KI. Antworten können Fehler enthalten, prüf Wichtiges nach.
        </Text>

        <View style={stil.block}>
          <Text style={stil.abschnitt}>Was übertragen wird</Text>
          <View style={stil.karte}>
            <Text style={[schrift.normal, { color: f.tinte }]}>
              Zum Antworten schickt die App an OpenAI (USA): deine Nachrichten, den letzten Teil des
              Gesprächs, dein Profil und das, was Maho sich über dich gemerkt hat. Aufgaben und Termine
              nur dann, wenn Maho sie nachschlägt, weil du danach fragst oder etwas ändern willst.
            </Text>
          </View>
        </View>

        <View style={stil.block}>
          <Text style={stil.abschnitt}>Was nicht</Text>
          <View style={stil.karte}>
            <Text style={[schrift.normal, { color: f.tinte }]}>
              Alles andere, was die App speichert, liegt nur auf deinem Gerät und nicht bei uns.
            </Text>
          </View>
        </View>

        <Text style={[schrift.klein, { color: f.gedaempft }]}>
          Ohne diese Zustimmung kann Maho nicht antworten. Du kannst sie jederzeit unter
          Einstellungen widerrufen, dann fragt die App beim nächsten Start wieder.
        </Text>

        <Pressable
          onPress={zustimmen}
          style={({ pressed }) => [stil.knopf, pressed && { opacity: 0.8 }]}
          accessibilityRole="button"
        >
          <Text style={[schrift.betont, { color: f.aufAkzent }]}>Einverstanden</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const stile = (f: Farben) =>
  StyleSheet.create({
    sicher: { flex: 1, backgroundColor: f.papier },
    inhalt: { padding: abstand.l, gap: abstand.xl, paddingBottom: abstand.xxl },
    block: { gap: abstand.s },
    abschnitt: { ...schrift.titel, color: f.gedaempft, fontSize: 17 },
    karte: {
      backgroundColor: f.flaeche,
      borderRadius: radius.m,
      paddingHorizontal: abstand.l,
      paddingVertical: abstand.m,
    },
    knopf: {
      backgroundColor: f.weg,
      borderRadius: radius.gross,
      minHeight: 58,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: abstand.s,
    },
  });
