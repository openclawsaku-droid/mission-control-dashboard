"use client";

import { useEffect, useState } from "react";

import ActivityFeed from "./components/ActivityFeed";
import GlobalSearch from "./components/GlobalSearch";
import SharedMemo from "./components/SharedMemo";
import SharedTasks from "./components/SharedTasks";
import WeeklyCalendar from "./components/WeeklyCalendar";

const THEME_KEY = "mission-control-theme";

export default function Home() {
  const [isDark, setIsDark] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(THEME_KEY);
    const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)").matches;
    const initial = stored ? stored === "dark" : Boolean(prefersDark);
    setIsDark(initial);
    setHasInitialized(true);
  }, []);

  useEffect(() => {
    if (!hasInitialized) return;
    const root = document.documentElement;
    root.classList.toggle("dark", isDark);
    window.localStorage.setItem(THEME_KEY, isDark ? "dark" : "light");
  }, [hasInitialized, isDark]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-sky-100 text-slate-900 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 dark:text-slate-100">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-10 lg:px-10">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-400 dark:text-slate-500">
              Mission Control
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-slate-900 dark:text-white">
              Mission Control
            </h1>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              Unified visibility into tasks, activity, and system intelligence.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsDark((prev) => !prev)}
            className="flex items-center gap-3 rounded-full border border-slate-200 bg-white/70 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:bg-white dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-200 dark:hover:border-slate-600"
            aria-pressed={isDark}
          >
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-white shadow-sm dark:bg-slate-100 dark:text-slate-900">
              {isDark ? "\u263E" : "\u2600"}
            </span>
            <span className="text-xs uppercase tracking-[0.2em]">
              {isDark ? "Dark" : "Light"} Mode
            </span>
          </button>
        </header>

        <GlobalSearch />

        <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <WeeklyCalendar />
          <ActivityFeed />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <SharedMemo />
          <SharedTasks />
        </div>
      </div>
    </div>
  );
}
