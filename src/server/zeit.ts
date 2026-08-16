// src/server/zeit.ts

/** Heutiges Datum als YYYY-MM-DD in lokaler Zeit des Servers. */
export function today(): string {
  const d = new Date();
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const t = `${d.getDate()}`.padStart(2, '0');
  return `${d.getFullYear()}-${m}-${t}`;
}
