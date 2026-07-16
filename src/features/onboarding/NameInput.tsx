'use client';

import { useOnboardingStore } from '@/lib/useOnboardingStore';

export default function NameInput() {
  const { name, setName } = useOnboardingStore();

  return (
    <input
      type="text"
      placeholder="Dein Name..."
      value={name}
      onChange={(e) => setName(e.target.value)}
      className="w-full max-w-xs border rounded-lg p-2 mb-4 text-center"
    />
  );
}
