"use client";

import { useEffect, useState } from "react";

type ActivityItem = {
  id: string;
  timestamp: string;
  type: string;
  action: string;
  details: string;
};

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function badgeClass(type: string) {
  const value = type.toLowerCase();
  if (value === "task") return "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-200";
  if (value === "file") return "bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-200";
  if (value === "message") return "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-200";
  if (value === "exec" || value === "git") {
    return "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200";
  }
  return "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200";
}

export default function ActivityView() {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/activities", { cache: "no-store" });
        if (!res.ok) {
          throw new Error(`Request failed with status ${res.status}`);
        }
        const data = (await res.json()) as ActivityItem[];
        if (!cancelled) {
          setActivities(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load activity.");
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

  return (
    <section className="space-y-8">
      <header>
        <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Activity</h2>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Recent log and workspace events.
        </p>
      </header>

      {loading ? <p className="text-sm text-slate-500 dark:text-slate-400">Loading activity...</p> : null}
      {error ? <p className="text-sm text-rose-600 dark:text-rose-300">{error}</p> : null}

      {!loading && !error && activities.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">No activity yet.</p>
      ) : null}

      <div className="space-y-3">
        {activities.map((item) => (
          <article
            key={item.id}
            className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className={`rounded-lg px-2 py-1 text-xs font-semibold ${badgeClass(item.type)}`}>
                  {item.type.toUpperCase()}
                </span>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {item.action}
                </h3>
              </div>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {formatDateTime(item.timestamp)}
              </span>
            </div>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{item.details}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
