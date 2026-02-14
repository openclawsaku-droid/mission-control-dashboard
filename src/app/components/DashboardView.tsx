"use client";

import { useEffect, useMemo, useState } from "react";

import GlobalSearch from "./GlobalSearch";

type OutputItem = {
  id: string;
  title: string;
  type: string;
  url: string;
  project?: string;
  createdAt: string;
};

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "2-digit",
  }).format(date);
}

export default function DashboardView() {
  const [outputs, setOutputs] = useState<OutputItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/outputs", { cache: "no-store" });
        if (!res.ok) {
          throw new Error(`Request failed with status ${res.status}`);
        }
        const data = (await res.json()) as OutputItem[];
        if (!cancelled) {
          setOutputs(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Failed to load dashboard data."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const totalOutputs = outputs.length;

  const thisWeekCount = useMemo(() => {
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - 7);
    weekStart.setHours(0, 0, 0, 0);

    return outputs.filter((item) => {
      const created = new Date(item.createdAt);
      return !Number.isNaN(created.getTime()) && created >= weekStart;
    }).length;
  }, [outputs]);

  const projectsActive = useMemo(() => {
    return new Set(
      outputs
        .map((item) => item.project?.trim())
        .filter((project): project is string => Boolean(project))
    ).size;
  }, [outputs]);

  const latestOutputs = outputs.slice(0, 3);

  return (
    <section className="space-y-8">
      <header>
        <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
          Dashboard
        </h2>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Overview of outputs and current team momentum.
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-3">
        <article className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <p className="text-sm text-slate-500 dark:text-slate-400">Total Outputs</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">
            {totalOutputs}
          </p>
        </article>
        <article className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <p className="text-sm text-slate-500 dark:text-slate-400">This Week</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">
            {thisWeekCount}
          </p>
        </article>
        <article className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <p className="text-sm text-slate-500 dark:text-slate-400">Projects Active</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">
            {projectsActive}
          </p>
        </article>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Latest Outputs
          </h3>
          <span className="text-sm text-slate-500 dark:text-slate-400">Top 3</span>
        </div>

        {loading ? (
          <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">Loading...</p>
        ) : null}

        {error ? (
          <p className="mt-4 text-sm text-rose-600 dark:text-rose-300">{error}</p>
        ) : null}

        {!loading && !error && latestOutputs.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">No outputs yet.</p>
        ) : null}

        <div className="mt-4 space-y-3">
          {latestOutputs.map((output) => (
            <a
              key={output.id}
              href={output.url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-between rounded-lg border border-slate-200 p-3 text-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm dark:border-slate-700"
            >
              <span className="font-medium text-slate-900 dark:text-slate-100">
                {output.title}
              </span>
              <span className="text-slate-500 dark:text-slate-400">
                {formatDate(output.createdAt)}
              </span>
            </a>
          ))}
        </div>
      </section>

      <GlobalSearch />
    </section>
  );
}
