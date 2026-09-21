// Lädt die App-Logik in Node, ohne Expo und React Native.
//
// Die Stores und Werkzeuge importieren '@/…' und laden Bibliotheken, die es nur
// auf dem Gerät gibt. Dieser Hook biegt beides um: '@/' zeigt nach src/,
// Importe ohne Endung bekommen '.ts', und die vier Gerätebibliotheken werden
// durch die Attrappen unter tests/stubs ersetzt. Die Logik selbst läuft echt.
import { existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const wurzel = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const attrappen = {
  'react-native': 'tests/stubs/react-native.mjs',
  'expo-calendar': 'tests/stubs/expo-calendar.mjs',
  'expo-crypto': 'tests/stubs/expo-crypto.mjs',
  '@react-native-async-storage/async-storage': 'tests/stubs/async-storage.mjs',
};

export async function resolve(spezifikation, kontext, weiter) {
  if (attrappen[spezifikation]) {
    return { url: pathToFileURL(path.join(wurzel, attrappen[spezifikation])).href, shortCircuit: true };
  }
  let ziel;
  if (spezifikation.startsWith('@/')) ziel = path.join(wurzel, 'src', spezifikation.slice(2));
  else if (spezifikation.startsWith('.') && kontext.parentURL) {
    ziel = path.resolve(path.dirname(fileURLToPath(kontext.parentURL)), spezifikation);
  }
  if (ziel && !path.extname(ziel) && existsSync(`${ziel}.ts`)) {
    return { url: pathToFileURL(`${ziel}.ts`).href, shortCircuit: true };
  }
  if (ziel && spezifikation.startsWith('@/')) return weiter(pathToFileURL(ziel).href, kontext);
  return weiter(spezifikation, kontext);
}
