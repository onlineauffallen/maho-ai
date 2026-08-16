// src/lib/useHydrated.ts
import { useEffect, useState } from 'react';

/**
 * True erst nach dem ersten Rendern im Browser.
 *
 * Nötig, weil die Stores aus dem localStorage kommen und das heutige Datum
 * lokal berechnet wird. Beim Vorrendern auf dem Server ist beides nicht
 * verfügbar bzw. anders, was sonst zu abweichendem Markup führt.
 */
export function useHydrated(): boolean {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  return hydrated;
}
