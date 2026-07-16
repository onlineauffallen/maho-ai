// src/lib/todoStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type Todo = { id: string; text: string; done: boolean };

type TodoState = {
  todos: Todo[];
  addTodo: (text: string) => Todo;
  toggleDone: (id: string) => void;
  removeTodo: (id: string) => void;
};

export const useTodoStore = create<TodoState>()(
  persist(
    (set) => ({
      todos: [],
      addTodo: (text: string) => {
        const todo: Todo = { id: Date.now().toString(), text, done: false };
        set((s) => ({ todos: [...s.todos, todo] }));
        return todo;
      },
      toggleDone: (id) =>
        set((s) => ({
          todos: s.todos.map((t) => (t.id === id ? { ...t, done: !t.done } : t)),
        })),
      removeTodo: (id) =>
        set((s) => ({ todos: s.todos.filter((t) => t.id !== id) })),
    }),
    { name: 'maho-todos', storage: createJSONStorage(() => localStorage) }
  )
);
