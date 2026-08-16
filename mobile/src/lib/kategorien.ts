// src/lib/kategorien.ts
// Kategorien leben im Profil, benutzt werden sie an den Aufgaben. Wer nur das
// Profil ändert, zerreißt die Zuordnung: die Aufgaben behalten den alten Namen
// und fallen wortlos in "Ohne Kategorie". Deshalb gehen Umbenennen und Löschen
// nur über diese beiden Funktionen.
import { useProfileStore } from './profileStore';
import { useTodoStore } from './todoStore';

export function kategorieUmbenennen(alt: string, neu: string) {
  const sauber = neu.trim();
  if (!sauber || sauber === alt) return;

  useProfileStore.getState().renameCategory(alt, sauber);
  const { todos, updateTodo } = useTodoStore.getState();
  for (const t of todos) {
    if (t.category === alt) updateTodo(t.id, { category: sauber });
  }
}

/**
 * Löscht eine Kategorie. Die Aufgaben darunter wandern entweder in eine andere
 * Kategorie oder werden kategorielos, verschwinden aber nie.
 */
export function kategorieLoeschen(name: string, verschiebenNach?: string) {
  useProfileStore.getState().removeCategory(name);
  const { todos, updateTodo } = useTodoStore.getState();
  for (const t of todos) {
    if (t.category === name) updateTodo(t.id, { category: verschiebenNach });
  }
}

/** Wie viele Aufgaben hängen an dieser Kategorie? Für die Rückfrage vor dem Löschen. */
export function aufgabenIn(name: string): number {
  return useTodoStore.getState().todos.filter((t) => t.category === name).length;
}
