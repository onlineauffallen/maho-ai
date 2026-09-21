// Prompt Caching greift nur bei unverändertem Präfix. Dieser Test hält fest,
// dass der feste Teil von Prompt und Werkzeugkatalog nicht von Nutzerdaten,
// Datum oder Wiedervorlagen abhängt.
import { buildSystemPrompt } from '../src/server/prompts.ts';
import { getToolDefinitions } from '../src/server/werkzeuge.ts';

let fehler = 0;
function pruef(name: string, ok: boolean, info = '') {
  if (!ok) fehler++;
  console.log(`${ok ? '✓' : '✗'} ${name}${ok || !info ? '' : `\n    ${info}`}`);
}

const A = buildSystemPrompt({
  profil: { name: 'Anna', basics: '- Lehrerin\n- zwei Kinder', categories: ['Schule', 'Familie'] },
  memory: '- Mag Kaffee',
});
const B = buildSystemPrompt({
  profil: { name: 'Bernd', basics: '', categories: [] },
  memory: '',
  keineVorschlaege: true,
  faellig: [{ thema: 'Steuerberater', kontext: 'Belege', faelligAm: '2026-09-30' }],
});

const marke = '# Aktueller Stand';
const iA = A.indexOf(marke);
const iB = B.indexOf(marke);
pruef('Marke "Aktueller Stand" kommt genau einmal vor', iA > 0 && A.lastIndexOf(marke) === iA && iB > 0);
pruef('Der Teil vor "Aktueller Stand" ist für jeden Nutzer identisch', A.slice(0, iA) === B.slice(0, iB));
pruef('Der feste Teil ist lang genug für den Cache (über 4000 Zeichen)', iA > 4000, `nur ${iA} Zeichen`);
pruef('Nutzerdaten stehen erst hinter der Marke', !A.slice(0, iA).includes('Anna') && !A.slice(0, iA).includes('Kaffee'));
pruef('Das Datum steht erst hinter der Marke', !A.slice(0, iA).includes('Heute ist'));

const T1 = JSON.stringify(getToolDefinitions());
const T2 = JSON.stringify(getToolDefinitions());
pruef('Werkzeugkatalog ist bei jedem Aufruf identisch', T1 === T2);
pruef('Werkzeugkatalog nennt keine Nutzerkategorien', !T1.includes('Schule'));

if (fehler) {
  console.error(`${fehler} Fehler`);
  process.exit(1);
}
