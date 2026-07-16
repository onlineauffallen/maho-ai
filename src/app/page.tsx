'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Check ob das Onboarding abgeschlossen ist
    const onboardingDone = localStorage.getItem('onboardingDone');
    if (onboardingDone === 'true') {
      router.replace('/chat');
    } else {
      router.replace('/onboarding');
    }
  }, [router]);

  // Optional: Ein kleiner Loader während Redirect
  return (
    <div className="flex justify-center items-center min-h-screen">
      <span>Lade...</span>
    </div>
  );
}
