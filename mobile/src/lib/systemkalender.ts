// src/lib/systemkalender.ts
// Der Kalender des Nutzers ist der Kalender. Ein Termin, der nur in Mahos
// eigener Liste liegt, taucht auf keinem Sperrbildschirm auf, in keiner Uhr
// und in keiner anderen App. Deshalb wandert jeder Termin zusätzlich in den
// Kalender des Geräts.
//
// Zugriff bewusst nur schreibend (writeOnly): Termine anlegen geht damit, aber
// Maho bekommt die privaten Termine des Nutzers nicht zu sehen. Das ist der
// harmloseste Berechtigungsdialog, den iOS für diesen Zweck anbietet.
//
// Achtung: In Expo Go liefert expo-calendar nur einen Stub, echte Einträge
// entstehen erst in einem Development Build.
import { Platform } from 'react-native';
import * as Calendar from 'expo-calendar';
import type { CalEvent } from './calendarStore';
import { zeitraum } from './zeitrechnung';

const AKTIV = Platform.OS === 'ios' || Platform.OS === 'android';

export async function systemkalenderErlaubt(): Promise<boolean> {
  if (!AKTIV) return false;
  try {
    const { status } = await Calendar.getCalendarPermissions(true);
    return status === 'granted';
  } catch {
    return false;
  }
}

/**
 * Fragt einmal nach der Erlaubnis. Wie bei den Benachrichtigungen erst dann,
 * wenn der Nutzer gerade einen Termin angelegt hat und der Sinn offensichtlich
 * ist, nicht beim ersten Start.
 */
export async function systemkalenderErlaubnisAnfragen(): Promise<boolean> {
  if (!AKTIV) return false;
  try {
    const vorher = await Calendar.getCalendarPermissions(true);
    if (vorher.status === 'granted') return true;
    if (!vorher.canAskAgain) return false;
    const { status } = await Calendar.requestCalendarPermissions(true);
    return status === 'granted';
  } catch {
    return false;
  }
}

/**
 * Schreibt einen Termin in den Kalender des Geräts und gibt dessen ID zurück.
 * Gibt undefined zurück, wenn es nicht geht: ohne Erlaubnis, in Expo Go oder im
 * Browser. Der Termin bleibt dann trotzdem in Maho stehen, die App funktioniert
 * ohne Kalenderzugriff weiter.
 */
export async function terminSchreiben(e: CalEvent): Promise<string | undefined> {
  if (!AKTIV) return undefined;
  if (!(await systemkalenderErlaubt())) return undefined;

  try {
    const kalender = Calendar.getDefaultCalendarSync();
    const { start, ende, ganztaegig } = zeitraum(e);
    const angelegt = await kalender.createEvent({
      title: e.title,
      startDate: start,
      endDate: ende,
      allDay: ganztaegig,
      notes: 'Von Maho angelegt',
    });
    return angelegt.id;
  } catch (fehler) {
    console.warn('Termin konnte nicht in den Gerätekalender geschrieben werden:', fehler);
    return undefined;
  }
}

/**
 * Verschiebt einen bereits geschriebenen Termin.
 *
 * Mit reinem Schreibrecht darf eine App die Einträge ändern, die sie selbst
 * angelegt hat, und genau das sind alle mit einer externalId.
 */
export async function terminAktualisieren(externalId: string, e: CalEvent): Promise<boolean> {
  if (!AKTIV) return false;
  if (!(await systemkalenderErlaubt())) return false;

  try {
    const { start, ende, ganztaegig } = zeitraum(e);
    const eintrag = new Calendar.ExpoCalendarEvent(externalId);
    await eintrag.update({ title: e.title, startDate: start, endDate: ende, allDay: ganztaegig });
    return true;
  } catch (fehler) {
    console.warn('Termin konnte im Gerätekalender nicht geändert werden:', fehler);
    return false;
  }
}

/** Entfernt einen Termin wieder aus dem Kalender des Geräts. */
export async function terminEntfernen(externalId: string): Promise<boolean> {
  if (!AKTIV) return false;
  if (!(await systemkalenderErlaubt())) return false;

  try {
    await new Calendar.ExpoCalendarEvent(externalId).delete();
    return true;
  } catch (fehler) {
    // Häufigster Fall: der Nutzer hat den Termin im Kalender schon selbst
    // gelöscht. Kein Grund für eine Fehlermeldung.
    console.warn('Termin konnte im Gerätekalender nicht gelöscht werden:', fehler);
    return false;
  }
}
