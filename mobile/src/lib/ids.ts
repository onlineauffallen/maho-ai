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

const WOCHENTAG = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];

/**
 * Datum für Menschen: "heute", "morgen" oder "Do, 20.08.".
 * Ein rohes 2026-08-20 in der Oberfläche ist Entwicklerausgabe.
 */
export function datumLesbar(datum: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(datum)) return datum;
  const heute = today();
  if (datum === heute) return 'heute';
  if (datum === plusTage(heute, 1)) return 'morgen';
  if (datum === plusTage(heute, -1)) return 'gestern';

  const d = new Date(`${datum}T12:00:00`);
  const tag = `${d.getDate()}`.padStart(2, '0');
  const monat = `${d.getMonth() + 1}`.padStart(2, '0');
  const jahr = d.getFullYear() === new Date().getFullYear() ? '' : `.${d.getFullYear()}`;
  return `${WOCHENTAG[d.getDay()]}, ${tag}.${monat}.${jahr}`;
}

/** Montag der Woche, in der das Datum liegt. */
export function wochenStart(datum: string): string {
  const d = new Date(`${datum}T12:00:00`);
  const versatz = (d.getDay() + 6) % 7; // Sonntag ist 0, wir wollen Montag als Wochenanfang
  d.setDate(d.getDate() - versatz);
  return alsDatum(d);
}
