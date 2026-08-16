// src/lib/api.ts
import { Platform } from 'react-native';

/**
 * Basisadresse des eigenen Backends.
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
