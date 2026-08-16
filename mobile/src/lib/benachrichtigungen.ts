// src/lib/benachrichtigungen.ts
// Ohne Benachrichtigung ist eine Wiedervorlage nur ein Eintrag in einer Liste,
// die niemand aufmacht. Das hier ist der Teil, der Maho von sich aus melden
// lässt, und er läuft komplett auf dem Gerät: kein Server, kein Push-Dienst,
// keine Anmeldung.
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { useCalendarStore } from './calendarStore';
import { useFollowupStore } from './followupStore';
import { datumLesbar } from './ids';
import {
  erinnerungFuerTermin,
  erinnerungFuerWiedervorlage,
  VORLAUF_MINUTEN,
} from './erinnerungsZeit';

/**
 * iOS erlaubt 64 gleichzeitig vorgemerkte lokale Benachrichtigungen pro App.
 * Wer mehr plant, verliert die überzähligen stillschweigend. Deshalb wird bei
 * jedem Start neu geplant und auf die nächsten Termine begrenzt.
 */
const MAX_GEPLANT = 60;

// Der Handler wird beim Import gesetzt, also auch in der Web-Ausgabe. Dort
// gibt es keine nativen Benachrichtigungen, deshalb der Guard.
if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

export async function benachrichtigungenErlaubt(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const { status } = await Notifications.getPermissionsAsync();
  return status === 'granted';
}

/**
 * Fragt die Erlaubnis an. Bewusst nicht beim ersten Start: ein Dialog, bevor
 * der Nutzer weiß wofür, wird weggetippt und ist dann dauerhaft verloren.
 * Aufgerufen wird das, wenn zum ersten Mal etwas zu erinnern da ist.
 */
export async function erlaubnisAnfragen(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const vorher = await Notifications.getPermissionsAsync();
  if (vorher.status === 'granted') return true;
  if (!vorher.canAskAgain) return false;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

/**
 * Plant alles neu: erst löschen, dann aus dem aktuellen Stand aufbauen.
 *
 * Neu planen statt nachpflegen ist hier das einfachere Verfahren, weil jede
 * Änderung an einem Termin sonst einzeln nachgezogen werden müsste und
 * verwaiste Erinnerungen zurückblieben.
 */
export async function alleNeuPlanen(): Promise<number> {
  if (Platform.OS === 'web') return 0;
  if (!(await benachrichtigungenErlaubt())) return 0;

  await Notifications.cancelAllScheduledNotificationsAsync();

  const geplant: { zeit: Date; titel: string; text: string; daten: Record<string, string> }[] = [];

  for (const e of useCalendarStore.getState().events) {
    const zeit = erinnerungFuerTermin(e.date, e.time);
    if (!zeit) continue;
    geplant.push({
      zeit,
      titel: e.title,
      text: e.time ? `In ${VORLAUF_MINUTEN} Minuten, um ${e.time}` : `Heute, ${datumLesbar(e.date)}`,
      daten: { art: 'termin', id: e.id },
    });
  }

  for (const w of useFollowupStore.getState().wiedervorlagen) {
    if (w.angesprochen) continue;
    const zeit = erinnerungFuerWiedervorlage(w.faelligAm);
    if (!zeit) continue;
    geplant.push({
      zeit,
      titel: 'Darüber wolltest du nochmal reden',
      text: w.thema,
      daten: { art: 'wiedervorlage', id: w.id },
    });
  }

  geplant.sort((a, b) => a.zeit.getTime() - b.zeit.getTime());

  for (const g of geplant.slice(0, MAX_GEPLANT)) {
    await Notifications.scheduleNotificationAsync({
      content: { title: g.titel, body: g.text, data: g.daten },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: g.zeit,
      },
    });
  }

  return Math.min(geplant.length, MAX_GEPLANT);
}

/**
 * Sorgt dafür, dass geplant wird, sobald es etwas zu erinnern gibt, und fragt
 * dabei einmal nach der Erlaubnis. Wird nach jeder Änderung aufgerufen.
 */
export async function erinnerungenAktualisieren(mitNachfrage = false): Promise<void> {
  if (Platform.OS === 'web') return;
  if (mitNachfrage && !(await benachrichtigungenErlaubt())) {
    const ok = await erlaubnisAnfragen();
    if (!ok) return;
  }
  await alleNeuPlanen();
}
