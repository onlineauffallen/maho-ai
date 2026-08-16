// src/lib/theme.ts
// Bewusst schmal gehalten. Die visuelle Richtung ist noch offen, das hier ist
// nur genug Ordnung, damit nicht in jeder Datei eigene Farbwerte stehen.

export const farben = {
  grund: '#ffffff',
  flaeche: '#f9fafb',
  text: '#111827',
  gedaempft: '#6b7280',
  schwach: '#9ca3af',
  rand: '#e5e7eb',
  akzent: '#6d28d9',
  akzentSchwach: '#f5f3ff',
  gut: '#15803d',
  gutSchwach: '#f0fdf4',
  warnung: '#dc2626',
} as const;

export const abstand = { xs: 4, s: 8, m: 12, l: 16, xl: 24 } as const;

export const radius = { s: 8, m: 12, gross: 20, rund: 999 } as const;

export const schrift = {
  titel: { fontSize: 22, fontWeight: '700' },
  abschnitt: { fontSize: 12, fontWeight: '600', letterSpacing: 0.6 },
  normal: { fontSize: 16 },
  klein: { fontSize: 13 },
} as const;
