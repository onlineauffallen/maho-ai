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

export type Nachricht = { sender: 'user' | 'maho'; text: string; actions?: string[] };

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
}: Props) {
  const scrollRef = useRef<ScrollView>(null);

  return (
    <SafeAreaView style={styles.sicher} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flaeche}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
      >
        {titel ? <Text style={styles.titel}>{titel}</Text> : null}

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
            </View>
          ))}
          {busy && (
            <View style={styles.zeileLinks}>
              <View style={styles.blaseMaho}>
                <ActivityIndicator size="small" color={farben.gedaempft} />
              </View>
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
          <Pressable
            onPress={() => onSenden(eingabe)}
            disabled={busy || !eingabe.trim()}
            style={({ pressed }) => [
              styles.knopf,
              (busy || !eingabe.trim()) && { opacity: 0.4 },
              pressed && { opacity: 0.7 },
            ]}
          >
            <Text style={styles.knopfText}>Senden</Text>
          </Pressable>
        </View>

        {fussZeile}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  sicher: { flex: 1, backgroundColor: farben.grund },
  flaeche: { flex: 1, paddingHorizontal: abstand.l },
  titel: { ...schrift.titel, color: farben.text, paddingTop: abstand.s },
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
});
