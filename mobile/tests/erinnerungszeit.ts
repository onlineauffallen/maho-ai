import { erinnerungFuerTermin, erinnerungFuerWiedervorlage } from '../src/lib/erinnerungsZeit.ts';

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

console.log(fehler === 0 ? '\nAlle Prüfungen bestanden.' : `\n${fehler} Prüfung(en) fehlgeschlagen.`);
