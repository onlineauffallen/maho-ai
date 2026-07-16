'use client';
import { useState } from 'react';
import { useCalendarStore } from './CalendarStore';
import BubbleNav from '@/features/common/BubbleNav';

export default function Calendar() {
  const { events, addEvent, removeEvent } = useCalendarStore();
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!title || !date) return;
    addEvent({ title, date, time });
    setTitle('');
    setDate('');
    setTime('');
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-white">
      <BubbleNav active="Kalender" />
      <div className="w-full max-w-md flex flex-col gap-4 border p-6 rounded-2xl shadow-2xl bg-white">
        <h2 className="text-xl font-bold mb-4">📅 Kalender</h2>
        <form className="flex flex-col gap-2 mb-4" onSubmit={handleAdd}>
          <input
            className="border rounded p-2"
            type="text"
            placeholder="Titel"
            value={title}
            onChange={e => setTitle(e.target.value)}
          />
          <input
            className="border rounded p-2"
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
          />
          <input
            className="border rounded p-2"
            type="time"
            value={time}
            onChange={e => setTime(e.target.value)}
          />
          <button className="bg-purple-700 text-white rounded p-2 hover:bg-black transition" type="submit">
            Termin hinzufügen
          </button>
        </form>
        <div className="space-y-2">
          {events.length === 0 && <p className="text-gray-400">Keine Termine.</p>}
          {events.map(e => (
            <div key={e.id} className="flex items-center justify-between border-b py-1">
              <span>
                {e.date} {e.time && <>{e.time} </>}- {e.title}
              </span>
              <button
                onClick={() => removeEvent(e.id)}
                className="ml-2 text-red-500 hover:underline"
              >
                Löschen
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
