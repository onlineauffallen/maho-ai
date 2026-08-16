'use client';
import { useMemo, useState } from 'react';
import BubbleNav from '@/features/common/BubbleNav';
import { useTodoStore, type Todo } from '@/lib/todoStore';
import { useCalendarStore } from '@/features/calendar/CalendarStore';
import { useProfileStore, MAX_CATEGORIES } from '@/lib/profileStore';
import { useHydrated } from '@/lib/useHydrated';
import { today } from '@/lib/ids';

const OHNE = 'Ohne Kategorie';

export default function TodoList() {
  const { todos, addTodo, updateTodo, toggleDone, removeTodo } = useTodoStore();
  const { addEvent, updateEvent, removeEvent, events } = useCalendarStore();
  const { categories, addCategory } = useProfileStore();
  const hydrated = useHydrated();

  const [text, setText] = useState('');
  const [category, setCategory] = useState('');
  const [due, setDue] = useState('');
  const [neueKategorie, setNeueKategorie] = useState('');
  // Aufgabe, für die gerade ein Termin gesetzt wird (Aufgabe ohne Fälligkeit).
  const [planeId, setPlaneId] = useState<string | null>(null);
  const [planDatum, setPlanDatum] = useState('');
  const [planZeit, setPlanZeit] = useState('');

  const heute = hydrated ? today() : '';

  function handleAdd() {
    if (!text.trim()) return;
    let kat = category;
    if (category === '__neu__') {
      kat = addCategory(neueKategorie) ?? '';
      setNeueKategorie('');
      setCategory(kat);
    }
    addTodo({ text: text.trim(), category: kat || undefined, due: due || undefined });
    setText('');
    setDue('');
  }

  /** Aufgabe in den Kalender schicken. Die Aufgabe bleibt, der Termin wird nur verknüpft. */
  function inKalender(todo: Todo, datum: string, zeit?: string) {
    if (!datum) return;
    if (todo.eventId && events.some((e) => e.id === todo.eventId)) {
      updateEvent(todo.eventId, { date: datum, time: zeit || undefined });
      updateTodo(todo.id, { due: datum });
    } else {
      const ev = addEvent({ title: todo.text, date: datum, time: zeit || undefined, todoId: todo.id });
      updateTodo(todo.id, { eventId: ev.id, due: datum });
    }
    setPlaneId(null);
    setPlanDatum('');
    setPlanZeit('');
  }

  function loeschen(todo: Todo) {
    // Verknüpfter Termin geht mit, sonst bleibt eine Leiche im Kalender.
    if (todo.eventId) removeEvent(todo.eventId);
    removeTodo(todo.id);
  }

  // Gruppierung nach Kategorie. Reihenfolge der Sektionen folgt dem Profil,
  // damit sie nicht bei jedem neuen Todo herumspringt.
  const gruppen = useMemo(() => {
    const map = new Map<string, Todo[]>();
    for (const k of categories) map.set(k, []);
    for (const t of todos) {
      const key = t.category && categories.includes(t.category) ? t.category : OHNE;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(t);
    }
    // Innerhalb einer Sektion: offene zuerst, dann nach Fälligkeit.
    for (const liste of map.values()) {
      liste.sort((a, b) => {
        if (a.done !== b.done) return a.done ? 1 : -1;
        if (a.due && b.due) return a.due.localeCompare(b.due);
        if (a.due) return -1;
        if (b.due) return 1;
        return a.createdAt.localeCompare(b.createdAt);
      });
    }
    // Leere Sektionen ausblenden, "Ohne Kategorie" ans Ende.
    return [...map.entries()]
      .filter(([, liste]) => liste.length > 0)
      .sort(([a], [b]) => (a === OHNE ? 1 : b === OHNE ? -1 : 0));
  }, [todos, categories]);

  return (
    <div className="flex flex-col items-center min-h-screen bg-white py-8">
      <BubbleNav active="Todo" />
      <div className="w-full max-w-md flex flex-col gap-4 border p-6 rounded-2xl shadow-2xl bg-white">
        <h2 className="text-2xl font-bold">📝 Todo-Liste</h2>

        <div className="flex flex-col gap-2 border-b pb-4">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Neue Aufgabe…"
              value={text}
              onChange={(e) => setText(e.target.value)}
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
          <div className="flex gap-2">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="flex-1 px-2 py-2 border rounded text-sm"
            >
              <option value="">Ohne Kategorie</option>
              {categories.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
              {categories.length < MAX_CATEGORIES && <option value="__neu__">＋ Neue Kategorie</option>}
            </select>
            <input
              type="date"
              value={due}
              onChange={(e) => setDue(e.target.value)}
              className="px-2 py-2 border rounded text-sm"
              title="Fällig bis"
            />
          </div>
          {category === '__neu__' && (
            <input
              type="text"
              placeholder="Name der Kategorie, z. B. Online Auffallen"
              value={neueKategorie}
              onChange={(e) => setNeueKategorie(e.target.value)}
              className="px-3 py-2 border rounded text-sm"
            />
          )}
        </div>

        {hydrated && todos.length === 0 && <p className="text-gray-400">Keine Aufgaben 🎉</p>}

        {gruppen.map(([kategorie, liste]) => (
          <section key={kategorie} className="flex flex-col gap-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              {kategorie}
              <span className="ml-2 font-normal normal-case text-gray-400">
                {liste.filter((t) => !t.done).length} offen
              </span>
            </h3>
            <ul className="space-y-2">
              {liste.map((todo) => {
                const ueberfaellig = !todo.done && todo.due && heute && todo.due < heute;
                const imKalender = !!todo.eventId && events.some((e) => e.id === todo.eventId);
                return (
                  <li key={todo.id} className="flex flex-col gap-1 border-b pb-2 last:border-b-0">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={todo.done}
                        onChange={() => toggleDone(todo.id)}
                      />
                      <span className={todo.done ? 'line-through text-gray-500' : ''}>{todo.text}</span>
                      <div className="ml-auto flex items-center gap-2">
                        <button
                          onClick={() => {
                            if (todo.due) {
                              inKalender(todo, todo.due);
                            } else {
                              setPlaneId(planeId === todo.id ? null : todo.id);
                              setPlanDatum(heute);
                            }
                          }}
                          className={`text-sm ${imKalender ? 'text-green-600' : 'text-gray-500 hover:text-purple-700'}`}
                          title={imKalender ? 'Termin ändern' : 'In den Kalender schicken'}
                        >
                          {imKalender ? '📅 im Kalender' : '📅'}
                        </button>
                        <button
                          onClick={() => loeschen(todo)}
                          className="text-red-500 text-sm"
                          title="Löschen"
                        >
                          ✕
                        </button>
                      </div>
                    </div>

                    {todo.due && (
                      <span
                        className={`text-xs ml-7 ${ueberfaellig ? 'text-red-600 font-medium' : 'text-gray-500'}`}
                      >
                        fällig {todo.due}
                        {ueberfaellig && ' (überfällig)'}
                      </span>
                    )}

                    {planeId === todo.id && (
                      <div className="flex gap-2 ml-7">
                        <input
                          type="date"
                          value={planDatum}
                          onChange={(e) => setPlanDatum(e.target.value)}
                          className="px-2 py-1 border rounded text-sm"
                        />
                        <input
                          type="time"
                          value={planZeit}
                          onChange={(e) => setPlanZeit(e.target.value)}
                          className="px-2 py-1 border rounded text-sm"
                        />
                        <button
                          onClick={() => inKalender(todo, planDatum, planZeit)}
                          className="bg-purple-700 text-white px-3 py-1 rounded text-sm hover:bg-black transition"
                        >
                          Übernehmen
                        </button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
