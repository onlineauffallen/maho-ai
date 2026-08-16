import { useEffect } from 'react';
import { ActivityIndicator, AppState, useColorScheme, View } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts, Barlow_400Regular, Barlow_500Medium } from '@expo-google-fonts/barlow';
import {
  BarlowSemiCondensed_500Medium,
  BarlowSemiCondensed_600SemiBold,
  BarlowSemiCondensed_700Bold,
} from '@expo-google-fonts/barlow-semi-condensed';
import { useProfileStore } from '@/lib/profileStore';
import { useCalendarStore } from '@/lib/calendarStore';
import { useFollowupStore } from '@/lib/followupStore';
import { erinnerungenAktualisieren } from '@/lib/benachrichtigungen';
import { useHydrated } from '@/lib/useHydrated';
import { useFarben } from '@/lib/theme';

export default function RootLayout() {
  const hydrated = useHydrated();
  const f = useFarben();
  const dunkel = useColorScheme() === 'dark';
  const onboardingDone = useProfileStore((s) => s.onboardingDone);
  const segmente = useSegments();
  const router = useRouter();
  const events = useCalendarStore((s) => s.events);
  const wiedervorlagen = useFollowupStore((s) => s.wiedervorlagen);

  const [schriftenGeladen] = useFonts({
    Barlow_400Regular,
    Barlow_500Medium,
    BarlowSemiCondensed_500Medium,
    BarlowSemiCondensed_600SemiBold,
    BarlowSemiCondensed_700Bold,
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
    const imOnboarding = segmente[0] === 'onboarding';
    if (!onboardingDone && !imOnboarding) router.replace('/onboarding');
    if (onboardingDone && imOnboarding) router.replace('/');
  }, [hydrated, onboardingDone, segmente, router]);

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
      <StatusBar style={dunkel ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: f.papier } }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="onboarding" />
      </Stack>
    </>
  );
}
