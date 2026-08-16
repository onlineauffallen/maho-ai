import { erinnerungFuerTermin, erinnerungFuerWiedervorlage, zeitraum } from '../src/lib/zeitrechnung.ts';

const f = (d: Date | null) => (d ? d.toLocaleString('de-AT', { dateStyle: 'short', timeStyle: 'short' }) : 'KEINE');
let fehler = 0;
function pruef(name: string, ist: string, soll: string) {
  const ok = ist === soll;
  if (!ok) fehler++;
  console.log(`${ok ? '✓' : '✗'} ${name}\n    ist: ${ist}${ok ? '' : `\n    soll: ${soll}`}`);
}

const jetzt = new Date('2026-08-16T10:00:00');

pruef('Termin heute 14:30 → 30 min vorher',
  f(erinnerungFuerTermin('2026-08-16', '14:30', jetzt)), '16.08.26, 14:00');
pruef('Termin morgen 09:00 → 08:30',
  f(erinnerungFuerTermin('2026-08-17', '09:00', jetzt)), '17.08.26, 08:30');
pruef('Termin ohne Uhrzeit morgen → 09:00 früh',
  f(erinnerungFuerTermin('2026-08-17', undefined, jetzt)), '17.08.26, 09:00');
pruef('Termin heute 10:15, also in 15 min → keine (Vorlauf liegt hinter uns)',
  f(erinnerungFuerTermin('2026-08-16', '10:15', jetzt)), 'KEINE');
pruef('Termin gestern → keine',
  f(erinnerungFuerTermin('2026-08-15', '14:00', jetzt)), 'KEINE');
pruef('Termin 00:15 nachts → Vorlauf zieht auf den Vortag 23:45',
  f(erinnerungFuerTermin('2026-08-18', '00:15', jetzt)), '17.08.26, 23:45');
pruef('Termin am Monatsersten 00:10 → Vortag, Monatswechsel',
  f(erinnerungFuerTermin('2026-09-01', '00:10', jetzt)), '31.08.26, 23:40');
pruef('Wiedervorlage morgen → 09:00',
  f(erinnerungFuerWiedervorlage('2026-08-17', jetzt)), '17.08.26, 09:00');
pruef('Wiedervorlage heute, es ist schon 10 Uhr → keine',
  f(erinnerungFuerWiedervorlage('2026-08-16', jetzt)), 'KEINE');
pruef('Wiedervorlage heute, es ist 07:00 → heute 09:00',
  f(erinnerungFuerWiedervorlage('2026-08-16', new Date('2026-08-16T07:00:00'))), '16.08.26, 09:00');
pruef('Zeitumstellung: Termin am 25.10.2026 (Rückstellung) 03:00',
  f(erinnerungFuerTermin('2026-10-25', '03:00', jetzt)), '25.10.26, 02:30');
pruef('Kaputtes Datum → keine',
  f(erinnerungFuerTermin('16.08.2026', '10:00', jetzt)), 'KEINE');
pruef('Kaputte Uhrzeit → keine',
  f(erinnerungFuerTermin('2026-08-20', 'abends', jetzt)), 'KEINE');


console.log('\n--- Zeitraum eines Termins (für den Gerätekalender) ---');
const z = (e: { date: string; time?: string; endTime?: string }) => {
  const r = zeitraum(e);
  const t = (d: Date) => d.toLocaleString('de-AT', { dateStyle: 'short', timeStyle: 'short' });
  return `${t(r.start)} bis ${t(r.ende)}${r.ganztaegig ? ' (ganztägig)' : ''}`;
};

pruef('ohne Uhrzeit → ganztägig, bis zum Folgetag',
  z({ date: '2026-08-20' }), '20.08.26, 00:00 bis 21.08.26, 00:00 (ganztägig)');
pruef('mit Uhrzeit, ohne Ende → 60 Minuten',
  z({ date: '2026-08-20', time: '14:30' }), '20.08.26, 14:30 bis 20.08.26, 15:30');
pruef('mit Ende → genau so lang',
  z({ date: '2026-08-20', time: '09:00', endTime: '11:45' }), '20.08.26, 09:00 bis 20.08.26, 11:45');
pruef('Ende vor Beginn → geht über Mitternacht',
  z({ date: '2026-08-20', time: '22:00', endTime: '01:30' }), '20.08.26, 22:00 bis 21.08.26, 01:30');
pruef('Ende gleich Beginn → ein voller Tag später, nicht null Minuten',
  z({ date: '2026-08-20', time: '12:00', endTime: '12:00' }), '20.08.26, 12:00 bis 21.08.26, 12:00');
pruef('23:45 ohne Ende → Standarddauer schiebt über Mitternacht',
  z({ date: '2026-08-20', time: '23:45' }), '20.08.26, 23:45 bis 21.08.26, 00:45');

console.log(fehler === 0 ? '\nAlle Prüfungen bestanden.' : `\n${fehler} Prüfung(en) fehlgeschlagen.`);
