// src/lib/tools.ts
// Tool-Definitionen (OpenAI Function Calling) + clientseitige Ausführung
// gegen die App-Stores. Das ist die moderne Version des "Option File"-Konzepts:
// eine maschinenlesbare Beschreibung, welche Aktionen Maho ausführen kann.
import { useCalendarStore } from '@/lib/calendarStore';
import { terminAnlegen, terminAendern, terminLoeschen } from '@/lib/kalender';
import { useTodoStore } from '@/lib/todoStore';
import { useProfileStore, resolveCategory, MAX_CATEGORIES } from '@/lib/profileStore';
import { useFollowupStore } from '@/lib/followupStore';
import { profilWerkzeug, executeOnboardingTool } from '@/lib/onboardingTools';
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
export function getToolDefinitions() {
  const { categories } = useProfileStore.getState();
  const known = categories.length
    ? `Bekannte Kategorien: ${categories.join(', ')}. Nimm eine davon, wenn sie passt. Nur wenn wirklich keine passt, eine neue vergeben (maximal ${MAX_CATEGORIES} insgesamt).`
    : 'Es gibt noch keine Kategorien. Vergib eine, wenn der Nutzer erkennbar zwischen Bereichen trennt (z. B. Firmenname oder "Privat").';

  return [
    // Auch im Alltag: erfährt Maho etwas Dauerhaftes über den Nutzer, gehört das
    // ins Profil und nicht ins automatische Gedächtnis, das nach jedem
    // Wortwechsel neu geschrieben wird.
    profilWerkzeug,
    {
      type: 'function',
      function: {
        name: 'create_calendar_event',
        description: 'Legt einen Termin im Kalender des Nutzers an.',
        parameters: {
          type: 'object',
          properties: {
            title: { type: 'string', description: 'Titel des Termins' },
            date: { type: 'string', description: 'Datum im Format YYYY-MM-DD' },
            time: { type: 'string', description: 'Beginn, HH:MM (optional)' },
            endTime: { type: 'string', description: 'Ende, HH:MM. Nur wenn im Gespräch eine Dauer oder ein Ende vorkam.' },
          },
          required: ['title', 'date'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'delete_calendar_event',
        description: 'Löscht einen Termin anhand seiner ID (vorher mit list_state nachsehen).',
        parameters: {
          type: 'object',
          properties: { id: { type: 'string' } },
          required: ['id'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'add_todo',
        description: 'Fügt der Todo-Liste des Nutzers eine Aufgabe hinzu.',
        parameters: {
          type: 'object',
          properties: {
            text: { type: 'string', description: 'Aufgabentext' },
            category: { type: 'string', description: `Bereich der Aufgabe. ${known}` },
            due: { type: 'string', description: 'Fällig bis, Format YYYY-MM-DD (optional)' },
          },
          required: ['text'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'update_todo',
        description:
          'Ändert eine bestehende Aufgabe: Text, Kategorie oder Fälligkeit. ID vorher mit list_state holen.',
        parameters: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            text: { type: 'string' },
            category: { type: 'string', description: known },
            due: { type: 'string', description: 'Fällig bis, YYYY-MM-DD. Leerer String entfernt die Fälligkeit.' },
          },
          required: ['id'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'schedule_todo',
        description:
          'Schickt eine Aufgabe in den Kalender: legt einen Termin an und verknüpft ihn mit der Aufgabe. Die Aufgabe bleibt bestehen.',
        parameters: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'ID der Aufgabe' },
            date: { type: 'string', description: 'YYYY-MM-DD. Ohne Angabe wird die Fälligkeit der Aufgabe genommen.' },
            time: { type: 'string', description: 'HH:MM (optional)' },
          },
          required: ['id'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'complete_todo',
        description: 'Hakt eine Aufgabe ab bzw. macht das Abhaken rückgängig (Toggle).',
        parameters: {
          type: 'object',
          properties: { id: { type: 'string' } },
          required: ['id'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'delete_todo',
        description: 'Löscht eine Aufgabe aus der Todo-Liste.',
        parameters: {
          type: 'object',
          properties: { id: { type: 'string' } },
          required: ['id'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'vorschlagen',
        description:
          'Bietet dem Nutzer an, aus dem Gespräch etwas zu machen. Legt NICHTS an, sondern zeigt ihm eine Karte mit einem Knopf. Genau dafür bist du da: wenn im Gespräch etwas auftaucht, das sonst untergeht, biete es an, statt darauf zu warten, dass er dich darum bittet. Höchstens ein Vorschlag pro Antwort.',
        parameters: {
          type: 'object',
          properties: {
            art: {
              type: 'string',
              enum: ['termin', 'aufgabe', 'wiedervorlage'],
              description:
                'termin: hat einen festen Zeitpunkt. aufgabe: muss erledigt werden, mit oder ohne Frist. wiedervorlage: es gibt nichts zu tun, ihr solltet nur später nochmal darüber reden.',
            },
            titel: { type: 'string', description: 'Kurz und aus Sicht des Nutzers formuliert.' },
            datum: { type: 'string', description: 'JJJJ-MM-TT. Bei Wiedervorlagen dein Vorschlag, wann ihr das Thema nochmal aufgreift.' },
            zeit: { type: 'string', description: 'HH:MM, nur bei Terminen und nur wenn eine Uhrzeit im Gespräch vorkam.' },
            kategorie: { type: 'string', description: `Nur bei Aufgaben. ${known}` },
            anlass: {
              type: 'string',
              description: 'Ein halber Satz, woran du das festmachst, z. B. "Ihr habt über den Steuerberater geredet".',
            },
          },
          required: ['art', 'titel'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'add_followup',
        description:
          'Legt direkt eine Wiedervorlage an, ohne Nachfrage. Nur wenn der Nutzer es ausdrücklich sagt ("erinnere mich in drei Tagen nochmal daran"). Sonst nimm vorschlagen.',
        parameters: {
          type: 'object',
          properties: {
            thema: { type: 'string' },
            datum: { type: 'string', description: 'JJJJ-MM-TT' },
            kontext: { type: 'string', description: 'Ein Satz, damit du das Gespräch später sinnvoll wieder aufnehmen kannst.' },
          },
          required: ['thema', 'datum'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'list_state',
        description:
          'Liest alle aktuellen Termine, Todos (inkl. IDs, Kategorien, Fälligkeiten), offene Wiedervorlagen und die bekannten Kategorien.',
        parameters: { type: 'object', properties: {} },
      },
    },
  ];
}

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
