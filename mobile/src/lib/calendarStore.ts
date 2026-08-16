// src/features/calendar/CalendarStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { appStorage } from './storage';
import { newId, now, today } from '@/lib/ids';

export type CalEvent = {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  time?: string; // HH:MM
  /** ID der Aufgabe, aus der dieser Termin entstanden ist. Gegenstück zu Todo.eventId. */
  todoId?: string;
  createdAt: string;
  updatedAt: string;
};

export type CalendarView = 'day' | 'week' | 'month';

type CalendarState = {
  events: CalEvent[];
  /** Zuletzt gewählte Ansicht. Wird gespeichert, damit sie beim nächsten Start wieder da ist. */
  view: CalendarView;
  /** Aktuell betrachteter Tag. Bewusst NICHT gespeichert: beim Start immer heute. */
  selectedDate: string;
  addEvent: (event: Omit<CalEvent, 'id' | 'createdAt' | 'updatedAt'>) => CalEvent;
  updateEvent: (id: string, patch: Partial<Omit<CalEvent, 'id' | 'createdAt'>>) => void;
  removeEvent: (id: string) => void;
  setView: (view: CalendarView) => void;
  setSelectedDate: (date: string) => void;
};

export const useCalendarStore = create<CalendarState>()(
  persist(
    (set) => ({
      events: [],
      view: 'day',
      selectedDate: today(),

      addEvent: (event) => {
        const stamp = now();
        const ev: CalEvent = { ...event, id: newId(), createdAt: stamp, updatedAt: stamp };
        set((s) => ({ events: [...s.events, ev] }));
        return ev;
      },

      updateEvent: (id, patch) =>
        set((s) => ({
          events: s.events.map((e) => (e.id === id ? { ...e, ...patch, updatedAt: now() } : e)),
        })),

      removeEvent: (id) => set((s) => ({ events: s.events.filter((e) => e.id !== id) })),

      setView: (view) => set({ view }),
      setSelectedDate: (date) => set({ selectedDate: date }),
    }),
    {
      name: 'maho-calendar',
      storage: appStorage,
      version: 1,
      // Das betrachtete Datum bleibt draußen. Sonst landet man nach einer Woche
      // Pause auf einem alten Tag statt auf heute.
      partialize: (s) => ({ events: s.events, view: s.view }),
      migrate: (persisted, version) => {
        const state = persisted as { events?: Partial<CalEvent>[]; view?: CalendarView } | undefined;
        if (!state?.events) return { events: [], view: 'day' } as unknown as CalendarState;
        if (version === 0) {
          const stamp = now();
          return {
            view: 'day',
            events: state.events.map((e) => ({
              id: e.id ?? newId(),
              title: e.title ?? '',
              date: e.date ?? today(),
              time: e.time || undefined,
              createdAt: e.createdAt ?? stamp,
              updatedAt: e.updatedAt ?? stamp,
            })),
          } as unknown as CalendarState;
        }
        return state as unknown as CalendarState;
      },
    }
  )
);

/** Termine eines Tages, nach Uhrzeit sortiert. Einträge ohne Uhrzeit kommen zuerst. */
export function eventsOn(events: CalEvent[], date: string): CalEvent[] {
  return events
    .filter((e) => e.date === date)
    .sort((a, b) => (a.time ?? '').localeCompare(b.time ?? ''));
}

/** Termine in einem Zeitraum, aufsteigend nach Datum und Uhrzeit. */
export function eventsBetween(events: CalEvent[], from: string, to: string): CalEvent[] {
  return events
    .filter((e) => e.date >= from && e.date <= to)
    .sort((a, b) => a.date.localeCompare(b.date) || (a.time ?? '').localeCompare(b.time ?? ''));
}
