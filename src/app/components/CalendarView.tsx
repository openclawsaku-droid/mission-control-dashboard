"use client";

import WeeklyCalendar from "./WeeklyCalendar";

export default function CalendarView() {
  return (
    <section className="space-y-8">
      <header>
        <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Calendar</h2>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Weekly schedule and task planning.
        </p>
      </header>
      <WeeklyCalendar />
    </section>
  );
}
