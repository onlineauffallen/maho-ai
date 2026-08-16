import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useProfileStore } from '@/lib/profileStore';
import { useHydrated } from '@/lib/useHydrated';
import { farben } from '@/lib/theme';

export default function RootLayout() {
  const hydrated = useHydrated();
  const onboardingDone = useProfileStore((s) => s.onboardingDone);
  const segmente = useSegments();
  const router = useRouter();

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
