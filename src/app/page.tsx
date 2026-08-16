'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useProfileStore } from '@/lib/profileStore';
import { useHydrated } from '@/lib/useHydrated';

export default function Home() {
  const router = useRouter();
  const hydrated = useHydrated();
  const onboardingDone = useProfileStore((s) => s.onboardingDone);

  useEffect(() => {
    // Erst umleiten, wenn der Store aus dem Speicher gelesen ist. Sonst landet
    // ein bestehender Nutzer beim Neuladen kurz wieder im Kennenlernen.
    if (!hydrated) return;
    router.replace(onboardingDone ? '/chat' : '/onboarding');
  }, [hydrated, onboardingDone, router]);

  return (
    <div className="flex justify-center items-center min-h-screen">
      <span>Lade…</span>
    </div>
  );
}
