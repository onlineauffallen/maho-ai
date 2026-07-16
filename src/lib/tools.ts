// src/lib/tools.ts
// Tool-Definitionen (OpenAI Function Calling) + clientseitige Ausführung
// gegen die App-Stores. Das ist die moderne Version des "Option File"-Konzepts:
// eine maschinenlesbare Beschreibung, welche Aktionen Maho ausführen kann.
import { useCalendarStore } from '@/features/calendar/CalendarStore';
import { useTodoStore } from '@/lib/todoStore';

export const toolDefinitions = [
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
          time: { type: 'string', description: 'Uhrzeit HH:MM (optional)' },
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
        properties: { text: { type: 'string', description: 'Aufgabentext' } },
        required: ['text'],
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
      name: 'list_state',
      description: 'Liest alle aktuellen Termine und Todos (inkl. IDs), z. B. um Fragen zu beantworten oder vor dem Löschen.',
      parameters: { type: 'object', properties: {} },
    },
  },
];

export type ToolAction = { label: string };

/** Führt einen Tool-Call gegen die Stores aus. Gibt Ergebnis (für die KI) und Label (für die UI) zurück. */
export function executeTool(name: string, args: Record<string, unknown>): { result: string; action?: ToolAction } {
  const cal = useCalendarStore.getState();
  const todo = useTodoStore.getState();

  switch (name) {
    case 'create_calendar_event': {
      const ev = cal.addEvent({
        title: String(args.title ?? ''),
        date: String(args.date ?? ''),
        time: args.time ? String(args.time) : undefined,
      });
      return {
        result: `Termin angelegt: ${JSON.stringify(ev)}`,
        action: { label: `📅 Termin angelegt: ${ev.title} am ${ev.date}${ev.time ? ', ' + ev.time : ''}` },
      };
    }
    case 'delete_calendar_event': {
      cal.removeEvent(String(args.id));
      return { result: 'Termin gelöscht.', action: { label: '📅 Termin gelöscht' } };
    }
    case 'add_todo': {
      const t = todo.addTodo(String(args.text ?? ''));
      return { result: `Todo angelegt: ${JSON.stringify(t)}`, action: { label: `📝 Todo angelegt: ${t.text}` } };
    }
    case 'complete_todo': {
      todo.toggleDone(String(args.id));
      return { result: 'Todo-Status geändert.', action: { label: '📝 Todo abgehakt' } };
    }
    case 'delete_todo': {
      todo.removeTodo(String(args.id));
      return { result: 'Todo gelöscht.', action: { label: '📝 Todo gelöscht' } };
    }
    case 'list_state': {
      return {
        result: JSON.stringify({ events: cal.events, todos: todo.todos }),
      };
    }
    default:
      return { result: `Unbekanntes Tool: ${name}` };
  }
}
