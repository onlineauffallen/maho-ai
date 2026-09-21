import { useEffect } from 'react';
import { ActivityIndicator, AppState, View } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { Fraunces_600SemiBold, Fraunces_700Bold } from '@expo-google-fonts/fraunces';
import {
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
} from '@expo-google-fonts/manrope';
import { useProfileStore } from '@/lib/profileStore';
import { useCalendarStore } from '@/lib/calendarStore';
import { useFollowupStore } from '@/lib/followupStore';
import { istZugestimmt, useZustimmungStore } from '@/lib/zustimmungStore';
import { erinnerungenAktualisieren } from '@/lib/benachrichtigungen';
import { useHydrated } from '@/lib/useHydrated';
import { useFarben } from '@/lib/theme';

export default function RootLayout() {
  const hydrated = useHydrated();
  const f = useFarben();

  const onboardingDone = useProfileStore((s) => s.onboardingDone);
  const zugestimmt = useZustimmungStore(istZugestimmt);
  const segmente = useSegments();
  const router = useRouter();
  const events = useCalendarStore((s) => s.events);
  const wiedervorlagen = useFollowupStore((s) => s.wiedervorlagen);

  const [schriftenGeladen] = useFonts({
    Fraunces_600SemiBold,
    Fraunces_700Bold,
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
  });

  // Erinnerungen bei jeder Änderung neu planen. Neu planen statt nachpflegen,
  // sonst bleiben Erinnerungen zu gelöschten Terminen stehen.
  useEffect(() => {
    if (!hydrated) return;
    void erinnerungenAktualisieren();
  }, [hydrated, events, wiedervorlagen]);

  // Und beim Zurückkommen in den Vordergrund: eine App läuft tagelang, ohne
  // neu geladen zu werden, und "heute" ist dann ein anderer Tag.
  useEffect(() => {
    const ab = AppState.addEventListener('change', (zustand) => {
      if (zustand === 'active') void erinnerungenAktualisieren();
    });
    return () => ab.remove();
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    // Die Zustimmung geht allem vor: vorher darf nichts an den KI-Anbieter gehen.
    const imZustimmen = segmente[0] === 'zustimmung';
    if (!zugestimmt) {
      if (!imZustimmen) router.replace('/zustimmung');
      return;
    }
    const imOnboarding = segmente[0] === 'onboarding';
    if (imZustimmen) router.replace(onboardingDone ? '/' : '/onboarding');
    else if (!onboardingDone && !imOnboarding) router.replace('/onboarding');
    else if (onboardingDone && imOnboarding) router.replace('/');
  }, [hydrated, zugestimmt, onboardingDone, segmente, router]);

  // Solange Stores und Schriften nicht da sind, wissen wir nicht, wohin, und
  // die Typografie würde einmal umspringen. Lieber kurz nichts zeigen.
  if (!hydrated || !schriftenGeladen) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: f.papier }}>
        <ActivityIndicator color={f.weg} />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: f.papier } }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="zustimmung" />
      </Stack>
    </>
  );
}
