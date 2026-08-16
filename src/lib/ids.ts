// src/lib/ids.ts
// Eindeutige IDs für alle gespeicherten Objekte.
//
// Vorher stand überall `Date.now().toString()`. Das bricht in zwei Fällen:
// 1. Legt die KI in einer Tool-Runde mehrere Einträge an, laufen die synchron
//    durch und teilen sich dieselbe Millisekunde, also dieselbe ID. Abhaken
//    oder Löschen trifft dann beide.
// 2. Sobald zwei Geräte dieselben Daten synchronisieren, kollidieren IDs, die
//    nur aus einer lokalen Uhrzeit stammen.
export function newId(): string {
  const c = globalThis.crypto;
  if (typeof c?.randomUUID === 'function') return c.randomUUID();

  // Ältere WebViews kennen randomUUID noch nicht, getRandomValues aber schon.
  if (typeof c?.getRandomValues === 'function') {
    const b = new Uint8Array(16);
    c.getRandomValues(b);
    b[6] = (b[6] & 0x0f) | 0x40; // Version 4
    b[8] = (b[8] & 0x3f) | 0x80; // Variante
    const h = Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
    return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
  }

  // Letzte Rückfallebene, für den Fall dass gar keine Krypto-API da ist.
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Zeitstempel im ISO-Format, einheitlich für createdAt/updatedAt. */
export function now(): string {
  return new Date().toISOString();
}

/** Heutiges Datum als YYYY-MM-DD in lokaler Zeit (nicht UTC). */
export function today(): string {
  const d = new Date();
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const t = `${d.getDate()}`.padStart(2, '0');
  return `${d.getFullYear()}-${m}-${t}`;
}
