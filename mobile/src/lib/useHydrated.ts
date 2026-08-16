// src/lib/useHydrated.ts
import { useEffect, useState } from 'react';
import { useProfileStore } from './profileStore';
import { useTodoStore } from './todoStore';
import { useCalendarStore } from './calendarStore';

const stores = [useProfileStore, useTodoStore, useCalendarStore];

const alleFertig = () => stores.every((s) => s.persist.hasHydrated());

/**
 * True, sobald alle Stores aus dem Speicher gelesen sind.
 *
 * Im Browser war das nur eine Formalität, hier nicht: AsyncStorage ist
 * asynchron, der erste Render sieht leere Stores. Ohne diese Abfrage landet
 * ein bestehender Nutzer beim Start kurz im Kennenlernen und die Listen
 * behaupten eine Sekunde lang, es gäbe nichts.
 */
export function useHydrated(): boolean {
  const [fertig, setFertig] = useState(alleFertig);

  useEffect(() => {
    if (fertig) return;
    const pruefen = () => alleFertig() && setFertig(true);
    const abmelden = stores.map((s) => s.persist.onFinishHydration(pruefen));
    pruefen(); // falls zwischen Render und Effekt schon alles fertig wurde
    return () => abmelden.forEach((ab) => ab());
  }, [fertig]);

  return fertig;
}
