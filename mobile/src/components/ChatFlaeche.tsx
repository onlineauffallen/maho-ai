import { useMemo, useRef } from 'react';
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
import { abstand, radius, schrift, useFarben, type Farben } from '@/lib/theme';
import { vorschlagBeschriftung, type Vorschlag } from '@/lib/vorschlaege';

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
  fehler?: string;
  onWiederholen?: () => void;
  onAbbrechen?: () => void;
  kopfAktion?: React.ReactNode;
  onVorschlagAnnehmen?: (v: Vorschlag) => void;
  onVorschlagAblehnen?: (v: Vorschlag) => void;
};

/**
 * Das Gespräch.
 *
 * Maho bekommt bewusst keine Sprechblase, sondern steht als Text auf dem
 * Papier, mit einer schmalen Linie links. Das nimmt der Oberfläche das
 * Chatbot-Hafte: es liest sich wie eine Auskunft, nicht wie ein Messenger.
 * Der Nutzer dagegen schickt sichtbar etwas ab, seine Zeilen sitzen als
 * dunkler Block rechts.
 */
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
  const f = useFarben();
  const stil = useMemo(() => stile(f), [f]);
  const scrollRef = useRef<ScrollView>(null);

  return (
    <SafeAreaView style={stil.sicher} edges={['top']}>
      <KeyboardAvoidingView
        style={stil.flaeche}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
      >
        {(titel || kopfAktion) && (
          <View style={stil.kopfZeile}>
            <Text style={[schrift.gross, { color: f.tinte }]}>{titel ?? ''}</Text>
            {kopfAktion}
          </View>
        )}

        <ScrollView
          ref={scrollRef}
          style={stil.verlauf}
          contentContainerStyle={stil.verlaufInhalt}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
        >
          {messages.map((m, i) =>
            m.sender === 'user' ? (
              <View key={i} style={stil.zeileRechts}>
                <View style={stil.blaseIch}>
                  <Text style={[schrift.normal, { color: f.aufDunkel }]}>{m.text}</Text>
                </View>
              </View>
            ) : (
              <View key={i} style={stil.mahoBlock}>
                <View style={stil.mahoLinie} />
                <View style={stil.mahoInhalt}>
                  <Text style={[schrift.normal, { color: f.tinte }]}>{m.text}</Text>
                  {m.actions?.map((a, j) => (
                    <View key={j} style={stil.aktion}>
                      <Text style={[schrift.klein, { color: f.gut }]}>{a}</Text>
                    </View>
                  ))}
                  {m.vorschlaege?.map((v) => (
                    <VorschlagsKarte
                      key={v.id}
                      vorschlag={v}
                      farben={f}
                      onAnnehmen={() => onVorschlagAnnehmen?.(v)}
                      onAblehnen={() => onVorschlagAblehnen?.(v)}
                    />
                  ))}
                </View>
              </View>
            )
          )}

          {busy && (
            <View style={stil.mahoBlock}>
              <View style={stil.mahoLinie} />
              <View style={stil.mahoInhalt}>
                <ActivityIndicator size="small" color={f.schwach} />
              </View>
            </View>
          )}

          {!!fehler && (
            <View style={stil.fehlerFeld}>
              <Text style={[schrift.klein, { color: f.warnung }]}>{fehler}</Text>
              {!!onWiederholen && (
                <Pressable onPress={onWiederholen} style={stil.fehlerKnopf}>
                  <Text style={[schrift.klein, { color: f.warnung, fontFamily: 'Barlow_500Medium' }]}>
                    Nochmal versuchen
                  </Text>
                </Pressable>
              )}
            </View>
          )}
        </ScrollView>

        {vorschlaege.length > 0 && (
          <View style={stil.chipZeile}>
            {vorschlaege.map((v) => (
              <Pressable key={v} onPress={() => onSenden(v)} disabled={busy} style={stil.chip}>
                <Text style={stil.chipText}>{v}</Text>
              </Pressable>
            ))}
          </View>
        )}

        <View style={stil.eingabeZeile}>
          <TextInput
            style={stil.feld}
            value={eingabe}
            onChangeText={setEingabe}
            placeholder={platzhalter}
            placeholderTextColor={f.schwach}
            editable={!busy}
            onSubmitEditing={() => onSenden(eingabe)}
            returnKeyType="send"
            multiline
          />
          {busy && onAbbrechen ? (
            <Pressable onPress={onAbbrechen} style={[stil.knopf, { backgroundColor: f.gedaempft }]}>
              <Text style={stil.knopfText}>Stopp</Text>
            </Pressable>
          ) : (
            <Pressable
              onPress={() => onSenden(eingabe)}
              disabled={busy || !eingabe.trim()}
              style={[stil.knopf, (busy || !eingabe.trim()) && { opacity: 0.35 }]}
              accessibilityRole="button"
              accessibilityLabel="Senden"
            >
              <Text style={stil.knopfText}>Senden</Text>
            </Pressable>
          )}
        </View>

        {fussZeile}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/**
 * Ein Vorschlag ist ein Aushang, kein Dialogfeld: Signalstreifen links, klare
 * Kante, zwei Knöpfe. Annehmen kostet keinen weiteren Aufruf beim Anbieter.
 */
function VorschlagsKarte({
  vorschlag, farben: f, onAnnehmen, onAblehnen,
}: { vorschlag: Vorschlag; farben: Farben; onAnnehmen: () => void; onAblehnen: () => void }) {
  const stil = stile(f);
  return (
    <View style={stil.karte}>
      <View style={stil.karteInhalt}>
        {!!vorschlag.anlass && (
          <Text style={[schrift.winzig, { color: f.gedaempft }]}>{vorschlag.anlass}</Text>
        )}
        <Text style={[schrift.betont, { color: f.tinte }]}>{vorschlag.titel}</Text>
        <Text style={[schrift.klein, { color: f.gedaempft }]}>{vorschlagBeschriftung(vorschlag)}</Text>
        <View style={stil.karteKnoepfe}>
          <Pressable onPress={onAnnehmen} style={stil.karteJa} accessibilityLabel={`${vorschlag.titel} übernehmen`}>
            <Text style={[schrift.betont, { color: f.aufAkzent }]}>Passt</Text>
          </Pressable>
          <Pressable onPress={onAblehnen} style={stil.karteNein}>
            <Text style={[schrift.klein, { color: f.gedaempft }]}>Nein danke</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const stile = (f: Farben) =>
  StyleSheet.create({
    sicher: { flex: 1, backgroundColor: f.papier },
    flaeche: { flex: 1, paddingHorizontal: abstand.l },
    kopfZeile: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingTop: abstand.s,
      paddingBottom: abstand.s,
    },
    verlauf: { flex: 1 },
    verlaufInhalt: { paddingVertical: abstand.m, gap: abstand.l },
    zeileRechts: { alignItems: 'flex-end' },
    blaseIch: {
      backgroundColor: f.tinte,
      paddingHorizontal: abstand.m,
      paddingVertical: abstand.s,
      borderRadius: radius.m,
      borderTopRightRadius: radius.s,
      maxWidth: '86%',
    },
    mahoBlock: { flexDirection: 'row', gap: abstand.m, maxWidth: '96%' },
    mahoLinie: { width: 2, backgroundColor: f.signal, borderRadius: 1 },
    mahoInhalt: { flex: 1, gap: abstand.s },
    aktion: {
      alignSelf: 'flex-start',
      borderLeftWidth: 2,
      borderLeftColor: f.gut,
      backgroundColor: f.gutSchwach,
      paddingHorizontal: abstand.s,
      paddingVertical: 3,
      borderRadius: radius.s,
    },
    karte: {
      backgroundColor: f.flaeche,
      borderWidth: 1,
      borderColor: f.linie,
      borderRadius: radius.m,
      overflow: 'hidden',
      marginTop: abstand.xs,
    },
    karteInhalt: { flex: 1, padding: abstand.m, gap: 2 },
    karteKnoepfe: { flexDirection: 'row', gap: abstand.s, marginTop: abstand.s },
    karteJa: {
      backgroundColor: f.weg,
      borderRadius: radius.s,
      paddingHorizontal: abstand.l,
      minHeight: 42,
      justifyContent: 'center',
    },
    karteNein: {
      borderWidth: 1,
      borderColor: f.linie,
      borderRadius: radius.s,
      paddingHorizontal: abstand.m,
      minHeight: 42,
      justifyContent: 'center',
    },
    fehlerFeld: {
      borderLeftWidth: 3,
      borderLeftColor: f.warnung,
      backgroundColor: f.flaeche,
      padding: abstand.m,
      gap: abstand.s,
      alignItems: 'flex-start',
      borderRadius: radius.s,
    },
    fehlerKnopf: {
      borderWidth: 1,
      borderColor: f.warnung,
      borderRadius: radius.s,
      paddingHorizontal: abstand.m,
      minHeight: 40,
      justifyContent: 'center',
    },
    chipZeile: { flexDirection: 'row', flexWrap: 'wrap', gap: abstand.s, paddingBottom: abstand.s },
    chip: {
      borderWidth: 1,
      borderColor: f.linie,
      backgroundColor: f.flaeche,
      borderRadius: radius.s,
      paddingHorizontal: abstand.m,
      minHeight: 40,
      justifyContent: 'center',
    },
    chipText: { fontFamily: 'BarlowSemiCondensed_500Medium', fontSize: 16, color: f.weg },
    eingabeZeile: { flexDirection: 'row', gap: abstand.s, alignItems: 'flex-end', paddingBottom: abstand.s },
    feld: {
      flex: 1,
      borderWidth: 1,
      borderColor: f.linie,
      backgroundColor: f.flaeche,
      borderRadius: radius.s,
      paddingHorizontal: abstand.m,
      paddingVertical: abstand.m,
      fontFamily: 'Barlow_400Regular',
      fontSize: 17,
      color: f.tinte,
      maxHeight: 130,
      minHeight: 50,
    },
    knopf: {
      backgroundColor: f.weg,
      borderRadius: radius.s,
      paddingHorizontal: abstand.l,
      minHeight: 50,
      justifyContent: 'center',
    },
    knopfText: { color: f.aufAkzent, fontFamily: 'BarlowSemiCondensed_600SemiBold', fontSize: 17, letterSpacing: 0.3 },
  });
