'use client';

import { onboardingQuestions } from './onboardingQuestions';
import { useOnboardingStore } from '@/lib/useOnboardingStore';
import { useState } from 'react';

export default function Fragebogen() {
  const { selectedAreas, nextStep, saveAnswer } = useOnboardingStore();
  const [areaIndex, setAreaIndex] = useState(0);
  const area = selectedAreas[areaIndex];
  if (!area) return <div>Onboarding abgeschlossen! 🎉</div>;
  const questions = onboardingQuestions[area] ?? [];
  const [answers, setAnswers] = useState<Record<string, string[]>>({});

  const handleSelect = (
    questionId: string,
    option: string,
    type: 'single' | 'multi'
  ) => {
    setAnswers((prev) => {
      const current = prev[questionId] || [];
      if (type === 'single') return { ...prev, [questionId]: [option] };
      const exists = current.includes(option);
      const updated = exists
        ? current.filter((o) => o !== option)
        : [...current, option];
      return { ...prev, [questionId]: updated };
    });
  };

  const handleWeiter = () => {
    // Speichern in globalen Store
    questions.forEach((q) =>
      saveAnswer(q.id, answers[q.id] ?? [])
    );
    if (areaIndex + 1 < selectedAreas.length) {
      setAreaIndex(areaIndex + 1);
    } else {
      nextStep();
    }
  };

  return (
    <div className="flex flex-col items-center gap-6">
      <h2 className="text-xl font-bold text-center">Bereich: {area}</h2>
      {questions.map((q) => (
        <div key={q.id} className="text-center">
          <p className="mb-2 font-semibold">{q.question}</p>
          <div className="flex flex-wrap justify-center gap-2">
            {q.options.map((option) => {
              const selected = answers[q.id]?.includes(option);
              return (
                <button
                  key={option}
                  onClick={() => handleSelect(q.id, option, q.type)}
                  className={`px-4 py-2 rounded-full border transition ${
                    selected
                      ? 'bg-purple-700 text-white'
                      : 'bg-gray-200 text-black hover:bg-purple-200'
                  }`}
                >
                  {option}
                </button>
              );
            })}
          </div>
        </div>
      ))}
      <button
        className="mt-4 bg-black text-white px-6 py-2 rounded-lg hover:bg-purple-700 transition"
        onClick={handleWeiter}
      >
        Weiter
      </button>
    </div>
  );
}
