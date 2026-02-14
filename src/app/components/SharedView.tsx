"use client";

import SharedMemo from "./SharedMemo";
import SharedTasks from "./SharedTasks";

export default function SharedView() {
  return (
    <section className="space-y-8">
      <header>
        <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Shared</h2>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Shared notes and tasks for the team.
        </p>
      </header>
      <div className="grid gap-6 xl:grid-cols-2">
        <SharedMemo />
        <SharedTasks />
      </div>
    </section>
  );
}
