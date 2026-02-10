"use client";

import { useEffect, useMemo, useState } from "react";

import ActivityFeed from "./components/ActivityFeed";
import GlobalSearch from "./components/GlobalSearch";
import SharedMemo from "./components/SharedMemo";
import SharedTasks from "./components/SharedTasks";
import WeeklyCalendar from "./components/WeeklyCalendar";

const THEME_KEY = "mission-control-theme";

const SECTIONS = [
  { id: "dashboard", label: "Dashboard", subtitle: "Overview" },
  { id: "calendar", label: "Calendar", subtitle: "Weekly plan" },
  { id: "activity", label: "Activity", subtitle: "Live feed" },
  { id: "shared", label: "Shared", subtitle: "Team space" },
];

export default function Home() {
  const [isDark, setIsDark] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);
  const [activeSection, setActiveSection] = useState("dashboard");

  const sectionIds = useMemo(() => SECTIONS.map((section) => section.id), []);

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

  useEffect(() => {
    const sectionElements = sectionIds
      .map((id) => document.getElementById(id))
      .filter((section): section is HTMLElement => Boolean(section));

    if (!sectionElements.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)
          .forEach((entry) => {
            if (entry.target instanceof HTMLElement) {
              setActiveSection(entry.target.id);
            }
          });
      },
      {
        rootMargin: "-30% 0px -55% 0px",
        threshold: [0, 0.2, 0.6, 1],
      }
    );

    sectionElements.forEach((section) => observer.observe(section));

    return () => observer.disconnect();
  }, [sectionIds]);

  return (
    <div className="min-h-screen scroll-smooth bg-gradient-to-br from-slate-50 via-slate-100 to-sky-100 text-slate-900 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 dark:text-slate-100">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 py-6 lg:flex-row lg:items-start lg:gap-10 lg:px-10 lg:py-10">
        <nav className="rounded-3xl border border-slate-200/80 bg-white/70 p-4 shadow-sm backdrop-blur lg:sticky lg:top-10 lg:w-56 dark:border-slate-800/80 dark:bg-slate-900/70">
          <div className="flex items-center justify-between lg:flex-col lg:items-start lg:gap-6">
            <div className="hidden lg:block">
              <p className="text-[0.6rem] font-semibold uppercase tracking-[0.35em] text-slate-400 dark:text-slate-500">
                Navigate
              </p>
              <h2 className="mt-2 text-xl font-semibold text-slate-900 dark:text-white">
                Mission Control
              </h2>
            </div>
            <div className="flex w-full flex-1 items-center gap-2 overflow-x-auto lg:flex-col lg:items-stretch lg:gap-1 lg:overflow-visible">
              {SECTIONS.map((section) => {
                const isActive = activeSection === section.id;
                return (
                  <a
                    key={section.id}
                    href={`#${section.id}`}
                    onClick={() => setActiveSection(section.id)}
                    className={`group flex min-w-[140px] flex-1 items-center justify-between gap-3 rounded-2xl border px-3 py-2 text-left text-sm font-semibold transition lg:min-w-0 lg:flex-none lg:px-4 lg:py-3 ${
                      isActive
                        ? "border-slate-900/60 bg-slate-900 text-white shadow-sm dark:border-slate-100/70 dark:bg-white dark:text-slate-900"
                        : "border-transparent text-slate-600 hover:border-slate-300 hover:bg-white/80 dark:text-slate-400 dark:hover:border-slate-700 dark:hover:bg-slate-900/60"
                    }`}
                    aria-current={isActive ? "page" : undefined}
                  >
                    <span>{section.label}</span>
                    <span
                      className={`text-[0.6rem] uppercase tracking-[0.3em] ${
                        isActive
                          ? "text-white/80 dark:text-slate-700"
                          : "text-slate-400 group-hover:text-slate-500 dark:text-slate-600"
                      }`}
                    >
                      {section.subtitle}
                    </span>
                  </a>
                );
              })}
            </div>
          </div>
        </nav>

        <main className="flex min-w-0 flex-1 flex-col gap-8">
          <section id="dashboard" className="scroll-mt-24">
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

            <div className="mt-6">
              <GlobalSearch />
            </div>
          </section>

          <section id="calendar" className="scroll-mt-24">
            <WeeklyCalendar />
          </section>

          <section id="activity" className="scroll-mt-24">
            <ActivityFeed />
          </section>

          <section id="shared" className="scroll-mt-24">
            <div className="grid gap-6 lg:grid-cols-2">
              <SharedMemo />
              <SharedTasks />
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
