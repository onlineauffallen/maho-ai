// src/lib/theme.ts
//
// Gestaltungsrichtung: dunkel und warm.
//
// Die Nutzer sind Leute wie Manni, Busfahrer, der abends nach der Schicht und
// der Abendschule draufschaut. Für ihn soll die App nicht nach Formular
// aussehen und nicht blenden: warmes Tiefbraun statt neutralem Schwarz, ein
// einziger Akzent in gedecktem Messing, runde Formen, großzügige Schrift.
//
// Der Grundton ist bewusst warm (#171310 hat einen Rotanteil). Neutrales
// Schwarz mit einem grellen Akzent ist der Standardlook jeder zweiten dunklen
// App, und genau der soll es nicht sein.
//
// Alle Textfarben sind gegen den Grund gerechnet und liegen über 5:1. Der
// schwächste Hilfstext kommt auf 5,76:1. Die Vorgängerfassung hatte Zeiten bei
// 2,13:1, also praktisch unlesbar.
import { type TextStyle } from 'react-native';

export type Farben = Record<
  | 'papier' | 'flaeche' | 'flaecheHoch' | 'tinte' | 'gedaempft' | 'schwach' | 'linie'
  | 'weg' | 'wegSchwach' | 'signal' | 'signalText' | 'signalSchwach' | 'schiene'
  | 'warnung' | 'gut' | 'gutSchwach' | 'aufDunkel' | 'aufAkzent',
  string
>;

/**
 * Dunkel ist der Normalzustand, nicht die Ausnahme. Deshalb steht diese Fassung
 * zuerst und trägt die Gestaltung.
 */
const dunkel: Farben = {
  /** Grundfläche, warmes Tiefbraun. */
  papier: '#171310',
  /** Karten, heben sich eine Spur ab, ohne Rahmen. */
  flaeche: '#221D18',
  /** Eine Ebene höher, etwa Eingabefelder in einer Karte. */
  flaecheHoch: '#2C2620',
  /** Text, warmes Weiß, nie reines Weiß. */
  tinte: '#F6F0E6',
  /** Zweite Ebene: Datum, Zusatz. */
  gedaempft: '#BCAF9E',
  /** Dritte Ebene: Hilfstexte, Platzhalter. */
  schwach: '#9A8E7E',
  /** Trenner und Umrandungen. */
  linie: '#332C25',
  /** Der eine Akzent: gedecktes Messing. Knöpfe, Kanten, Auswahl. */
  weg: '#E0A94A',
  wegSchwach: '#2B231A',
  signal: '#E0A94A',
  /** Der Akzent als Schrift, eine Spur heller. */
  signalText: '#EDBB63',
  signalSchwach: '#2B231A',
  schiene: '#463C31',
  warnung: '#E0705A',
  gut: '#8FBF8A',
  gutSchwach: '#1D251C',
  aufDunkel: '#F6F0E6',
  /** Text auf dem Akzent. Messing ist hell, darauf gehört Dunkel. */
  aufAkzent: '#171310',
};

/**
 * Der helle Modus ist die Übersetzung, nicht das Original: dieselbe Wärme,
 * dieselbe Rolle je Farbe, nur umgedreht.
 */
const hell: Farben = {
  papier: '#F7F2EA',
  flaeche: '#FFFFFF',
  flaecheHoch: '#FFFFFF',
  tinte: '#241C14',
  gedaempft: '#5E5044',
  schwach: '#786959',
  linie: '#E4DACB',
  weg: '#8A5A12',
  wegSchwach: '#F3E7D3',
  signal: '#C08325',
  signalText: '#7A4E0C',
  signalSchwach: '#F7EBD7',
  schiene: '#CFC2AE',
  warnung: '#A63A26',
  gut: '#3F6B3A',
  gutSchwach: '#E9F0E7',
  aufDunkel: '#F7F2EA',
  aufAkzent: '#FFFFFF',
};

/**
 * Dunkel ist gesetzt, nicht abhängig von der Systemeinstellung.
 *
 * Die Gestaltung ist auf diesen Grund hin entworfen, das warme Tiefbraun mit
 * dem Messingakzent IST die App. Ein automatischer Wechsel würde die Identität
 * von der Telefoneinstellung abhängig machen. Der helle Satz bleibt vorbereitet,
 * falls es später eine Wahl in den Einstellungen geben soll.
 */
export function useFarben(): Farben {
  return dunkel;
}

/** Vorbereitet, aber derzeit nicht in Gebrauch. */
export const hellePalette = hell;

/** Für Stellen ohne Hook. */
export const farben = dunkel;

export const abstand = { xs: 4, s: 8, m: 12, l: 16, xl: 24, xxl: 40 } as const;

/** Rund statt kantig. Karten tragen die Gestaltung, keine Haarlinien. */
export const radius = { s: 10, m: 14, gross: 20, rund: 999 } as const;

export const schriften = {
  /** Weiche Serif, sparsam eingesetzt, trägt das Wertige. */
  titel: 'Fraunces_600SemiBold',
  titelFett: 'Fraunces_700Bold',
  /** Rund, offen, große x-Höhe: das hier wird tatsächlich gelesen. */
  text: 'Manrope_400Regular',
  textMittel: 'Manrope_500Medium',
  textFett: 'Manrope_600SemiBold',
  textStark: 'Manrope_700Bold',
} as const;

/**
 * Grundgröße 18 statt 17, mit großzügigem Zeilenabstand. Das wird abends nach
 * der Schicht gelesen, nicht am Schreibtisch.
 */
export const schrift: Record<string, TextStyle> = {
  gross: { fontFamily: schriften.titelFett, fontSize: 32, lineHeight: 38, letterSpacing: -0.4 },
  titel: { fontFamily: schriften.titel, fontSize: 22, lineHeight: 28, letterSpacing: -0.2 },
  abschnitt: { fontFamily: schriften.textFett, fontSize: 13, letterSpacing: 0.8 },
  zeit: { fontFamily: schriften.textFett, fontSize: 16, fontVariant: ['tabular-nums'] },
  zeitGross: { fontFamily: schriften.textStark, fontSize: 20, fontVariant: ['tabular-nums'] },
  normal: { fontFamily: schriften.text, fontSize: 18, lineHeight: 26 },
  betont: { fontFamily: schriften.textFett, fontSize: 18, lineHeight: 26 },
  klein: { fontFamily: schriften.text, fontSize: 15, lineHeight: 21 },
  winzig: { fontFamily: schriften.text, fontSize: 13, lineHeight: 18 },
};

/** Wird nur noch vom Kalender gebraucht, bis der ebenfalls umgestellt ist. */
export const ZEITSPALTE = 54;
