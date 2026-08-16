// src/lib/erinnerungsZeit.ts
// Reine Zeitrechnung für Erinnerungen, bewusst ohne Abhängigkeit auf
// expo-notifications: nur so lässt sie sich außerhalb eines Geräts prüfen,
// und eine Erinnerung, die zur falschen Zeit kommt, ist schlimmer als keine.

/** Wie lange vor einem Termin mit Uhrzeit erinnert wird. */
export const VORLAUF_MINUTEN = 30;

/** Uhrzeit für alles, was nur einen Tag hat und keine Uhrzeit. */
export const TAGESSTUNDE = 9;

/**
 * Zeitpunkt der Erinnerung zu einem Termin.
 * Gibt null zurück, wenn er in der Vergangenheit läge.
 */
export function erinnerungFuerTermin(
  datum: string,
  zeit: string | undefined,
  jetzt: Date = new Date()
): Date | null {
  const [stunde, minute] = zeit ? zeit.split(':').map(Number) : [TAGESSTUNDE, 0];
  if (Number.isNaN(stunde) || Number.isNaN(minute)) return null;

  const d = new Date(`${datum}T00:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  d.setHours(stunde, minute, 0, 0);
  if (zeit) d.setMinutes(d.getMinutes() - VORLAUF_MINUTEN);

  return d.getTime() > jetzt.getTime() ? d : null;
}

/** Zeitpunkt der Erinnerung zu einer Wiedervorlage: am Tag selbst, früh. */
export function erinnerungFuerWiedervorlage(datum: string, jetzt: Date = new Date()): Date | null {
  const d = new Date(`${datum}T00:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  d.setHours(TAGESSTUNDE, 0, 0, 0);
  return d.getTime() > jetzt.getTime() ? d : null;
}
