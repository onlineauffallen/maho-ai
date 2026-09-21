import { fensterStart, verlaufsfenster, FENSTER_MIN, FENSTER_SCHRITT } from '../src/lib/verlaufsfenster.ts';

let fehler = 0;
function pruef(name: string, ok: boolean, info = '') {
  if (!ok) fehler++;
  console.log(`${ok ? '✓' : '✗'} ${name}${ok || !info ? '' : `\n    ${info}`}`);
}

pruef('kurzer Verlauf geht vollständig mit', fensterStart(7) === 0 && fensterStart(10) === 0);

let zuWenig = 0;
let zuViel = 0;
for (let n = 1; n <= 300; n++) {
  const menge = verlaufsfenster(Array.from({ length: n }, (_, i) => i)).length;
  if (menge < Math.min(n, FENSTER_MIN)) zuWenig++;
  if (menge > FENSTER_MIN + FENSTER_SCHRITT - 1) zuViel++;
}
pruef('nie weniger als die letzten 10', zuWenig === 0, `${zuWenig} Fälle`);
pruef('nie mehr als 13', zuViel === 0, `${zuViel} Fälle`);

// Der Anfang bleibt über SCHRITT aufeinanderfolgende Längen gleich
const anfaenge = [18, 19, 20, 21].map(fensterStart);
pruef('Anfang bleibt vier Nachrichten lang gleich', new Set(anfaenge).size === 1, JSON.stringify(anfaenge));
pruef('danach rückt er um einen Block vor', fensterStart(22) - fensterStart(21) === FENSTER_SCHRITT);
pruef('die neueste Nachricht ist immer dabei', verlaufsfenster([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]).at(-1) === 12);

if (fehler) {
  console.error(`${fehler} Fehler`);
  process.exit(1);
}
