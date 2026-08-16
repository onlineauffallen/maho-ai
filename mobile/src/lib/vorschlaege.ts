// src/lib/vorschlaege.ts
// Der Kern dessen, was Maho von einem Chatfenster unterscheidet: er hört im
// Gespräch mit und bietet von selbst an, etwas daraus zu machen.
//
// Wichtig ist die Trennung zwischen Vorschlagen und Tun. Ein Vorschlag legt
// nichts an, er erzeugt eine Karte mit einem Knopf. Erst der Fingertipp führt
// aus, und zwar lokal, ohne weiteren Aufruf beim Anbieter. Ein angenommener
// Vorschlag kostet also nichts extra, und ein abgelehnter kostet einen Tipp
// statt einer getippten Antwort.
import { useCalendarStore } from './calendarStore';
import { useTodoStore } from './todoStore';
import { useFollowupStore } from './followupStore';
import { resolveCategory } from './profileStore';
import { datumLesbar } from './ids';

export type VorschlagsArt = 'termin' | 'aufgabe' | 'wiedervorlage';

export type Vorschlag = {
  id: string;
  art: VorschlagsArt;
  titel: string;
  datum?: string;
  zeit?: string;
  kategorie?: string;
  /** Woran Maho das festgemacht hat, ein halber Satz. */
  anlass?: string;
};

/** Führt einen angenommenen Vorschlag aus. Läuft rein lokal. */
export function vorschlagAusfuehren(v: Vorschlag, datumUeberschreiben?: string): string {
  const datum = datumUeberschreiben ?? v.datum;

  switch (v.art) {
    case 'termin': {
      if (!datum) return 'Ohne Datum geht das nicht.';
      const ev = useCalendarStore.getState().addEvent({
        title: v.titel,
        date: datum,
        time: v.zeit,
      });
      return `Steht am ${ev.date}${ev.time ? ` um ${ev.time}` : ''} im Kalender.`;
    }
    case 'aufgabe': {
      const t = useTodoStore.getState().addTodo({
        text: v.titel,
        category: resolveCategory(v.kategorie),
        due: datum,
      });
      return t.due ? `Steht auf der Liste, fällig ${t.due}.` : 'Steht auf der Liste.';
    }
    case 'wiedervorlage': {
      if (!datum) return 'Ohne Datum geht das nicht.';
      useFollowupStore.getState().add({
        thema: v.titel,
        kontext: v.anlass,
        faelligAm: datum,
      });
      return `Ich komme am ${datum} darauf zurück.`;
    }
  }
}

/** Zeile unter dem Titel, in der Sprache des Nutzers statt in ISO-Daten. */
export function vorschlagBeschriftung(v: Vorschlag): string {
  const wann = v.datum ? datumLesbar(v.datum) : undefined;
  switch (v.art) {
    case 'termin':
      return wann ? `Termin ${wann}${v.zeit ? ` um ${v.zeit}` : ''}` : 'Termin anlegen';
    case 'aufgabe':
      return wann ? `Aufgabe, fällig ${wann}` : 'Auf die Aufgabenliste';
    case 'wiedervorlage':
      return wann ? `Nochmal reden ${wann}` : 'Nochmal darüber reden';
  }
}

export const VORSCHLAG_ZEICHEN: Record<VorschlagsArt, string> = {
  termin: '📅',
  aufgabe: '📝',
  wiedervorlage: '🔔',
};
