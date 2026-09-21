import { markdownStuecke } from '../src/lib/markdown.ts';

let fehler = 0;
function pruef(name: string, ist: unknown, soll: unknown) {
  const ok = JSON.stringify(ist) === JSON.stringify(soll);
  if (!ok) fehler++;
  console.log(`${ok ? '✓' : '✗'} ${name}${ok ? '' : `\n    ist:  ${JSON.stringify(ist)}\n    soll: ${JSON.stringify(soll)}`}`);
}

pruef('Text ohne Markdown bleibt unverändert', markdownStuecke('Passt, ich trag das ein.'), [{ text: 'Passt, ich trag das ein.' }]);
pruef('fett wird ein eigenes Stück', markdownStuecke('Das ist **wichtig** heute.'), [
  { text: 'Das ist ' },
  { text: 'wichtig', fett: true },
  { text: ' heute.' },
]);
pruef('zwei fette Stellen', markdownStuecke('**A** und **B**'), [
  { text: 'A', fett: true },
  { text: ' und ' },
  { text: 'B', fett: true },
]);
pruef('ungepaarte Sternchen bleiben stehen', markdownStuecke('5 * 3 ** 2'), [{ text: '5 * 3 ** 2' }]);
pruef('Überschrift verliert die Rauten', markdownStuecke('## Plan\nMontag'), [{ text: 'Plan\nMontag' }]);
pruef('Listenpunkte werden zu Punkten', markdownStuecke('- Milch\n* Brot\n+ Butter'), [{ text: '• Milch\n• Brot\n• Butter' }]);
pruef('Code verliert die Backticks', markdownStuecke('Nimm `list_state`.'), [{ text: 'Nimm list_state.' }]);
pruef('ein Bindestrich im Satz ist keine Liste', markdownStuecke('Das ist - naja - okay'), [{ text: 'Das ist - naja - okay' }]);
pruef('Kursiv verliert die Sternchen', markdownStuecke('Das ist *wirklich* so'), [{ text: 'Das ist wirklich so' }]);
pruef('Malzeichen bleibt', markdownStuecke('2 * 3 * 4'), [{ text: '2 * 3 * 4' }]);
pruef('leerer Text', markdownStuecke(''), [{ text: '' }]);

if (fehler) {
  console.error(`${fehler} Fehler`);
  process.exit(1);
}
