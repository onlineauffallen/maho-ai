import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

type OnboardingState = {
  step: number;
  nextStep: () => void;
  previousStep: () => void;
  name: string;
  setName: (name: string) => void;
  selectedAreas: string[];
  toggleArea: (area: string) => void;
  answers: Record<string, string[]>;
  saveAnswer: (questionId: string, values: string[] | string) => void;
};

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set) => ({
      step: 1,
      nextStep: () => set((state) => ({ step: state.step + 1 })),
      previousStep: () => set((state) => ({ step: state.step - 1 })),
      name: '',
      setName: (name: string) => set({ name }),
      selectedAreas: [],
      toggleArea: (area: string) =>
        set((state) => ({
          selectedAreas: state.selectedAreas.includes(area)
            ? state.selectedAreas.filter((a) => a !== area)
            : [...state.selectedAreas, area],
        })),
      answers: {},
      saveAnswer: (questionId, values) =>
        set((state) => ({
          answers: {
            ...state.answers,
            [questionId]: Array.isArray(values) ? values : [values],
          },
        })),
    }),
    { name: 'maho-onboarding', storage: createJSONStorage(() => localStorage) }
  )
);
