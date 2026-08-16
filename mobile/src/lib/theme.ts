// src/lib/theme.ts
//
// Gestaltungsrichtung: Fahrplan.
//
// Die Nutzer sind Leute wie Manni, Busfahrer in Graz, der im Test selbst sagte,
// Handys würden ihn verwirren. Für ihn ist eine App kein Werkzeugkasten,
// sondern eine Auskunft: was ist jetzt dran, was kommt als Nächstes. Genau das
// ist eine Abfahrtstafel, und die kennt jeder, ohne sie erklärt zu bekommen.
//
// Daraus kommt alles: das Blau der Emailschilder statt SaaS-Lila, Bernstein wie
// eine Anzeige, kantige Kanten statt Pillen, tabellarische Ziffern, und als
// durchgehendes Motiv die Zeitspalte links mit einer Linie daneben.
//
// Barlow ist dafür die richtige Schrift, sie ist an amerikanischer
// Verkehrsbeschilderung geschult. Semi Condensed trägt Zeiten und Titel,
// die normale Breite den Fließtext.
import { useColorScheme, type TextStyle } from 'react-native';

export type Farben = Record<
  | 'papier' | 'flaeche' | 'tinte' | 'gedaempft' | 'schwach' | 'linie'
  | 'weg' | 'wegSchwach' | 'signal' | 'signalSchwach'
  | 'warnung' | 'gut' | 'gutSchwach' | 'aufDunkel' | 'aufAkzent',
  string
>;

const hell: Farben = {
  /** Grundfläche. Kalkweiß mit einem Hauch Wärme, kein Creme. */
  papier: '#F4F3EF',
  /** Karten und Blasen, die sich abheben sollen. */
  flaeche: '#FFFFFF',
  /** Text und Anker. Tiefes Nachtblau, nie reines Schwarz. */
  tinte: '#10314E',
  /** Zweite Textebene. */
  gedaempft: '#5A7183',
  /** Dritte Ebene, Hilfstexte. */
  schwach: '#93A5B2',
  /** Linien, Raster, Trenner. */
  linie: '#C8C9C0',
  /** Interaktion: Knöpfe, aktive Zustände. */
  weg: '#1D5C86',
  /** Interaktion, flächig hinterlegt. */
  wegSchwach: '#E7EEF3',
  /** Die Anzeige. Nur für Marker, Jetzt und Hervorhebung, nie für Fließtext. */
  signal: '#E39A0C',
  signalSchwach: '#FBF0D9',
  /** Überfällig, Löschen. */
  warnung: '#B3392C',
  /** Erledigt, bestätigt. */
  gut: '#2F6B4F',
  gutSchwach: '#E8F1EB',
  /** Text auf dunklen Flächen. */
  aufDunkel: '#F4F3EF',
  /**
   * Text auf dem Akzentblau. Im Dunkelmodus ist dieses Blau hell, weißer Text
   * darauf wäre schlecht lesbar, deshalb eine eigene Farbe statt einem fest
   * verdrahteten Weiß.
   */
  aufAkzent: '#FFFFFF',
};

const dunkel: Farben = {
  papier: '#0B1F31',
  flaeche: '#12293E',
  tinte: '#EDF1F4',
  gedaempft: '#9DB2C0',
  schwach: '#6C8496',
  linie: '#28455E',
  weg: '#57A6D4',
  wegSchwach: '#16324A',
  signal: '#F0B23F',
  signalSchwach: '#2A2618',
  warnung: '#E2695C',
  gut: '#6BBF92',
  gutSchwach: '#152E27',
  aufDunkel: '#0B1F31',
  aufAkzent: '#08192A',
};

export function useFarben(): Farben {
  return useColorScheme() === 'dark' ? dunkel : hell;
}

/** Für Stellen ohne Hook. Nur für Werte, die in beiden Modi gleich sind. */
export const farben = hell;

export const abstand = { xs: 4, s: 8, m: 12, l: 16, xl: 24, xxl: 40 } as const;

/**
 * Kanten sind schmal. Eine Abfahrtstafel hat keine Pillen, und die runden
 * Kapseln, die jede zweite App benutzt, sind genau der Beliebigkeitseindruck,
 * den diese App nicht haben soll.
 */
export const radius = { s: 3, m: 6, gross: 10, rund: 999 } as const;

export const schriften = {
  titel: 'BarlowSemiCondensed_700Bold',
  halbfett: 'BarlowSemiCondensed_600SemiBold',
  zeit: 'BarlowSemiCondensed_500Medium',
  text: 'Barlow_400Regular',
  textFett: 'Barlow_500Medium',
} as const;

/**
 * Typenskala. Große Grade, weil die Zielgruppe nicht mit der Lupe liest, und
 * ein deutlicher Sprung zwischen den Ebenen statt fünf ähnlicher Größen.
 */
export const schrift: Record<string, TextStyle> = {
  gross: { fontFamily: schriften.titel, fontSize: 30, letterSpacing: -0.3 },
  titel: { fontFamily: schriften.titel, fontSize: 22, letterSpacing: -0.2 },
  abschnitt: { fontFamily: schriften.halbfett, fontSize: 12, letterSpacing: 1.4 },
  zeit: { fontFamily: schriften.zeit, fontSize: 17, fontVariant: ['tabular-nums'] },
  zeitGross: { fontFamily: schriften.titel, fontSize: 21, fontVariant: ['tabular-nums'] },
  normal: { fontFamily: schriften.text, fontSize: 17, lineHeight: 24 },
  betont: { fontFamily: schriften.textFett, fontSize: 17, lineHeight: 24 },
  klein: { fontFamily: schriften.text, fontSize: 14, lineHeight: 19 },
  winzig: { fontFamily: schriften.text, fontSize: 12, lineHeight: 16 },
};

/** Breite der Zeitspalte, dem durchgehenden Strukturelement der App. */
export const ZEITSPALTE = 54;
