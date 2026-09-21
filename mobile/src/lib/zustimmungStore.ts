// src/lib/zustimmungStore.ts
//
// Die Zustimmung zur Übertragung an den KI-Anbieter.
//
// Apple verlangt seit 13.11.2025 (Guideline 5.1.2(i)), dass die Weitergabe
// personenbezogener Daten an eine Dritt-KI offengelegt und vorher zugestimmt
// wird. Ohne diesen Speicher ginge schon die erste Nachricht ungefragt hinaus.
//
// `version` steigt, wenn sich ändert, was übertragen wird oder an wen. Dann
// gilt die alte Zustimmung nicht mehr und der Nutzer wird neu gefragt.
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { appStorage } from './storage';

export const ZUSTIMMUNG_VERSION = 1;

type ZustimmungState = {
  /** Wann zugestimmt wurde, oder null. */
  am: string | null;
  version: number;
  zustimmen: () => void;
  widerrufen: () => void;
};

export const useZustimmungStore = create<ZustimmungState>()(
  persist(
    (set) => ({
      am: null,
      version: 0,
      zustimmen: () => set({ am: new Date().toISOString(), version: ZUSTIMMUNG_VERSION }),
      widerrufen: () => set({ am: null, version: 0 }),
    }),
    { name: 'maho-zustimmung', storage: appStorage }
  )
);

/** Gilt die Zustimmung für die aktuelle Fassung des Textes? */
export const istZugestimmt = (s: { am: string | null; version: number }) =>
  s.am !== null && s.version >= ZUSTIMMUNG_VERSION;
