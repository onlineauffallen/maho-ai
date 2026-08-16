// src/lib/zeitrechnung.ts
// Alle Zeitrechnung an einer Stelle, bewusst ohne native Abhängigkeiten: nur so
// lässt sie sich außerhalb eines Geräts prüfen. Eine Erinnerung zur falschen
// Zeit ist schlimmer als keine, und ein Termin mit falscher Dauer landet so im
// echten Kalender des Nutzers.

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

/** Wie lange ein Termin dauert, wenn niemand ein Ende genannt hat. */
export const STANDARD_DAUER_MINUTEN = 60;

/** Start- und Endzeitpunkt eines Termins als echte Zeitpunkte. */
export function zeitraum(e: { date: string; time?: string; endTime?: string }): {
  start: Date;
  ende: Date;
  ganztaegig: boolean;
} {
  if (!e.time) {
    const start = new Date(`${e.date}T00:00:00`);
    const ende = new Date(`${e.date}T00:00:00`);
    ende.setDate(ende.getDate() + 1);
    return { start, ende, ganztaegig: true };
  }

  const start = new Date(`${e.date}T${e.time}:00`);
  const ende = new Date(start);
  if (e.endTime) {
    const [h, m] = e.endTime.split(':').map(Number);
    ende.setHours(h, m, 0, 0);
    // Ende vor dem Start heißt: es geht über Mitternacht.
    if (ende.getTime() <= start.getTime()) ende.setDate(ende.getDate() + 1);
  } else {
    ende.setMinutes(ende.getMinutes() + STANDARD_DAUER_MINUTEN);
  }
  return { start, ende, ganztaegig: false };
}

