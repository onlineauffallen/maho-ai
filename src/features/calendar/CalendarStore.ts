// src/features/calendar/CalendarStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type CalEvent = {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  time?: string;
};

type CalendarState = {
  events: CalEvent[];
  addEvent: (event: Omit<CalEvent, 'id'>) => CalEvent;
  removeEvent: (id: string) => void;
};

export const useCalendarStore = create<CalendarState>()(
  persist(
    (set) => ({
      events: [],
      addEvent: (event) => {
        const ev: CalEvent = { ...event, id: Date.now().toString() };
        set((s) => ({ events: [...s.events, ev] }));
        return ev;
      },
      removeEvent: (id) =>
        set((s) => ({ events: s.events.filter((e) => e.id !== id) })),
    }),
    { name: 'maho-calendar', storage: createJSONStorage(() => localStorage) }
  )
);
