'use client';

import { useOnboardingStore } from '@/lib/useOnboardingStore';
import NameInput from '@/features/onboarding/NameInput';
import LebensbereicheAuswahl from '@/features/onboarding/LebensbereicheAuswahl';
import Fragebogen from '@/features/onboarding/Fragebogen';
import { useRouter } from 'next/navigation';

export default function OnboardingPage() {
  const { step, nextStep, previousStep, name, selectedAreas } = useOnboardingStore();
  const router = useRouter();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-white p-4 gap-8">
      {/* Schritt 1: Name */}
      {step === 1 && (
        <>
          <h1 className="text-2xl font-bold text-center">
            Hallo 👋<br />
            Ich bin Maho, dein persönlicher KI-Assistent
          </h1>
          <NameInput />
          <button
            disabled={!name}
            className={`px-6 py-2 rounded-lg transition ${
              name ? 'bg-black text-white hover:bg-purple-700' : 'bg-gray-400 text-white cursor-not-allowed'
            }`}
            onClick={nextStep}
          >
            Weiter
          </button>
        </>
      )}

      {/* Schritt 2: Lebensbereiche */}
      {step === 2 && (
        <>
          <LebensbereicheAuswahl />
          <div className="flex gap-4">
            <button
              className="px-4 py-2 border rounded-lg hover:bg-gray-100 transition"
              onClick={previousStep}
            >
              Zurück
            </button>
            <button
              disabled={selectedAreas.length === 0}
              className={`px-6 py-2 rounded-lg transition ${
                selectedAreas.length > 0
                  ? 'bg-black text-white hover:bg-purple-700'
                  : 'bg-gray-400 text-white cursor-not-allowed'
              }`}
              onClick={nextStep}
            >
              Weiter
            </button>
          </div>
        </>
      )}

      {/* Schritt 3: Fragen */}
      {step === 3 && <Fragebogen />}

      {/* Abschluss-Screen */}
      {step > 3 && (
        <div className="flex flex-col items-center justify-center min-h-screen gap-8">
          <h2 className="text-2xl font-bold text-center">
            🎉 Onboarding abgeschlossen!
          </h2>
          <p className="text-center">
            Danke, {name}! Maho ist jetzt bereit, dich zu unterstützen.<br />
            Du kannst jetzt direkt loslegen.
          </p>
          <button
  className="px-8 py-3 rounded-lg bg-purple-700 text-white font-semibold text-lg hover:bg-black transition"
  onClick={() => {
    localStorage.setItem('onboardingDone', 'true');
    router.push('/chat');
  }}
>
  Starte mit Maho!
</button>

        </div>
      )}
    </div>
  );
}
