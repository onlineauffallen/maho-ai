// src/lib/ids.ts
// Eindeutige IDs für alle gespeicherten Objekte.
//
// Vorher stand überall `Date.now().toString()`. Das bricht in zwei Fällen:
// 1. Legt die KI in einer Tool-Runde mehrere Einträge an, laufen die synchron
//    durch und teilen sich dieselbe Millisekunde, also dieselbe ID. Abhaken
//    oder Löschen trifft dann beide.
// 2. Sobald zwei Geräte dieselben Daten synchronisieren, kollidieren IDs, die
//    nur aus einer lokalen Uhrzeit stammen.
//
// React Native hat kein globales crypto wie der Browser, deshalb expo-crypto.
import * as Crypto from 'expo-crypto';

export function newId(): string {
  return Crypto.randomUUID();
}

/** Zeitstempel im ISO-Format, einheitlich für createdAt/updatedAt. */
export function now(): string {
  return new Date().toISOString();
}

/** Heutiges Datum als YYYY-MM-DD in lokaler Zeit (nicht UTC). */
export function today(): string {
  return alsDatum(new Date());
}

/** Date zu YYYY-MM-DD, lokal. */
export function alsDatum(d: Date): string {
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const t = `${d.getDate()}`.padStart(2, '0');
  return `${d.getFullYear()}-${m}-${t}`;
}

/** Datum um Tage verschieben. Mittags gerechnet, damit die Zeitumstellung nicht stört. */
export function plusTage(datum: string, tage: number): string {
  const d = new Date(`${datum}T12:00:00`);
  d.setDate(d.getDate() + tage);
  return alsDatum(d);
}

/** Montag der Woche, in der das Datum liegt. */
export function wochenStart(datum: string): string {
  const d = new Date(`${datum}T12:00:00`);
  const versatz = (d.getDay() + 6) % 7; // Sonntag ist 0, wir wollen Montag als Wochenanfang
  d.setDate(d.getDate() - versatz);
  return alsDatum(d);
}
