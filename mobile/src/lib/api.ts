// src/lib/api.ts
import { Platform } from 'react-native';
import { newId } from './ids';

/**
 * Basisadresse des eigenen Servers.
 *
 * In der App gibt es keine gemeinsame Herkunft mehr wie im Browser, jeder
 * Aufruf braucht eine vollständige Adresse. Auf einem echten Gerät ist
 * "localhost" das Telefon selbst, dort muss die IP des Entwicklungsrechners
 * stehen: EXPO_PUBLIC_API_URL in .env setzen, etwa http://192.168.0.10:3000
 */
const BASIS =
  process.env.EXPO_PUBLIC_API_URL ??
  (Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3000');

export function apiUrl(pfad: string): string {
  return `${BASIS}${pfad}`;
}

export const apiBasis = BASIS;

/**
 * Zugangscode dieser Installation.
 *
 * Für die Beta ein Code pro Tester, gesetzt über EXPO_PUBLIC_MAHO_ZUGANG. Er
 * steckt damit in der App und ist kein echtes Geheimnis, hebt die Hürde aber
 * von "kennt die Adresse" auf "hat die App auseinandergenommen", und ein
 * missbrauchter Code lässt sich einzeln streichen. Ein Kontosystem ersetzt das
 * später an genau dieser Stelle.
 */
const ZUGANG = process.env.EXPO_PUBLIC_MAHO_ZUGANG ?? '';

/**
 * Kennung dieser Installation, nur für die Ratenbegrenzung.
 *
 * Bewusst zufällig und ohne Bezug zum Gerät oder zur Person: der Server soll
 * unterscheiden können, wer wie viel abruft, mehr nicht.
 */
let geraeteId: string | undefined;

function geraet(): string {
  if (!geraeteId) geraeteId = newId();
  return geraeteId;
}

export function zugangsKopf(): Record<string, string> {
  return {
    ...(ZUGANG ? { Authorization: `Bearer ${ZUGANG}` } : {}),
    'X-Maho-Geraet': geraet(),
  };
}
