// src/lib/todoStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { newId, now } from './ids';

export type Todo = {
  id: string;
  text: string;
  done: boolean;
  /** Kategorie, z. B. eine Firma oder "Privat". Kommt aus den Kategorien im Profil. */
  category?: string;
  /** Fälligkeit als YYYY-MM-DD. Taucht damit auch im Kalender auf. */
  due?: string;
  /** ID des Kalendereintrags, falls die Aufgabe in den Kalender geschickt wurde. */
  eventId?: string;
  createdAt: string;
  updatedAt: string;
};

export type NewTodo = {
  text: string;
  category?: string;
  due?: string;
};

type TodoState = {
  todos: Todo[];
  addTodo: (input: NewTodo | string) => Todo;
  updateTodo: (id: string, patch: Partial<Omit<Todo, 'id' | 'createdAt'>>) => Todo | undefined;
  toggleDone: (id: string) => void;
  removeTodo: (id: string) => void;
};

export const useTodoStore = create<TodoState>()(
  persist(
    (set, get) => ({
      todos: [],

      addTodo: (input) => {
        const data: NewTodo = typeof input === 'string' ? { text: input } : input;
        const stamp = now();
        const todo: Todo = {
          id: newId(),
          text: data.text,
          done: false,
          category: data.category || undefined,
          due: data.due || undefined,
          createdAt: stamp,
          updatedAt: stamp,
        };
        set((s) => ({ todos: [...s.todos, todo] }));
        return todo;
      },

      updateTodo: (id, patch) => {
        set((s) => ({
          todos: s.todos.map((t) => (t.id === id ? { ...t, ...patch, updatedAt: now() } : t)),
        }));
        return get().todos.find((t) => t.id === id);
      },

      toggleDone: (id) =>
        set((s) => ({
          todos: s.todos.map((t) =>
            t.id === id ? { ...t, done: !t.done, updatedAt: now() } : t
          ),
        })),

      removeTodo: (id) => set((s) => ({ todos: s.todos.filter((t) => t.id !== id) })),
    }),
    {
      name: 'maho-todos',
      storage: createJSONStorage(() => localStorage),
      version: 1,
      // v0 kannte nur {id, text, done}. Bestehende Einträge behalten ihre alte ID,
      // bekommen aber die neuen Pflichtfelder, damit die Sortierung nicht bricht.
      migrate: (persisted, version) => {
        const state = persisted as { todos?: Partial<Todo>[] } | undefined;
        if (!state?.todos) return { todos: [] } as unknown as TodoState;
        if (version === 0) {
          const stamp = now();
          return {
            ...state,
            todos: state.todos.map((t) => ({
              id: t.id ?? newId(),
              text: t.text ?? '',
              done: t.done ?? false,
              createdAt: t.createdAt ?? stamp,
              updatedAt: t.updatedAt ?? stamp,
            })),
          } as unknown as TodoState;
        }
        return state as unknown as TodoState;
      },
    }
  )
);

/** Offene Aufgaben mit Fälligkeit an einem bestimmten Tag. Basis für den Kalender-Abgleich. */
export function todosDueOn(todos: Todo[], date: string): Todo[] {
  return todos.filter((t) => !t.done && t.due === date);
}
