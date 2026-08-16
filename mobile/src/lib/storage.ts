// src/lib/storage.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createJSONStorage } from 'zustand/middleware';

/**
 * Persistenz für alle Stores.
 *
 * Anders als localStorage im Browser ist AsyncStorage asynchron: beim ersten
 * Rendern sind die Stores noch leer und füllen sich erst danach. Jeder Screen,
 * der gespeicherte Daten anzeigt, muss das über useHydrated abfangen, sonst
 * blitzt kurz "keine Aufgaben" auf oder ein bestehender Nutzer landet wieder
 * im Kennenlernen.
 *
 * Später ein Kandidat für react-native-mmkv (synchron und schneller), das
 * braucht aber einen Development Build und geht nicht mehr in Expo Go.
 */
export const appStorage = createJSONStorage(() => AsyncStorage);
