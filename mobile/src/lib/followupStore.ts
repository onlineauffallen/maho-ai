// src/lib/followupStore.ts
// Wiedervorlagen: "reden wir in drei Tagen nochmal darüber".
//
// Bewusst kein verkleidetes Todo. Eine Aufgabe will erledigt werden und steht
// auf einer Liste. Eine Wiedervorlage will besprochen werden: an ihrem Tag
// fängt Maho das Gespräch von sich aus an. Das ist der Teil, den ein Assistent
// kann und ein Chatfenster nicht, weil ein Chatfenster nie zuerst schreibt.
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { appStorage } from './storage';
import { newId, now, today } from './ids';

export type Wiedervorlage = {
  id: string;
  /** Worum es geht, aus Sicht des Nutzers formuliert. */
  thema: string;
  /** Ein Satz Zusammenhang, damit Maho das Gespräch sinnvoll wieder aufnehmen kann. */
  kontext?: string;
  faelligAm: string; // YYYY-MM-DD
  /** Wurde das Thema wieder angesprochen? */
  angesprochen: boolean;
  createdAt: string;
  updatedAt: string;
};

type FollowupState = {
  wiedervorlagen: Wiedervorlage[];
  add: (input: { thema: string; kontext?: string; faelligAm: string }) => Wiedervorlage;
  alsAngesprochenMarkieren: (id: string) => void;
  entfernen: (id: string) => void;
  leeren: () => void;
};

export const useFollowupStore = create<FollowupState>()(
  persist(
    (set) => ({
      wiedervorlagen: [],

      add: (input) => {
        const stamp = now();
        const w: Wiedervorlage = {
          id: newId(),
          thema: input.thema,
          kontext: input.kontext || undefined,
          faelligAm: input.faelligAm,
          angesprochen: false,
          createdAt: stamp,
          updatedAt: stamp,
        };
        set((s) => ({ wiedervorlagen: [...s.wiedervorlagen, w] }));
        return w;
      },

      alsAngesprochenMarkieren: (id) =>
        set((s) => ({
          wiedervorlagen: s.wiedervorlagen.map((w) =>
            w.id === id ? { ...w, angesprochen: true, updatedAt: now() } : w
          ),
        })),

      entfernen: (id) =>
        set((s) => ({ wiedervorlagen: s.wiedervorlagen.filter((w) => w.id !== id) })),

      leeren: () => set({ wiedervorlagen: [] }),
    }),
    { name: 'maho-followups', storage: appStorage, version: 1 }
  )
);

/** Was heute oder früher dran gewesen wäre und noch nicht angesprochen wurde. */
export function faelligeWiedervorlagen(alle: Wiedervorlage[]): Wiedervorlage[] {
  const heute = today();
  return alle
    .filter((w) => !w.angesprochen && w.faelligAm <= heute)
    .sort((a, b) => a.faelligAm.localeCompare(b.faelligAm));
}
