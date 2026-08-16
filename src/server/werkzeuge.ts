// src/server/werkzeuge.ts
//
// Die Beschreibungen dessen, was Maho tun darf. Sie kommen vom Server, damit
// niemand von außen eigene Werkzeuge unterschieben oder den Katalog aufblähen
// kann. Ausgeführt werden sie weiterhin in der App: dort liegen die Aufgaben,
// Termine und das Profil, der Server sieht sie nie.
import { MAX_PROFILE_CHARS, MAX_CATEGORIES } from './grenzen';

export const profilWerkzeug = {
  type: 'function',
  function: {
    name: 'update_profile',
    description:
      'Speichert, was dauerhaft über den Nutzer gilt: Lebensumstände, Arbeit, Familie, feste Gewohnheiten, Vorlieben im Umgang mit dir. Ruf das auf, sobald du so etwas erfährst, auch mitten im Alltag. Übergib immer den vollständigen neuen Stand, nicht nur die Ergänzung.',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Vorname oder gewünschte Anrede' },
        basics: {
          type: 'string',
          description: `Was den Nutzer ausmacht: Lebensumstände, Arbeit, Familie, Ziele, Gewohnheiten. Stichpunkte, eine Zeile pro Sache, jede kurz. Maximal ${MAX_PROFILE_CHARS} Zeichen, hartes Limit. Keine Termine und keine Aufgaben, die stehen woanders.`,
        },
        categories: {
          type: 'array',
          items: { type: 'string' },
          description: `Lebensbereiche, in denen Aufgaben anfallen, z. B. "Arbeit", "Familie", "Gesundheit" oder ein Firmenname. Lege sie an, sobald ein solcher Bereich erkennbar ist, ohne extra nachzufragen. Maximal ${MAX_CATEGORIES}.`,
        },
      },
    },
  },
} as const;

export function getToolDefinitions(categories: string[]) {
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

export function getOnboardingToolDefinitions() {
  return [
    profilWerkzeug,
    {
      type: 'function',
      function: {
        name: 'finish_onboarding',
        description:
          'Beendet das Kennenlernen. Erst aufrufen, wenn der Name steht und du zu mindestens zwei Themen etwas Konkretes weißt, oder wenn der Nutzer abkürzen möchte.',
        parameters: { type: 'object', properties: {} },
      },
    },
  ];
}
