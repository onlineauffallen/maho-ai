import { budgetPruefen, budgetZuruecksetzen, einheiten, limitPruefen, limitZuruecksetzen, verbrauchBuchen } from '../src/server/schutz.ts';

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

// Verbrauchsbudget
pruef('Ausgabe zählt vierfach', einheiten({ prompt_tokens: 1000, completion_tokens: 100 }), 1400);
pruef('zwischengespeicherte Eingabe zählt zu einem Zehntel', einheiten({ prompt_tokens: 1000, completion_tokens: 0, prompt_tokens_details: { cached_tokens: 800 } }), 280);
pruef('fehlende Angabe zählt null', einheiten(undefined), 0);
pruef('mehr cached als Eingabe wird gekappt', einheiten({ prompt_tokens: 100, completion_tokens: 0, prompt_tokens_details: { cached_tokens: 900 } }), 10);

budgetZuruecksetzen();
pruef('frischer Code darf', budgetPruefen('e', T0).erlaubt, true);
verbrauchBuchen('e', { prompt_tokens: 300_000, completion_tokens: 25_000 }, T0);
pruef('bei 400.000 Einheiten ist Schluss', budgetPruefen('e', T0 + 1000).erlaubt, false);
pruef('ein anderer Code ist unberührt', budgetPruefen('f', T0 + 1000).erlaubt, true);
pruef('am nächsten Tag wieder frei', budgetPruefen('e', T0 + 90_000_000).erlaubt, true);
verbrauchBuchen('e', { prompt_tokens: 500_000, completion_tokens: 0 }, T0 + 90_000_000);
const gesperrt = budgetPruefen('e', T0 + 90_000_000 + 1000);
pruef('Wartezeit bis Mitternacht UTC ist positiv und unter einem Tag', !gesperrt.erlaubt && gesperrt.sekunden > 0 && gesperrt.sekunden <= 86_400, true);

budgetZuruecksetzen();
for (let i = 0; i < 8; i++) verbrauchBuchen(`n${i}`, { prompt_tokens: 380_000, completion_tokens: 0 }, T0);
pruef('Gesamtbudget sperrt auch einen Code, der selbst noch nichts verbraucht hat', budgetPruefen('neu', T0).erlaubt, false);
budgetZuruecksetzen();

console.log(fehler === 0 ? '\nAlle Prüfungen bestanden.' : `\n${fehler} Prüfung(en) fehlgeschlagen.`);
