"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type Activity = {
  id: string;
  timestamp: string;
  type: "file" | "git" | "task" | "message" | "calendar" | "exec" | string;
  action: string;
  details: string;
};

const FILTERS = ["ALL", "TASK", "FILE", "MESSAGE", "EXEC"] as const;
type ActivityFilter = (typeof FILTERS)[number];

const TYPE_STYLES: Record<
  string,
  { badge: string; ring: string; icon: string }
> = {
  file: {
    badge: "bg-blue-500/10 text-blue-600 dark:text-blue-300",
    ring: "bg-blue-500/10 ring-blue-500/30",
    icon: "text-blue-500 dark:text-blue-300",
  },
  git: {
    badge: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300",
    ring: "bg-emerald-500/10 ring-emerald-500/30",
    icon: "text-emerald-500 dark:text-emerald-300",
  },
  exec: {
    badge: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300",
    ring: "bg-emerald-500/10 ring-emerald-500/30",
    icon: "text-emerald-500 dark:text-emerald-300",
  },
  task: {
    badge: "bg-amber-500/10 text-amber-600 dark:text-amber-300",
    ring: "bg-amber-500/10 ring-amber-500/30",
    icon: "text-amber-500 dark:text-amber-300",
  },
  message: {
    badge: "bg-violet-500/10 text-violet-600 dark:text-violet-300",
    ring: "bg-violet-500/10 ring-violet-500/30",
    icon: "text-violet-500 dark:text-violet-300",
  },
  calendar: {
    badge: "bg-rose-500/10 text-rose-600 dark:text-rose-300",
    ring: "bg-rose-500/10 ring-rose-500/30",
    icon: "text-rose-500 dark:text-rose-300",
  },
  default: {
    badge: "bg-slate-500/10 text-slate-600 dark:text-slate-300",
    ring: "bg-slate-500/10 ring-slate-500/30",
    icon: "text-slate-500 dark:text-slate-300",
  },
};

function normalizeType(type: Activity["type"]) {
  const value = typeof type === "string" ? type.toLowerCase() : "unknown";
  if (value === "task") return "TASK";
  if (value === "file") return "FILE";
  if (value === "message") return "MESSAGE";
  if (value === "exec" || value === "git") return "EXEC";
  return "OTHER";
}

function formatTimestamp(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown time";
  const formatter = new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
  return formatter.format(date);
}

function startOfDay(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

function getDateGroup(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Earlier";
  const today = startOfDay(new Date());
  const target = startOfDay(date);
  const diffDays = Math.round(
    (today.getTime() - target.getTime()) / (24 * 60 * 60 * 1000)
  );
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  return "Earlier";
}

function ActivityIcon({ type }: { type: Activity["type"] }) {
  const normalized = typeof type === "string" ? type.toLowerCase() : "default";
  const classes = TYPE_STYLES[normalized]?.icon ?? TYPE_STYLES.default.icon;
  const common =
    "h-5 w-5 sm:h-6 sm:w-6 stroke-current fill-none stroke-[1.8]";

  switch (normalized) {
    case "file":
      return (
        <svg viewBox="0 0 24 24" className={`${common} ${classes}`}>
          <path d="M7 3h6l4 4v14H7z" />
          <path d="M13 3v5h5" />
        </svg>
      );
    case "git":
    case "exec":
      return (
        <svg viewBox="0 0 24 24" className={`${common} ${classes}`}>
          <circle cx="6" cy="6" r="2.5" />
          <circle cx="18" cy="18" r="2.5" />
          <circle cx="18" cy="6" r="2.5" />
          <path d="M8.5 6h6.5v9" />
        </svg>
      );
    case "task":
      return (
        <svg viewBox="0 0 24 24" className={`${common} ${classes}`}>
          <path d="M6 7h12" />
          <path d="M6 12h12" />
          <path d="M6 17h12" />
          <path d="M4 7l1.5 1.5L8 6" />
        </svg>
      );
    case "message":
      return (
        <svg viewBox="0 0 24 24" className={`${common} ${classes}`}>
          <path d="M5 6h14v9H9l-4 4z" />
        </svg>
      );
    case "calendar":
      return (
        <svg viewBox="0 0 24 24" className={`${common} ${classes}`}>
          <path d="M6 4v3" />
          <path d="M18 4v3" />
          <rect x="4" y="6.5" width="16" height="13.5" rx="2" />
          <path d="M4 10h16" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 24 24" className={`${common} ${classes}`}>
          <circle cx="12" cy="12" r="7" />
          <path d="M12 9v3l2 2" />
        </svg>
      );
  }
}

export default function ActivityFeed() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<ActivityFilter>("ALL");
  const [visibleCount, setVisibleCount] = useState(10);
  const hasLoadedOnce = useRef(false);

  const loadActivities = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/activities", { cache: "no-store" });
      if (!res.ok) {
        throw new Error(`Request failed with status ${res.status}`);
      }
      const data = (await res.json()) as Activity[];
      setActivities(Array.isArray(data) ? data : []);
      hasLoadedOnce.current = true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load activity.");
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadActivities();
    const interval = setInterval(() => {
      loadActivities(true);
    }, 30_000);
    return () => clearInterval(interval);
  }, [loadActivities]);

  useEffect(() => {
    setVisibleCount(10);
  }, [filter]);

  const filteredActivities = useMemo(() => {
    if (filter === "ALL") return activities;
    return activities.filter(
      (activity) => normalizeType(activity.type) === filter
    );
  }, [activities, filter]);

  const visibleActivities = useMemo(
    () => filteredActivities.slice(0, visibleCount),
    [filteredActivities, visibleCount]
  );

  const groupedActivities = useMemo(() => {
    const groups: Record<string, Activity[]> = {
      Today: [],
      Yesterday: [],
      Earlier: [],
    };
    for (const activity of visibleActivities) {
      const group = getDateGroup(activity.timestamp);
      groups[group] = groups[group] ?? [];
      groups[group].push(activity);
    }
    return (["Today", "Yesterday", "Earlier"] as const)
      .map((label) => ({
        label,
        items: groups[label] ?? [],
      }))
      .filter((group) => group.items.length > 0);
  }, [visibleActivities]);

  return (
    <section className="rounded-3xl border border-slate-200/60 bg-white/80 p-6 shadow-[0_10px_30px_rgba(15,23,42,0.08)] backdrop-blur dark:border-slate-800/70 dark:bg-slate-900/70 dark:shadow-[0_18px_40px_rgba(15,23,42,0.6)]">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
            Activity Feed
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Live updates from your workspace.
          </p>
        </div>
        <span className="rounded-full border border-slate-200/70 px-3 py-1 text-xs font-medium text-slate-500 dark:border-slate-800 dark:text-slate-400">
          {filteredActivities.length} events
        </span>
      </header>

      <div className="mt-5 flex flex-wrap gap-2">
        {FILTERS.map((item) => {
          const isActive = filter === item;
          return (
            <button
              key={item}
              type="button"
              onClick={() => setFilter(item)}
              className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide transition ${
                isActive
                  ? "bg-slate-900 text-white shadow-sm dark:bg-slate-100 dark:text-slate-900"
                  : "border border-slate-200/70 text-slate-500 hover:border-slate-300 hover:text-slate-700 dark:border-slate-800 dark:text-slate-400 dark:hover:border-slate-700 dark:hover:text-slate-200"
              }`}
            >
              {item}
            </button>
          );
        })}
      </div>

      <div className="mt-6 space-y-3">
        {loading && !hasLoadedOnce.current ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-4 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-400">
            Loading activity…
          </div>
        ) : null}

        {error ? (
          <div className="rounded-2xl border border-rose-200/60 bg-rose-50/70 p-4 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200">
            {error}
          </div>
        ) : null}

        {!loading && filteredActivities.length === 0 && !error ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-4 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-400">
            No activity yet. New events will show up here.
          </div>
        ) : null}

        {groupedActivities.map((group) => (
          <div key={group.label} className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
              <span className="h-px flex-1 bg-slate-200/70 dark:bg-slate-800/80" />
              <span>{group.label}</span>
              <span className="h-px flex-1 bg-slate-200/70 dark:bg-slate-800/80" />
            </div>
            {group.items.map((activity) => {
              const normalized = activity.type?.toLowerCase?.() ?? "default";
              const styles = TYPE_STYLES[normalized] ?? TYPE_STYLES.default;
              return (
                <article
                  key={activity.id}
                  className="group flex flex-col gap-3 rounded-2xl border border-slate-200/70 bg-white/80 p-4 transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_12px_24px_rgba(15,23,42,0.12)] dark:border-slate-800/80 dark:bg-slate-950/50 dark:hover:border-slate-700"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-2xl ring-1 ${styles.ring}`}
                      >
                        <ActivityIcon type={activity.type} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                          {activity.action}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {formatTimestamp(activity.timestamp)}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${styles.badge}`}
                    >
                      {normalizeType(activity.type) === "OTHER"
                        ? activity.type || "activity"
                        : normalizeType(activity.type)}
                    </span>
                  </div>

                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    {activity.details}
                  </p>
                </article>
              );
            })}
          </div>
        ))}

        {filteredActivities.length > visibleCount ? (
          <button
            type="button"
            onClick={() =>
              setVisibleCount((count) =>
                Math.min(count + 10, filteredActivities.length)
              )
            }
            className="w-full rounded-2xl border border-slate-200/70 bg-white/80 px-4 py-3 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900 dark:border-slate-800/80 dark:bg-slate-950/50 dark:text-slate-300 dark:hover:border-slate-700 dark:hover:text-slate-100"
          >
            Load more
          </button>
        ) : null}
      </div>
    </section>
  );
}
