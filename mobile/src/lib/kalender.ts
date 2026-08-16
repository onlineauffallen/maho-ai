// src/lib/kalender.ts
// Eine Stelle für alle Terminänderungen, damit der Kalender des Geräts nicht
// auseinanderläuft. Direkt auf den Store zuzugreifen ist ab jetzt nur noch für
// Lesen richtig.
//
// Der Store wird sofort aktualisiert, der Gerätekalender im Hintergrund: die
// Werkzeuge der KI laufen synchron, und eine Oberfläche, die auf das
// Betriebssystem wartet, fühlt sich hakelig an. Klappt das Schreiben nicht,
// bleibt der Termin trotzdem in Maho stehen.
import { useCalendarStore, type CalEvent } from './calendarStore';
import {
  terminSchreiben,
  terminAktualisieren,
  terminEntfernen,
  systemkalenderErlaubt,
  systemkalenderErlaubnisAnfragen,
} from './systemkalender';

type NeuerTermin = Omit<CalEvent, 'id' | 'createdAt' | 'updatedAt' | 'externalId'>;

export function terminAnlegen(daten: NeuerTermin): CalEvent {
  const ev = useCalendarStore.getState().addEvent(daten);

  void terminSchreiben(ev).then((externalId) => {
    if (externalId) useCalendarStore.getState().updateEvent(ev.id, { externalId });
  });

  return ev;
}

export function terminAendern(id: string, patch: Partial<Omit<CalEvent, 'id' | 'createdAt'>>) {
  const { updateEvent } = useCalendarStore.getState();
  updateEvent(id, patch);

  const danach = useCalendarStore.getState().events.find((e) => e.id === id);
  if (!danach) return;

  void (danach.externalId
    ? terminAktualisieren(danach.externalId, danach)
    : // Beim ersten Mal nachträglich anlegen: der Termin kann entstanden sein,
      // bevor der Nutzer den Kalenderzugriff erlaubt hat.
      terminSchreiben(danach).then((externalId) => {
        if (externalId) useCalendarStore.getState().updateEvent(id, { externalId });
      }));
}

export function terminLoeschen(id: string) {
  const ev = useCalendarStore.getState().events.find((e) => e.id === id);
  // externalId vor dem Löschen lesen, danach ist sie weg.
  const externalId = ev?.externalId;

  useCalendarStore.getState().removeEvent(id);
  if (externalId) void terminEntfernen(externalId);
}

/** Alle Termine löschen, auch im Kalender des Geräts. Für "alle Daten löschen". */
export function alleTermineLoeschen() {
  const { events, leeren } = useCalendarStore.getState();
  const fremde = events.map((e) => e.externalId).filter((x): x is string => !!x);
  leeren();
  for (const externalId of fremde) void terminEntfernen(externalId);
}

/**
 * Fragt beim ersten Mal nach dem Kalenderzugriff und trägt danach alles nach,
 * was bisher nur in Maho stand. Aufgerufen, wenn gerade ein Termin entstanden
 * ist: dann ist offensichtlich, wofür der Systemdialog gut ist.
 */
export async function kalenderZugriffSicherstellen(): Promise<boolean> {
  if (await systemkalenderErlaubt()) {
    void offeneTermineNachtragen();
    return true;
  }
  const erlaubt = await systemkalenderErlaubnisAnfragen();
  if (erlaubt) await offeneTermineNachtragen();
  return erlaubt;
}

/**
 * Trägt alles nach, was noch nicht im Gerätekalender steht. Läuft, sobald der
 * Nutzer den Zugriff erlaubt hat, damit auch die vorher angelegten Termine
 * dort landen.
 */
export async function offeneTermineNachtragen(): Promise<number> {
  const { events } = useCalendarStore.getState();
  let anzahl = 0;
  for (const e of events.filter((x) => !x.externalId)) {
    const externalId = await terminSchreiben(e);
    if (externalId) {
      useCalendarStore.getState().updateEvent(e.id, { externalId });
      anzahl += 1;
    }
  }
  return anzahl;
}
