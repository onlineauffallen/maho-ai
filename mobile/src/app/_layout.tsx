import { useEffect } from 'react';
import { ActivityIndicator, AppState, View } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useProfileStore } from '@/lib/profileStore';
import { useCalendarStore } from '@/lib/calendarStore';
import { useFollowupStore } from '@/lib/followupStore';
import { erinnerungenAktualisieren } from '@/lib/benachrichtigungen';
import { useHydrated } from '@/lib/useHydrated';
import { farben } from '@/lib/theme';

export default function RootLayout() {
  const hydrated = useHydrated();
  const onboardingDone = useProfileStore((s) => s.onboardingDone);
  const segmente = useSegments();
  const router = useRouter();
  const events = useCalendarStore((s) => s.events);
  const wiedervorlagen = useFollowupStore((s) => s.wiedervorlagen);

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

  // Solange die Stores nicht gelesen sind, wissen wir nicht, wohin. Lieber
  // kurz nichts zeigen als den falschen Screen.
  if (!hydrated) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: farben.grund }}>
        <ActivityIndicator color={farben.akzent} />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="onboarding" />
      </Stack>
    </>
  );
}
