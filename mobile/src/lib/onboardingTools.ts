// src/lib/onboardingTools.ts
// Werkzeuge für das Kennenlerngespräch. Bewusst getrennt von den Alltags-Tools
// in tools.ts: im Onboarding soll Maho keine Termine anlegen, sondern zuhören
// und das Profil füllen.
import { useProfileStore, MAX_PROFILE_CHARS, MAX_CATEGORIES } from '@/lib/profileStore';
import type { ToolAction } from '@/lib/tools';

export function getOnboardingToolDefinitions() {
  return [
    {
      type: 'function',
      function: {
        name: 'update_profile',
        description:
          'Speichert, was du über den Nutzer gelernt hast. Ruf das laufend auf, nicht erst am Ende. Übergib immer den vollständigen neuen Stand, nicht nur die Ergänzung.',
        parameters: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Vorname oder gewünschte Anrede' },
            basics: {
              type: 'string',
              description: `Was den Nutzer ausmacht: Lebensbereiche, Ziele, Gewohnheiten. Stichpunkte, eine Zeile pro Sache. Maximal ${MAX_PROFILE_CHARS} Zeichen, das ist ein hartes Limit.`,
            },
            categories: {
              type: 'array',
              items: { type: 'string' },
              description: `Bereiche, nach denen der Nutzer seine Aufgaben getrennt haben will, z. B. Firmennamen oder "Privat". Maximal ${MAX_CATEGORIES}.`,
            },
          },
        },
      },
    },
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

export function executeOnboardingTool(
  name: string,
  args: Record<string, unknown>
): { result: string; action?: ToolAction } {
  const profil = useProfileStore.getState();

  switch (name) {
    case 'update_profile': {
      const teile: string[] = [];

      if (typeof args.name === 'string' && args.name.trim()) {
        profil.setName(args.name);
        teile.push(`Name: ${args.name.trim()}`);
      }

      if (typeof args.basics === 'string') {
        const { ok, overflow } = profil.setBasics(args.basics);
        if (!ok) {
          // Nicht still abschneiden. Das Modell soll selbst verdichten, genau
          // dafür ist das Limit da.
          return {
            result: `NICHT gespeichert: der Text ist um ${overflow} Zeichen zu lang (erlaubt sind ${MAX_PROFILE_CHARS}). Verdichte ihn, lass Unwichtiges weg und ruf update_profile erneut auf.`,
          };
        }
        teile.push('Grundeinstellungen aktualisiert');
      }

      if (Array.isArray(args.categories)) {
        const gewuenscht = args.categories.map(String).filter((c) => c.trim());
        // Vorhandene, die nicht mehr genannt werden, fliegen raus. So kann das
        // Modell eine Liste korrigieren, ohne dass Reste stehen bleiben.
        for (const alt of profil.categories) {
          if (!gewuenscht.some((g) => g.toLocaleLowerCase('de') === alt.toLocaleLowerCase('de'))) {
            profil.removeCategory(alt);
          }
        }
        const angelegt: string[] = [];
        for (const k of gewuenscht) {
          const echt = useProfileStore.getState().addCategory(k);
          if (echt) angelegt.push(echt);
        }
        teile.push(`Kategorien: ${angelegt.join(', ') || 'keine'}`);
      }

      const stand = useProfileStore.getState();
      return {
        result: JSON.stringify({
          gespeichert: teile,
          belegt: `${stand.basics.length} von ${MAX_PROFILE_CHARS} Zeichen`,
          kategorien: stand.categories,
        }),
        action: teile.length ? { label: `💾 ${teile.join(' · ')}` } : undefined,
      };
    }

    case 'finish_onboarding': {
      // Kein Namenszwang mehr. Vorher hing hier jeder fest, der seinen Namen
      // nicht nennen wollte: das Tool verweigerte, das Modell fragte erneut,
      // und der Nutzer kam nie in die App, die er gerade geladen hatte.
      //
      // Und nicht onboardingDone setzen, sondern nur die Zusammenfassung
      // freigeben. Sonst leitet die Weiche im Layout mitten in der
      // Agenten-Schleife um und die Abschlussnachricht sieht niemand.
      profil.setSummaryReady(true);
      return {
        result:
          'Kennenlernen beendet. Dem Nutzer wird gleich eine Übersicht des Gemerkten angezeigt, du musst sie nicht wiederholen.',
        action: { label: '✅ Kennenlernen abgeschlossen' },
      };
    }

    default:
      return { result: `Unbekanntes Tool: ${name}` };
  }
}
