import { limitPruefen, limitZuruecksetzen } from '../src/server/schutz.ts';

let fehler = 0;
function pruef(name: string, ist: unknown, soll: unknown) {
  const ok = JSON.stringify(ist) === JSON.stringify(soll);
  if (!ok) fehler++;
  console.log(`${ok ? '✓' : '✗'} ${name}${ok ? '' : `\n    ist:  ${JSON.stringify(ist)}\n    soll: ${JSON.stringify(soll)}`}`);
}

const T0 = 1_700_000_000_000;

limitZuruecksetzen();
const erste12 = Array.from({ length: 12 }, () => limitPruefen('a', T0).erlaubt);
pruef('die ersten zwölf gehen durch', erste12.every(Boolean), true);
pruef('die dreizehnte wird abgewiesen', limitPruefen('a', T0).erlaubt, false);

limitZuruecksetzen();
for (let i = 0; i < 12; i++) limitPruefen('a', T0);
pruef('ein anderer Absender ist unberührt', limitPruefen('b', T0).erlaubt, true);

limitZuruecksetzen();
for (let i = 0; i < 12; i++) limitPruefen('a', T0);
pruef('nach 59 Sekunden noch gesperrt', limitPruefen('a', T0 + 59_000).erlaubt, false);
pruef('nach 61 Sekunden wieder frei', limitPruefen('a', T0 + 61_000).erlaubt, true);

limitZuruecksetzen();
// Über den Tag verteilt: jede Minute zwölf, bis das Tageskontingent greift
let letzte = { erlaubt: true } as { erlaubt: boolean };
for (let minute = 0; minute < 40; minute++) {
  for (let i = 0; i < 12; i++) letzte = limitPruefen('c', T0 + minute * 61_000);
}
pruef('das Tageskontingent greift nach 300', letzte.erlaubt, false);

limitZuruecksetzen();
for (let minute = 0; minute < 40; minute++) {
  for (let i = 0; i < 12; i++) limitPruefen('d', T0 + minute * 61_000);
}
pruef('am nächsten Tag wieder frei', limitPruefen('d', T0 + 90_000_000).erlaubt, true);

console.log(fehler === 0 ? '\nAlle Prüfungen bestanden.' : `\n${fehler} Prüfung(en) fehlgeschlagen.`);
