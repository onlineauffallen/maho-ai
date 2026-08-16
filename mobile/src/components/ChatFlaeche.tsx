import { useRef } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { abstand, farben, radius, schrift } from '@/lib/theme';
import {
  vorschlagBeschriftung,
  VORSCHLAG_ZEICHEN,
  type Vorschlag,
} from '@/lib/vorschlaege';

export type Nachricht = {
  sender: 'user' | 'maho';
  text: string;
  actions?: string[];
  vorschlaege?: Vorschlag[];
};

type Props = {
  titel?: string;
  messages: Nachricht[];
  busy: boolean;
  eingabe: string;
  setEingabe: (t: string) => void;
  onSenden: (text: string) => void;
  vorschlaege?: string[];
  platzhalter?: string;
  fussZeile?: React.ReactNode;
  /**
   * Fehler stehen bewusst neben dem Verlauf und nicht darin. Vorher landeten
   * sie als Assistentennachricht im gespeicherten Verlauf und gingen beim
   * nächsten Aufruf als Kontext ans Modell zurück.
   */
  fehler?: string;
  onWiederholen?: () => void;
  onAbbrechen?: () => void;
  /** Rechts in der Kopfzeile, etwa der Weg zu den Einstellungen. */
  kopfAktion?: React.ReactNode;
  onVorschlagAnnehmen?: (v: Vorschlag) => void;
  onVorschlagAblehnen?: (v: Vorschlag) => void;
};

/** Gemeinsame Chatoberfläche für das Kennenlernen und den Alltag. */
export function ChatFlaeche({
  titel,
  messages,
  busy,
  eingabe,
  setEingabe,
  onSenden,
  vorschlaege = [],
  platzhalter = 'Schreib Maho…',
  fussZeile,
  fehler,
  onWiederholen,
  onAbbrechen,
  kopfAktion,
  onVorschlagAnnehmen,
  onVorschlagAblehnen,
}: Props) {
  const scrollRef = useRef<ScrollView>(null);

  return (
    <SafeAreaView style={styles.sicher} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flaeche}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
      >
        {(titel || kopfAktion) && (
          <View style={styles.kopfZeile}>
            <Text style={styles.titel}>{titel ?? ''}</Text>
            {kopfAktion}
          </View>
        )}

        <ScrollView
          ref={scrollRef}
          style={styles.verlauf}
          contentContainerStyle={{ paddingVertical: abstand.m, gap: abstand.s }}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
        >
          {messages.map((m, i) => (
            <View key={i} style={m.sender === 'user' ? styles.zeileRechts : styles.zeileLinks}>
              <View style={m.sender === 'user' ? styles.blaseIch : styles.blaseMaho}>
                <Text style={m.sender === 'user' ? styles.textIch : styles.textMaho}>{m.text}</Text>
              </View>
              {m.actions?.map((a, j) => (
                <View key={j} style={styles.aktion}>
                  <Text style={styles.aktionText}>{a}</Text>
                </View>
              ))}
              {m.vorschlaege?.map((v) => (
                <VorschlagsKarte
                  key={v.id}
                  vorschlag={v}
                  onAnnehmen={() => onVorschlagAnnehmen?.(v)}
                  onAblehnen={() => onVorschlagAblehnen?.(v)}
                />
              ))}
            </View>
          ))}
          {busy && (
            <View style={styles.zeileLinks}>
              <View style={styles.blaseMaho}>
                <ActivityIndicator size="small" color={farben.gedaempft} />
              </View>
            </View>
          )}

          {!!fehler && (
            <View style={styles.fehlerFeld}>
              <Text style={styles.fehlerText}>{fehler}</Text>
              {!!onWiederholen && (
                <Pressable onPress={onWiederholen} style={styles.fehlerKnopf}>
                  <Text style={styles.fehlerKnopfText}>Nochmal versuchen</Text>
                </Pressable>
              )}
            </View>
          )}
        </ScrollView>

        {vorschlaege.length > 0 && (
          <View style={styles.vorschlaege}>
            {vorschlaege.map((v) => (
              <Pressable
                key={v}
                onPress={() => onSenden(v)}
                disabled={busy}
                style={({ pressed }) => [styles.chip, pressed && { opacity: 0.6 }]}
              >
                <Text style={styles.chipText}>{v}</Text>
              </Pressable>
            ))}
          </View>
        )}

        <View style={styles.eingabeZeile}>
          <TextInput
            style={styles.feld}
            value={eingabe}
            onChangeText={setEingabe}
            placeholder={platzhalter}
            placeholderTextColor={farben.schwach}
            editable={!busy}
            onSubmitEditing={() => onSenden(eingabe)}
            returnKeyType="send"
            multiline
          />
          {busy && onAbbrechen ? (
            <Pressable
              onPress={onAbbrechen}
              style={({ pressed }) => [styles.knopf, styles.knopfStopp, pressed && { opacity: 0.7 }]}
              accessibilityRole="button"
              accessibilityLabel="Antwort abbrechen"
            >
              <Text style={styles.knopfText}>Stopp</Text>
            </Pressable>
          ) : (
            <Pressable
              onPress={() => onSenden(eingabe)}
              disabled={busy || !eingabe.trim()}
              style={({ pressed }) => [
                styles.knopf,
                (busy || !eingabe.trim()) && { opacity: 0.4 },
                pressed && { opacity: 0.7 },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Senden"
            >
              <Text style={styles.knopfText}>Senden</Text>
            </Pressable>
          )}
        </View>

        {fussZeile}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/**
 * Ein Vorschlag ist eine Karte mit Knöpfen, keine Rückfrage im Fließtext.
 * Annehmen ist ein Tipp und kostet keinen weiteren Aufruf beim Anbieter, weil
 * die Aktion lokal ausgeführt wird. Ablehnen ist auch ein Tipp, statt "nein
 * danke" tippen zu müssen.
 */
function VorschlagsKarte({
  vorschlag,
  onAnnehmen,
  onAblehnen,
}: {
  vorschlag: Vorschlag;
  onAnnehmen: () => void;
  onAblehnen: () => void;
}) {
  return (
    <View style={styles.karte}>
      {!!vorschlag.anlass && <Text style={styles.karteAnlass}>{vorschlag.anlass}</Text>}
      <View style={styles.karteKopf}>
        <Text style={styles.karteZeichen}>{VORSCHLAG_ZEICHEN[vorschlag.art]}</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.karteTitel}>{vorschlag.titel}</Text>
          <Text style={styles.karteZeile}>{vorschlagBeschriftung(vorschlag)}</Text>
        </View>
      </View>
      <View style={styles.karteKnoepfe}>
        <Pressable
          onPress={onAnnehmen}
          style={({ pressed }) => [styles.karteJa, pressed && { opacity: 0.7 }]}
          accessibilityRole="button"
          accessibilityLabel={`${vorschlag.titel}: ${vorschlagBeschriftung(vorschlag)}, annehmen`}
        >
          <Text style={styles.karteJaText}>Passt</Text>
        </Pressable>
        <Pressable
          onPress={onAblehnen}
          style={({ pressed }) => [styles.karteNein, pressed && { opacity: 0.7 }]}
          accessibilityRole="button"
          accessibilityLabel="Vorschlag ablehnen"
        >
          <Text style={styles.karteNeinText}>Nein danke</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sicher: { flex: 1, backgroundColor: farben.grund },
  flaeche: { flex: 1, paddingHorizontal: abstand.l },
  kopfZeile: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: abstand.s,
  },
  titel: { ...schrift.titel, color: farben.text },
  verlauf: { flex: 1 },
  zeileLinks: { alignItems: 'flex-start' },
  zeileRechts: { alignItems: 'flex-end' },
  blaseIch: {
    backgroundColor: farben.akzent,
    paddingHorizontal: abstand.m,
    paddingVertical: abstand.s,
    borderRadius: radius.gross,
    borderBottomRightRadius: radius.s,
    maxWidth: '85%',
  },
  blaseMaho: {
    backgroundColor: farben.flaeche,
    paddingHorizontal: abstand.m,
    paddingVertical: abstand.s,
    borderRadius: radius.gross,
    borderBottomLeftRadius: radius.s,
    maxWidth: '85%',
  },
  textIch: { color: '#fff', fontSize: 16 },
  textMaho: { color: farben.text, fontSize: 16 },
  aktion: {
    marginTop: abstand.xs,
    backgroundColor: farben.gutSchwach,
    borderColor: '#bbf7d0',
    borderWidth: 1,
    borderRadius: radius.rund,
    paddingHorizontal: abstand.s,
    paddingVertical: 2,
  },
  aktionText: { color: farben.gut, fontSize: 12 },
  karte: {
    marginTop: abstand.s,
    borderWidth: 1,
    borderColor: '#ddd6fe',
    backgroundColor: farben.akzentSchwach,
    borderRadius: radius.m,
    padding: abstand.m,
    gap: abstand.s,
    maxWidth: '92%',
  },
  karteAnlass: { fontSize: 12, color: farben.gedaempft },
  karteKopf: { flexDirection: 'row', gap: abstand.s, alignItems: 'flex-start' },
  karteZeichen: { fontSize: 16 },
  karteTitel: { fontSize: 15, fontWeight: '600', color: farben.text },
  karteZeile: { fontSize: 13, color: farben.gedaempft, marginTop: 2 },
  karteKnoepfe: { flexDirection: 'row', gap: abstand.s },
  karteJa: {
    backgroundColor: farben.akzent,
    borderRadius: radius.s,
    paddingHorizontal: abstand.l,
    paddingVertical: abstand.s,
    minHeight: 40,
    justifyContent: 'center',
  },
  karteJaText: { color: '#fff', fontWeight: '600' },
  karteNein: {
    borderWidth: 1,
    borderColor: farben.rand,
    backgroundColor: farben.grund,
    borderRadius: radius.s,
    paddingHorizontal: abstand.m,
    paddingVertical: abstand.s,
    minHeight: 40,
    justifyContent: 'center',
  },
  karteNeinText: { color: farben.gedaempft },
  vorschlaege: { flexDirection: 'row', flexWrap: 'wrap', gap: abstand.s, paddingBottom: abstand.s },
  chip: {
    borderWidth: 1,
    borderColor: '#ddd6fe',
    backgroundColor: farben.akzentSchwach,
    borderRadius: radius.rund,
    paddingHorizontal: abstand.m,
    paddingVertical: abstand.s,
  },
  chipText: { color: farben.akzent, fontSize: 14 },
  eingabeZeile: { flexDirection: 'row', gap: abstand.s, alignItems: 'flex-end', paddingBottom: abstand.s },
  feld: {
    flex: 1,
    borderWidth: 1,
    borderColor: farben.rand,
    borderRadius: radius.m,
    paddingHorizontal: abstand.m,
    paddingVertical: abstand.s,
    fontSize: 16,
    color: farben.text,
    maxHeight: 120,
  },
  knopf: {
    backgroundColor: farben.akzent,
    borderRadius: radius.m,
    paddingHorizontal: abstand.l,
    paddingVertical: abstand.m,
  },
  knopfText: { color: '#fff', fontWeight: '600' },
  knopfStopp: { backgroundColor: farben.gedaempft },
  fehlerFeld: {
    borderWidth: 1,
    borderColor: '#fecaca',
    backgroundColor: '#fef2f2',
    borderRadius: radius.m,
    padding: abstand.m,
    gap: abstand.s,
    alignItems: 'flex-start',
  },
  fehlerText: { color: farben.warnung, fontSize: 14 },
  fehlerKnopf: {
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: radius.s,
    paddingHorizontal: abstand.m,
    paddingVertical: abstand.s,
  },
  fehlerKnopfText: { color: farben.warnung, fontWeight: '600', fontSize: 14 },
});
