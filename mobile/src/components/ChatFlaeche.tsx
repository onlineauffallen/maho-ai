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
import { markdownStuecke } from '@/lib/markdown';

export type Nachricht = {
  /** Fehlt im Kennenlernen, dort steht die Liste nur im Arbeitsspeicher. */
  id?: string;
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
 * Maho antwortet in ruhigen Karten, der Nutzer schickt sichtbar etwas ab: seine
 * Zeilen sitzen als Messingfläche rechts. Damit ist auf einen Blick klar, wer
 * gerade spricht, ohne Namen und ohne Zeitstempel.
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

        <Text style={[schrift.klein, { color: f.gedaempft, paddingBottom: abstand.xs }]}>
          Maho ist eine KI. Fehler sind möglich.
        </Text>

        <ScrollView
          ref={scrollRef}
          style={stil.verlauf}
          contentContainerStyle={stil.verlaufInhalt}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
        >
          {messages.map((m, i) =>
            m.sender === 'user' ? (
              <View key={m.id ?? i} style={stil.zeileRechts}>
                <View style={stil.blaseIch}>
                  <Text style={[schrift.normal, { color: f.aufDunkel }]}>{m.text}</Text>
                </View>
              </View>
            ) : (
              <View key={m.id ?? i} style={stil.mahoBlock}>
                <View style={stil.mahoInhalt}>
                  <Text style={[schrift.normal, { color: f.tinte }]}>
                    {markdownStuecke(m.text).map((s, j) =>
                      s.fett ? (
                        <Text key={j} style={{ fontFamily: 'Manrope_700Bold' }}>
                          {s.text}
                        </Text>
                      ) : (
                        s.text
                      )
                    )}
                  </Text>
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
              <View style={stil.mahoInhalt}>
                <ActivityIndicator size="small" color={f.signal} />
              </View>
            </View>
          )}

          {!!fehler && (
            <View style={stil.fehlerFeld}>
              <Text style={[schrift.klein, { color: f.warnung }]}>{fehler}</Text>
              {!!onWiederholen && (
                <Pressable onPress={onWiederholen} style={stil.fehlerKnopf}>
                  <Text style={[schrift.klein, { color: f.warnung, fontFamily: 'Manrope_500Medium' }]}>
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
 * Ein Vorschlag hebt sich ab: eigene Fläche, Messingkante links, zwei Knöpfe.
 * Annehmen kostet keinen weiteren Aufruf beim Anbieter.
 */
function VorschlagsKarte({
  vorschlag, farben: f, onAnnehmen, onAblehnen,
}: { vorschlag: Vorschlag; farben: Farben; onAnnehmen: () => void; onAblehnen: () => void }) {
  const stil = stile(f);
  return (
    <View style={stil.karte}>
      <View style={stil.karteKante} />
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
      backgroundColor: f.weg,
      paddingHorizontal: abstand.l,
      paddingVertical: abstand.m,
      borderRadius: radius.gross,
      borderBottomRightRadius: radius.s,
      maxWidth: '86%',
    },
    mahoBlock: { flexDirection: 'row', maxWidth: '92%' },
    mahoInhalt: {
      flex: 1,
      gap: abstand.s,
      backgroundColor: f.flaeche,
      borderRadius: radius.gross,
      borderBottomLeftRadius: radius.s,
      paddingHorizontal: abstand.l,
      paddingVertical: abstand.m,
    },
    aktion: {
      alignSelf: 'flex-start',
      backgroundColor: f.gutSchwach,
      paddingHorizontal: abstand.m,
      paddingVertical: abstand.xs + 2,
      borderRadius: radius.rund,
    },
    karte: {
      flexDirection: 'row',
      backgroundColor: f.flaecheHoch,
      borderRadius: radius.m,
      overflow: 'hidden',
      marginTop: abstand.xs,
    },
    karteKante: { width: 4, backgroundColor: f.signal },
    karteInhalt: { flex: 1, padding: abstand.l, gap: 3 },
    karteKnoepfe: { flexDirection: 'row', gap: abstand.s, marginTop: abstand.s },
    karteJa: {
      backgroundColor: f.weg,
      borderRadius: radius.rund,
      paddingHorizontal: abstand.xl,
      minHeight: 46,
      justifyContent: 'center',
    },
    karteNein: {
      backgroundColor: f.flaeche,
      borderRadius: radius.rund,
      paddingHorizontal: abstand.l,
      minHeight: 46,
      justifyContent: 'center',
    },
    fehlerFeld: {
      backgroundColor: f.flaeche,
      padding: abstand.l,
      gap: abstand.s,
      alignItems: 'flex-start',
      borderRadius: radius.m,
    },
    fehlerKnopf: {
      backgroundColor: f.flaecheHoch,
      borderRadius: radius.rund,
      paddingHorizontal: abstand.l,
      minHeight: 44,
      justifyContent: 'center',
    },
    chipZeile: { flexDirection: 'row', flexWrap: 'wrap', gap: abstand.s, paddingBottom: abstand.s },
    chip: {
      backgroundColor: f.flaeche,
      borderRadius: radius.rund,
      paddingHorizontal: abstand.l,
      minHeight: 44,
      justifyContent: 'center',
    },
    chipText: { fontFamily: 'Manrope_500Medium', fontSize: 16, color: f.signalText },
    eingabeZeile: { flexDirection: 'row', gap: abstand.s, alignItems: 'flex-end', paddingBottom: abstand.s },
    feld: {
      flex: 1,
      backgroundColor: f.flaeche,
      borderRadius: radius.gross,
      paddingHorizontal: abstand.m,
      paddingVertical: abstand.m,
      fontFamily: 'Manrope_400Regular',
      fontSize: 17,
      color: f.tinte,
      maxHeight: 130,
      minHeight: 50,
    },
    knopf: {
      backgroundColor: f.weg,
      borderRadius: radius.gross,
      paddingHorizontal: abstand.l,
      minHeight: 54,
      justifyContent: 'center',
    },
    knopfText: { color: f.aufAkzent, fontFamily: 'Manrope_600SemiBold', fontSize: 17 },
  });
