'use client';

import { useOnboardingStore } from '@/lib/useOnboardingStore';

const areas = ['Finanziell', 'Business', 'Fitness', 'Therapie', 'Religiös'];

export default function LebensbereicheAuswahl() {
  const { selectedAreas, toggleArea } = useOnboardingStore();

  return (
    <div className="flex flex-col items-center justify-center">
      <h2 className="text-xl font-bold mb-4 text-center">
        In welchen Lebensbereichen kann ich dich unterstützen?
      </h2>
      <div className="flex flex-wrap justify-center gap-2">
        {areas.map((area) => (
          <button
            key={area}
            onClick={() => toggleArea(area)}
            className={`px-4 py-2 rounded-full border transition ${
              selectedAreas.includes(area)
                ? 'bg-purple-700 text-white'
                : 'bg-gray-200 text-black hover:bg-purple-200'
            }`}
          >
            {area}
          </button>
        ))}
      </div>
    </div>
  );
}
