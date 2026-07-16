'use client';
import { useState } from 'react';
import BubbleNav from '@/features/common/BubbleNav';
import { useTodoStore } from '@/lib/todoStore';

export default function TodoList() {
  const { todos, addTodo, toggleDone, removeTodo } = useTodoStore();
  const [input, setInput] = useState('');

  const handleAdd = () => {
    if (!input.trim()) return;
    addTodo(input.trim());
    setInput('');
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-white">
      <BubbleNav active="Todo" />
      <div className="w-full max-w-md flex flex-col gap-4 border p-6 rounded-2xl shadow-2xl bg-white">
        <h2 className="text-2xl font-bold mb-4">📝 Todo-Liste</h2>
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            placeholder="Neue Aufgabe..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            className="flex-1 px-3 py-2 border rounded"
          />
          <button
            onClick={handleAdd}
            className="bg-purple-700 text-white px-4 py-2 rounded hover:bg-black transition"
          >
            Hinzufügen
          </button>
        </div>
        <ul className="space-y-2">
          {todos.length === 0 && <li className="text-gray-400">Keine Aufgaben 🎉</li>}
          {todos.map((todo) => (
            <li key={todo.id} className="flex items-center gap-3">
              <input type="checkbox" checked={todo.done} onChange={() => toggleDone(todo.id)} />
              <span className={todo.done ? 'line-through text-gray-500' : ''}>{todo.text}</span>
              <button onClick={() => removeTodo(todo.id)} className="text-red-500 text-sm ml-auto">
                Löschen
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
