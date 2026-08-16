// src/lib/vorschlagsChips.ts
//
// Maho hängt an seine Nachricht optional eine Zeile mit kurzen Antwortideen an.
// Das Zerlegen bleibt in der App, weil es reine Darstellung ist. Die Prompts
// selbst liegen inzwischen auf dem Server.

/** Trennt die Antwortvorschläge [[A | B | C]] vom eigentlichen Text. */
export function splitVorschlaege(text: string): { text: string; vorschlaege: string[] } {
  const treffer = text.match(/\[\[([^\]]+)\]\]\s*$/);
  if (!treffer) return { text: text.trim(), vorschlaege: [] };
  return {
    text: text.slice(0, treffer.index).trim(),
    vorschlaege: treffer[1]
      .split('|')
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 3),
  };
}
