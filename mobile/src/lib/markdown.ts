// src/lib/markdown.ts
//
// Der Prompt verbietet Markdown, aber ein Verbot ist eine Bitte. Hält sich das
// Modell nicht daran, soll der Nutzer keine rohen Sternchen und Rauten sehen.
// Unterstützt ist bewusst nur, was im Chat vorkommt: fett, Listenpunkte,
// Überschriften, Kursiv und Code (werden zu normalem Text).
// Tabellen und Links bleiben, wie sie sind.

export type Stueck = { text: string; fett?: boolean };

/** Blockebene: Rauten am Zeilenanfang weg, Listenpunkte werden zu "•". */
function bloecke(text: string): string {
  return text
    .split('\n')
    .map((z) =>
      z
        .replace(/^\s{0,3}#{1,6}\s+/, '')
        .replace(/^(\s*)[-*+]\s+/, '$1• ')
    )
    .join('\n');
}

/** Zerlegt in Stücke mit und ohne Fettdruck. Ungepaarte Sternchen bleiben stehen. */
export function markdownStuecke(roh: string): Stueck[] {
  const text = bloecke(roh)
    .replace(/`([^`\n]+)`/g, '$1')
    .replace(/(?<![*\w])\*(?=\S)([^*\n]+?)(?<=\S)\*(?![*\w])/g, '$1');
  const stuecke: Stueck[] = [];
  const muster = /(\*\*|__)(?=\S)(.+?)(?<=\S)\1/g;
  let ab = 0;
  for (const t of text.matchAll(muster)) {
    if (t.index > ab) stuecke.push({ text: text.slice(ab, t.index) });
    stuecke.push({ text: t[2], fett: true });
    ab = t.index + t[0].length;
  }
  if (ab < text.length) stuecke.push({ text: text.slice(ab) });
  return stuecke.length ? stuecke : [{ text }];
}
