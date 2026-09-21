// Wie viel vom Chatverlauf mit jeder Anfrage zum Server geht.
//
// Ein festes "die letzten 10" verschiebt den Anfang bei jeder Nachricht um eins,
// und damit ändert sich das ganze Präfix der Anfrage. Der Cache des Anbieters
// greift dann nie auf dem Verlauf. Hier rückt der Anfang stattdessen in Blöcken
// vor: der Verlauf umfasst zwischen MIN und MIN + SCHRITT - 1 Nachrichten, und
// der Anfang bleibt SCHRITT Nachrichten lang derselbe.

export const FENSTER_MIN = 10;
export const FENSTER_SCHRITT = 4;

/** Index, ab dem der Verlauf mitgeschickt wird. */
export function fensterStart(anzahl: number): number {
  if (anzahl <= FENSTER_MIN) return 0;
  return Math.floor((anzahl - FENSTER_MIN) / FENSTER_SCHRITT) * FENSTER_SCHRITT;
}

export function verlaufsfenster<T>(nachrichten: T[]): T[] {
  return nachrichten.slice(fensterStart(nachrichten.length));
}
