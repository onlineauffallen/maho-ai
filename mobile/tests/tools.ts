// Die Werkzeuge, die Maho aufruft, gegen die echten Stores. Am dringendsten
// gebraucht, weil hier Termine und Aufgaben des Nutzers entstehen und
// verschwinden: ein falsches "gelöscht" oder ein doppelt angelegter Termin
// merkt sonst erst der Nutzer.
//
// Läuft über den Lader unter tests/lader.mjs (npm test).
import { executeTool } from '../src/lib/tools.ts';
import { useCalendarStore } from '../src/lib/calendarStore.ts';
import { useTodoStore } from '../src/lib/todoStore.ts';
import { useFollowupStore } from '../src/lib/followupStore.ts';
import { useProfileStore } from '../src/lib/profileStore.ts';
import { alleTermineLoeschen } from '../src/lib/kalender.ts';
import { today, plusTage } from '../src/lib/ids.ts';

let fehler = 0;
function pruef(name: string, ok: boolean, info = '') {
  if (!ok) fehler++;
  console.log(`${ok ? '✓' : '✗'} ${name}${ok || !info ? '' : `\n    ${info}`}`);
}

function leeren() {
  useTodoStore.getState().leeren();
  alleTermineLoeschen();
  useFollowupStore.getState().leeren();
  for (const k of [...useProfileStore.getState().categories]) useProfileStore.getState().removeCategory(k);
}
const termine = () => useCalendarStore.getState().events;
const aufgaben = () => useTodoStore.getState().todos;

const morgen = plusTage(today(), 1);

// Termine
leeren();
let r = executeTool('create_calendar_event', { title: 'Zahnarzt', date: morgen, time: '09:00' });
pruef('Termin mit gültigem Datum wird angelegt', termine().length === 1 && !!r.action, r.result);
pruef('Termin behält Titel, Datum und Uhrzeit', termine()[0]?.title === 'Zahnarzt' && termine()[0]?.date === morgen && termine()[0]?.time === '09:00');

for (const schlecht of ['16.08.2026', '', '2026-13-40', '2026-02-30', 'morgen']) {
  leeren();
  r = executeTool('create_calendar_event', { title: 'X', date: schlecht });
  pruef(`Datum "${schlecht}" wird abgelehnt, nichts angelegt`, termine().length === 0 && !r.action && r.result.includes('Ungültiges Datum'), r.result);
}
leeren();
r = executeTool('create_calendar_event', { title: 'X', date: morgen, time: '25:99' });
pruef('Uhrzeit 25:99 wird abgelehnt', termine().length === 0 && r.result.includes('Ungültige Uhrzeit'));
r = executeTool('create_calendar_event', { title: 'X', date: morgen, endTime: '10:00' });
pruef('Ende ohne Beginn wird nicht gespeichert', termine()[0]?.endTime === undefined);

// Löschen: nichts melden, was nicht passiert ist
leeren();
r = executeTool('delete_calendar_event', { id: 'gibt-es-nicht' });
pruef('unbekannter Termin: kein "gelöscht", kein Etikett', !r.action && r.result.includes('Kein Termin'), r.result);
executeTool('create_calendar_event', { title: 'Weg', date: morgen });
const id = termine()[0].id;
r = executeTool('delete_calendar_event', { id });
pruef('bekannter Termin wird gelöscht und gemeldet', termine().length === 0 && !!r.action);

// Aufgaben
leeren();
r = executeTool('add_todo', { text: 'Milch', due: '31.12.' });
pruef('Aufgabe mit ungültiger Frist wird abgelehnt', aufgaben().length === 0 && r.result.includes('Ungültiges Datum'));
r = executeTool('add_todo', { text: 'Steuer', category: 'Arbeit', due: morgen });
pruef('Aufgabe wird angelegt, Kategorie entsteht', aufgaben().length === 1 && aufgaben()[0].category === 'Arbeit' && useProfileStore.getState().categories.includes('Arbeit'));
executeTool('add_todo', { text: 'Bericht', category: 'arbeit' });
pruef('andere Schreibweise ergibt keine zweite Kategorie', useProfileStore.getState().categories.length === 1, JSON.stringify(useProfileStore.getState().categories));

r = executeTool('update_todo', { id: 'nein', text: 'x' });
pruef('update_todo mit unbekannter ID meldet es', r.result.includes('Keine Aufgabe') && !r.action);
const tid = aufgaben()[0].id;
executeTool('update_todo', { id: tid, due: '' });
pruef('leerer String entfernt die Frist', aufgaben().find((t) => t.id === tid)?.due === undefined);

// Abhaken ist ein Umschalter, das Etikett muss stimmen
r = executeTool('complete_todo', { id: tid });
pruef('erstes complete_todo hakt ab', aufgaben().find((t) => t.id === tid)?.done === true && r.action!.label.includes('Abgehakt'));
r = executeTool('complete_todo', { id: tid });
pruef('zweites complete_todo öffnet wieder, Etikett sagt das', aufgaben().find((t) => t.id === tid)?.done === false && r.action!.label.includes('Wieder offen'));
r = executeTool('complete_todo', { id: 'nein' });
pruef('complete_todo mit unbekannter ID', !r.action && r.result.includes('Keine Aufgabe'));

// Aufgabe in den Kalender schicken
leeren();
executeTool('add_todo', { text: 'Angebot schreiben' });
const tid2 = aufgaben()[0].id;
r = executeTool('schedule_todo', { id: tid2 });
pruef('ohne Datum und ohne Frist wird nachgefragt, nichts angelegt', termine().length === 0 && r.result.includes('kein Datum'));
r = executeTool('schedule_todo', { id: tid2, date: morgen, time: '10:30' });
pruef('mit Datum entsteht genau ein Termin, mit der Aufgabe verknüpft', termine().length === 1 && aufgaben()[0].eventId === termine()[0].id);
r = executeTool('schedule_todo', { id: tid2, date: plusTage(morgen, 1) });
pruef('erneutes Einplanen verschiebt statt zu verdoppeln', termine().length === 1 && termine()[0].date === plusTage(morgen, 1), `${termine().length} Termine`);
pruef('Verschieben ohne Uhrzeit lässt die Uhrzeit stehen', termine()[0].time === '10:30', String(termine()[0].time));
pruef('die Frist der Aufgabe zieht mit', aufgaben()[0].due === plusTage(morgen, 1));

// Löschen einer Aufgabe nimmt den Termin mit
executeTool('delete_todo', { id: tid2 });
pruef('delete_todo entfernt auch den verknüpften Termin', aufgaben().length === 0 && termine().length === 0, `${aufgaben().length} Aufgaben, ${termine().length} Termine`);

// Vorschläge legen nichts an
leeren();
r = executeTool('vorschlagen', { art: 'aufgabe', titel: 'Steuerberater anrufen' });
pruef('Vorschlag liefert eine Karte und legt nichts an', !!r.vorschlag && !r.action && aufgaben().length === 0);
r = executeTool('vorschlagen', { art: 'kaffee', titel: 'x' });
pruef('unbekannte Art wird abgelehnt', !r.vorschlag);
r = executeTool('vorschlagen', { art: 'wiedervorlage', titel: 'Werkstatt' });
pruef('Wiedervorlage ohne Datum wird abgelehnt', !r.vorschlag && r.result.includes('Datum'));

// Wiedervorlage direkt
r = executeTool('add_followup', { thema: 'Werkstatt', datum: 'irgendwann' });
pruef('add_followup mit ungültigem Datum wird abgelehnt', useFollowupStore.getState().wiedervorlagen.length === 0);
r = executeTool('add_followup', { thema: 'Werkstatt', datum: morgen, kontext: 'Kostenvoranschlag' });
pruef('add_followup legt an', useFollowupStore.getState().wiedervorlagen.length === 1 && !!r.action);

// list_state: nur Offenes, nur ab heute, begrenzt
leeren();
executeTool('create_calendar_event', { title: 'Vorbei', date: plusTage(today(), -3) });
executeTool('create_calendar_event', { title: 'Kommt', date: morgen });
executeTool('add_todo', { text: 'Offen' });
executeTool('add_todo', { text: 'Fertig' });
executeTool('complete_todo', { id: aufgaben()[1].id });
const zustand = JSON.parse(executeTool('list_state', {}).result);
pruef('list_state zeigt keine vergangenen Termine', zustand.events.length === 1 && zustand.events[0].title === 'Kommt');
pruef('list_state zeigt nur offene Aufgaben und zählt die erledigten', zustand.todos.length === 1 && zustand.hinweis.includes('Erledigt: 1'));
leeren();
for (let i = 0; i < 70; i++) executeTool('add_todo', { text: `Aufgabe ${i}` });
pruef('list_state kappt bei 50 je Liste', JSON.parse(executeTool('list_state', {}).result).todos.length === 50);

r = executeTool('gibt_es_nicht', {});
pruef('unbekanntes Werkzeug wird gemeldet', r.result.includes('Unbekanntes Tool'));

leeren();
if (fehler) {
  console.error(`\n${fehler} Prüfung(en) fehlgeschlagen.`);
  process.exit(1);
}
console.log('\nAlle Werkzeug-Prüfungen bestanden.');
