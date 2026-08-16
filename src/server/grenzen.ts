// src/server/grenzen.ts
// Die Grenzen, die Server und App gleichermaßen kennen müssen. Durchgesetzt
// werden sie serverseitig, die App zeigt sie nur an.

export const MAX_PROFILE_CHARS = 1000;
export const MAX_CATEGORIES = 8;
export const MAX_MEMORY_CHARS = 1500;

/** Wie viel Text insgesamt pro Anfrage hereinkommen darf. */
export const MAX_EINGABE_ZEICHEN = 20_000;

/** Wie viele Nachrichten Verlauf höchstens mitgehen. */
export const MAX_VERLAUF = 20;

/** Wie viele Tool-Runden eine Antwort höchstens braucht. */
export const MAX_RUNDEN = 5;
