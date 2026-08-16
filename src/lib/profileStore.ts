// src/lib/profileStore.ts
// Die Grundeinstellungen: was der Nutzer bewusst über sich festgelegt hat.
//
// Bewusst getrennt vom Gedächtnis in memory.ts. Der Unterschied ist nicht
// kosmetisch:
//   Profil    = vom Nutzer gesetzt, nur auf Ansage geändert, darf nie still
//               verschwinden. Läuft es voll, wird gefragt, was weichen soll.
//   Gedächtnis = von Maho selbst gelernt, wird automatisch verdichtet.
// Wären beide ein Topf, würde der Automatismus überschreiben, was der Nutzer
// selbst eingetragen hat.
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

/** Hartes Limit für den freien Teil des Profils. Zwingt zum Priorisieren. */
export const MAX_PROFILE_CHARS = 1000;

/** Mehr Kategorien werden unübersichtlich, dann sind es keine Kategorien mehr. */
export const MAX_CATEGORIES = 8;

type ProfileState = {
  name: string;
  /** Freier, begrenzter Text: Lebensbereiche, Ziele, Gewohnheiten. */
  basics: string;
  /** Kategorien für Aufgaben, z. B. "Online Auffallen", "Privat". */
  categories: string[];
  onboardingDone: boolean;

  setName: (name: string) => void;
  setBasics: (text: string) => { ok: boolean; overflow: number };
  addCategory: (name: string) => string | undefined;
  renameCategory: (from: string, to: string) => void;
  removeCategory: (name: string) => void;
  setOnboardingDone: (done: boolean) => void;
};

export const useProfileStore = create<ProfileState>()(
  persist(
    (set, get) => ({
      name: '',
      basics: '',
      categories: [],
      onboardingDone: false,

      setName: (name) => set({ name: name.trim() }),

      // Schneidet NICHT still ab. Der Aufrufer erfährt, um wie viel zu viel es
      // war, und kann fragen, was raus soll.
      setBasics: (text) => {
        const overflow = text.length - MAX_PROFILE_CHARS;
        if (overflow > 0) return { ok: false, overflow };
        set({ basics: text });
        return { ok: true, overflow: 0 };
      },

      addCategory: (name) => {
        const clean = name.trim();
        if (!clean) return undefined;
        const existing = findCategory(get().categories, clean);
        if (existing) return existing; // schon da, in irgendeiner Schreibweise
        if (get().categories.length >= MAX_CATEGORIES) return undefined;
        set((s) => ({ categories: [...s.categories, clean] }));
        return clean;
      },

      renameCategory: (from, to) => {
        const clean = to.trim();
        if (!clean) return;
        set((s) => ({ categories: s.categories.map((c) => (c === from ? clean : c)) }));
      },

      removeCategory: (name) =>
        set((s) => ({ categories: s.categories.filter((c) => c !== name) })),

      setOnboardingDone: (done) => set({ onboardingDone: done }),
    }),
    {
      name: 'maho-profile',
      storage: createJSONStorage(() => localStorage),
      version: 1,
    }
  )
);

/**
 * Sucht eine Kategorie unabhängig von Groß- und Kleinschreibung.
 * Verhindert, dass "Firma X", "firma x" und "FIRMA X" als drei Sektionen
 * nebeneinander stehen, sobald die KI Kategorien vergibt.
 */
export function findCategory(categories: string[], name: string): string | undefined {
  const needle = name.trim().toLocaleLowerCase('de');
  return categories.find((c) => c.toLocaleLowerCase('de') === needle);
}

/**
 * Bringt eine von der KI gelieferte Kategorie auf eine bestehende, oder legt
 * sie an, wenn noch Platz ist. Gibt zurück, was tatsächlich gespeichert wird.
 */
export function resolveCategory(input?: string): string | undefined {
  if (!input?.trim()) return undefined;
  const { categories, addCategory } = useProfileStore.getState();
  return findCategory(categories, input) ?? addCategory(input);
}
