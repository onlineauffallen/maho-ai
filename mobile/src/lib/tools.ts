// src/lib/tools.ts
// Ausführung der Werkzeuge gegen die lokalen Stores.
//
// Die Beschreibungen, WAS Maho tun darf, liegen auf dem Server. Hier steht nur,
// WIE es passiert, und das gehört in die App: Aufgaben, Termine und Profil
// liegen auf dem Gerät, der Server sieht sie nie.
import { useCalendarStore } from '@/lib/calendarStore';
import { terminAnlegen, terminAendern, terminLoeschen } from '@/lib/kalender';
import { useTodoStore } from '@/lib/todoStore';
import { useProfileStore, resolveCategory } from '@/lib/profileStore';
import { useFollowupStore } from '@/lib/followupStore';
import { executeOnboardingTool } from '@/lib/onboardingTools';
import type { Vorschlag, VorschlagsArt } from '@/lib/vorschlaege';
import { alsDatum, newId, today } from '@/lib/ids';

/** Obergrenze für list_state. Das Ergebnis landet im Prompt und kostet pro Runde. */
const LIST_LIMIT = 50;

/**
 * Datum und Uhrzeit werden überall als Zeichenkette verglichen. Ein Termin mit
 * "16.08.2026" oder leerem Datum wäre in jeder Ansicht unsichtbar und ließe
 * sich auch nicht mehr löschen, weil er in keiner Liste auftaucht. Deshalb
 * lieber ablehnen und das Modell nachbessern lassen.
 */
function istDatum(wert: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(wert)) return false;
  const d = new Date(`${wert}T12:00:00`);
  return !Number.isNaN(d.getTime()) && wert === alsDatum(d);
}

function istUhrzeit(wert: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(wert);
}

const FALSCHES_DATUM = (wert: string) =>
  `Ungültiges Datum "${wert}". Erlaubt ist ausschließlich das Format JJJJ-MM-TT, zum Beispiel ${today()}. Rechne relative Angaben wie "morgen" selbst aus und ruf das Werkzeug erneut auf.`;

const FALSCHE_ZEIT = (wert: string) =>
  `Ungültige Uhrzeit "${wert}". Erlaubt ist ausschließlich HH:MM im 24-Stunden-Format, zum Beispiel 09:00 oder 14:30.`;

/**
 * Die Definitionen hängen vom Profil ab (bekannte Kategorien), deshalb eine
 * Funktion und keine Konstante. Ohne die Aufzählung erfindet das Modell bei
 * jedem Aufruf neue Schreibweisen und die Sektionen in der Liste zerfallen.
 */
export type ToolAction = { label: string };

export type ToolErgebnis = {
  result: string;
  action?: ToolAction;
  /** Nur bei "vorschlagen": wird als Karte gezeigt und erst auf Tipp ausgeführt. */
  vorschlag?: Vorschlag;
};

/** Führt einen Tool-Call gegen die Stores aus. Gibt Ergebnis (für die KI) und Label (für die UI) zurück. */
export function executeTool(name: string, args: Record<string, unknown>): ToolErgebnis {
  const cal = useCalendarStore.getState();
  const todo = useTodoStore.getState();

  switch (name) {
    case 'update_profile':
      return executeOnboardingTool(name, args);

    case 'create_calendar_event': {
      const datum = String(args.date ?? '');
      if (!istDatum(datum)) return { result: FALSCHES_DATUM(datum) };
      const zeit = args.time ? String(args.time) : undefined;
      if (zeit && !istUhrzeit(zeit)) return { result: FALSCHE_ZEIT(zeit) };
      const ende = args.endTime ? String(args.endTime) : undefined;
      if (ende && !istUhrzeit(ende)) return { result: FALSCHE_ZEIT(ende) };

      const ev = terminAnlegen({
        title: String(args.title ?? ''),
        date: datum,
        time: zeit,
        endTime: zeit ? ende : undefined,
      });
      return {
        result: `Termin angelegt: ${JSON.stringify(ev)}`,
        action: { label: `📅 Termin angelegt: ${ev.title} am ${ev.date}${ev.time ? ', ' + ev.time : ''}` },
      };
    }
    case 'delete_calendar_event': {
      // Erst prüfen, dann melden. Vorher kam auch bei unbekannter ID ein
      // "Termin gelöscht", und Maho hat dem Nutzer etwas bestätigt, das nie
      // stattgefunden hat.
      const id = String(args.id);
      if (!cal.events.some((e) => e.id === id)) {
        return { result: 'Kein Termin mit dieser ID. Hol dir den aktuellen Stand mit list_state.' };
      }
      terminLoeschen(id);
      return { result: 'Termin gelöscht.', action: { label: '📅 Termin gelöscht' } };
    }
    case 'add_todo': {
      const faellig = args.due ? String(args.due) : undefined;
      if (faellig && !istDatum(faellig)) return { result: FALSCHES_DATUM(faellig) };

      const category = resolveCategory(args.category ? String(args.category) : undefined);
      const t = todo.addTodo({
        text: String(args.text ?? ''),
        category,
        due: faellig,
      });
      const zusatz = [t.category, t.due && `fällig ${t.due}`].filter(Boolean).join(', ');
      return {
        result: `Todo angelegt: ${JSON.stringify(t)}`,
        action: { label: `📝 Todo angelegt: ${t.text}${zusatz ? ` (${zusatz})` : ''}` },
      };
    }
    case 'update_todo': {
      const patch: Record<string, unknown> = {};
      if (args.text !== undefined) patch.text = String(args.text);
      if (args.category !== undefined) patch.category = resolveCategory(String(args.category));
      if (args.due !== undefined) {
        const neu = String(args.due);
        if (neu && !istDatum(neu)) return { result: FALSCHES_DATUM(neu) };
        patch.due = neu || undefined;
      }
      const t = todo.updateTodo(String(args.id), patch);
      if (!t) return { result: 'Keine Aufgabe mit dieser ID gefunden.' };
      return {
        result: `Todo aktualisiert: ${JSON.stringify(t)}`,
        action: { label: `📝 Todo geändert: ${t.text}` },
      };
    }
    case 'schedule_todo': {
      const t = todo.todos.find((x) => x.id === String(args.id));
      if (!t) return { result: 'Keine Aufgabe mit dieser ID gefunden.' };

      const date = args.date ? String(args.date) : t.due;
      if (!date) {
        return {
          result:
            'Diese Aufgabe hat kein Datum. Frag den Nutzer nach einem Datum und ruf schedule_todo mit date erneut auf.',
        };
      }
      if (!istDatum(date)) return { result: FALSCHES_DATUM(date) };
      const zeit = args.time ? String(args.time) : undefined;
      if (zeit && !istUhrzeit(zeit)) return { result: FALSCHE_ZEIT(zeit) };

      // Schon verknüpft: bestehenden Termin verschieben statt einen zweiten anlegen.
      if (t.eventId && cal.events.some((e) => e.id === t.eventId)) {
        // Uhrzeit nur anfassen, wenn eine mitkam. Vorher löschte ein reines
        // "schieb das auf Freitag" die bestehende Uhrzeit, weil time: undefined
        // im Patch den alten Wert überschrieben hat.
        terminAendern(t.eventId, zeit ? { date, time: zeit } : { date });
        todo.updateTodo(t.id, { due: date });
        const alt = cal.events.find((e) => e.id === t.eventId);
        return {
          result: `Termin verschoben auf ${date}${zeit ?? alt?.time ? `, ${zeit ?? alt?.time}` : ''}.`,
          action: { label: `📅 Termin verschoben: ${t.text} am ${date}` },
        };
      }

      const ev = terminAnlegen({ title: t.text, date, time: zeit, todoId: t.id });
      todo.updateTodo(t.id, { eventId: ev.id, due: date });
      return {
        result: `Aufgabe in den Kalender geschickt: ${JSON.stringify(ev)}`,
        action: { label: `📅 In Kalender: ${t.text} am ${date}${ev.time ? ', ' + ev.time : ''}` },
      };
    }
    case 'complete_todo': {
      const t = todo.todos.find((x) => x.id === String(args.id));
      if (!t) return { result: 'Keine Aufgabe mit dieser ID. Hol dir den aktuellen Stand mit list_state.' };
      todo.toggleDone(t.id);
      // Das Tool ist ein Umschalter, also darf das Etikett nicht immer
      // "abgehakt" behaupten.
      const jetztErledigt = !t.done;
      return {
        result: jetztErledigt ? 'Aufgabe abgehakt.' : 'Aufgabe wieder geöffnet.',
        action: { label: jetztErledigt ? `📝 Abgehakt: ${t.text}` : `📝 Wieder offen: ${t.text}` },
      };
    }
    case 'delete_todo': {
      // Hängt ein Termin daran, verschwindet der mit. Sonst bleibt eine Leiche im Kalender.
      const t = todo.todos.find((x) => x.id === String(args.id));
      if (!t) return { result: 'Keine Aufgabe mit dieser ID. Hol dir den aktuellen Stand mit list_state.' };
      if (t.eventId) terminLoeschen(t.eventId);
      todo.removeTodo(t.id);
      return { result: 'Todo gelöscht.', action: { label: `📝 Gelöscht: ${t.text}` } };
    }
    case 'vorschlagen': {
      const art = String(args.art ?? '') as VorschlagsArt;
      if (!['termin', 'aufgabe', 'wiedervorlage'].includes(art)) {
        return { result: 'Ungültige Art. Erlaubt sind termin, aufgabe oder wiedervorlage.' };
      }
      const datum = args.datum ? String(args.datum) : undefined;
      if (datum && !istDatum(datum)) return { result: FALSCHES_DATUM(datum) };
      const zeit = args.zeit ? String(args.zeit) : undefined;
      if (zeit && !istUhrzeit(zeit)) return { result: FALSCHE_ZEIT(zeit) };
      if (art === 'wiedervorlage' && !datum) {
        return { result: 'Eine Wiedervorlage braucht ein Datum. Schlag selbst eines vor.' };
      }

      const vorschlag: Vorschlag = {
        id: newId(),
        art,
        titel: String(args.titel ?? ''),
        datum,
        zeit,
        kategorie: args.kategorie ? String(args.kategorie) : undefined,
        anlass: args.anlass ? String(args.anlass) : undefined,
      };
      // Bewusst kein action-Label: es ist noch nichts passiert.
      return {
        result:
          'Vorschlag wird dem Nutzer als Karte angezeigt. Er entscheidet per Tipp. Sag dazu höchstens einen kurzen Satz und stell keine weitere Frage dazu.',
        vorschlag,
      };
    }
    case 'add_followup': {
      const datum = String(args.datum ?? '');
      if (!istDatum(datum)) return { result: FALSCHES_DATUM(datum) };
      const w = useFollowupStore.getState().add({
        thema: String(args.thema ?? ''),
        kontext: args.kontext ? String(args.kontext) : undefined,
        faelligAm: datum,
      });
      return {
        result: `Wiedervorlage angelegt: ${JSON.stringify(w)}`,
        action: { label: `🔔 Nochmal reden am ${w.faelligAm}: ${w.thema}` },
      };
    }
    case 'list_state': {
      // Nicht der komplette Bestand: das Ergebnis geht als Text zurück ins Modell
      // und wird bei jeder weiteren Runde mitbezahlt. Bei einem Vieljahresnutzer
      // wäre das der teuerste Aufruf der App.
      const heute = today();
      const events = cal.events
        .filter((e) => e.date >= heute)
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(0, LIST_LIMIT);
      const offen = todo.todos.filter((t) => !t.done).slice(0, LIST_LIMIT);
      const erledigt = todo.todos.filter((t) => t.done).length;

      const wiedervorlagen = useFollowupStore
        .getState()
        .wiedervorlagen.filter((w) => !w.angesprochen)
        .slice(0, LIST_LIMIT);

      return {
        result: JSON.stringify({
          heute,
          kategorien: useProfileStore.getState().categories,
          events,
          todos: offen,
          wiedervorlagen,
          hinweis: `Nur offene Aufgaben und Termine ab heute, maximal ${LIST_LIMIT} je Liste. Erledigt: ${erledigt}.`,
        }),
      };
    }
    default:
      return { result: `Unbekanntes Tool: ${name}` };
  }
}
