"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type OutputStatus = "draft" | "review" | "final";
type OutputType =
  | "google-docs"
  | "memory"
  | "github"
  | "slide"
  | "other"
  | string;

type OutputItem = {
  id: string;
  title: string;
  type: OutputType;
  url: string;
  summary?: string;
  tags?: string[];
  project?: string;
  status?: OutputStatus;
  linearIssueId?: string;
  createdAt: string;
};

const FILTERS = ["ALL", "DOCS", "MEMORY", "GITHUB", "SLIDE", "OTHER"] as const;
type OutputFilter = (typeof FILTERS)[number];

const TYPE_STYLES: Record<
  string,
  { badge: string; ring: string; icon: string; label: string }
> = {
  "google-docs": {
    badge: "bg-blue-500/10 text-blue-600 dark:text-blue-300",
    ring: "bg-blue-500/10 ring-blue-500/30",
    icon: "text-blue-700 dark:text-blue-200",
    label: "Docs",
  },
  memory: {
    badge: "bg-violet-500/10 text-violet-600 dark:text-violet-300",
    ring: "bg-violet-500/10 ring-violet-500/30",
    icon: "text-violet-700 dark:text-violet-200",
    label: "Mem",
  },
  github: {
    badge: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300",
    ring: "bg-emerald-500/10 ring-emerald-500/30",
    icon: "text-emerald-700 dark:text-emerald-200",
    label: "Git",
  },
  slide: {
    badge: "bg-amber-500/10 text-amber-600 dark:text-amber-300",
    ring: "bg-amber-500/10 ring-amber-500/30",
    icon: "text-amber-700 dark:text-amber-200",
    label: "Slide",
  },
  other: {
    badge: "bg-slate-500/10 text-slate-600 dark:text-slate-300",
    ring: "bg-slate-500/10 ring-slate-500/30",
    icon: "text-slate-700 dark:text-slate-200",
    label: "Other",
  },
};

const STATUS_STYLES: Record<OutputStatus, string> = {
  draft: "bg-amber-500/10 text-amber-600 dark:text-amber-300",
  review: "bg-blue-500/10 text-blue-600 dark:text-blue-300",
  final: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300",
};

function normalizeOutputType(type: OutputType): OutputFilter {
  const value = typeof type === "string" ? type.toLowerCase() : "";
  if (value === "google-docs") return "DOCS";
  if (value === "memory") return "MEMORY";
  if (value === "github") return "GITHUB";
  if (value === "slide") return "SLIDE";
  return "OTHER";
}

function normalizeStatus(value: unknown): OutputStatus {
  const status = typeof value === "string" ? value.toLowerCase() : "";
  if (status === "draft" || status === "review" || status === "final") {
    return status;
  }
  return "final";
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

export default function OutputsBoard() {
  const [outputs, setOutputs] = useState<OutputItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<OutputFilter>("ALL");
  const [visibleCount, setVisibleCount] = useState(10);
  const hasLoadedOnce = useRef(false);

  const loadOutputs = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/outputs", { cache: "no-store" });
      if (!res.ok) {
        throw new Error(`Request failed with status ${res.status}`);
      }
      const data = (await res.json()) as OutputItem[];
      setOutputs(Array.isArray(data) ? data : []);
      hasLoadedOnce.current = true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load outputs.");
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOutputs();
    const interval = setInterval(() => {
      loadOutputs(true);
    }, 30_000);
    return () => clearInterval(interval);
  }, [loadOutputs]);

  useEffect(() => {
    setVisibleCount(10);
  }, [filter]);

  const filteredOutputs = useMemo(() => {
    if (filter === "ALL") return outputs;
    return outputs.filter((output) => normalizeOutputType(output.type) === filter);
  }, [outputs, filter]);

  const visibleOutputs = useMemo(
    () => filteredOutputs.slice(0, visibleCount),
    [filteredOutputs, visibleCount]
  );

  const groupedOutputs = useMemo(() => {
    const groups: Record<string, OutputItem[]> = {
      Today: [],
      Yesterday: [],
      Earlier: [],
    };
    for (const output of visibleOutputs) {
      const group = getDateGroup(output.createdAt);
      groups[group] = groups[group] ?? [];
      groups[group].push(output);
    }
    return (["Today", "Yesterday", "Earlier"] as const)
      .map((label) => ({
        label,
        items: groups[label] ?? [],
      }))
      .filter((group) => group.items.length > 0);
  }, [visibleOutputs]);

  return (
    <section className="rounded-3xl border border-slate-200/60 bg-white/80 p-6 shadow-[0_10px_30px_rgba(15,23,42,0.08)] backdrop-blur dark:border-slate-800/70 dark:bg-slate-900/70 dark:shadow-[0_18px_40px_rgba(15,23,42,0.6)]">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
            Outputs
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Deliverables from docs, memories, repos, and slides.
          </p>
        </div>
        <span className="rounded-full border border-slate-200/70 px-3 py-1 text-xs font-medium text-slate-500 dark:border-slate-800 dark:text-slate-400">
          {filteredOutputs.length} items
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
            Loading outputs…
          </div>
        ) : null}

        {error ? (
          <div className="rounded-2xl border border-rose-200/60 bg-rose-50/70 p-4 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200">
            {error}
          </div>
        ) : null}

        {!loading && filteredOutputs.length === 0 && !error ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-4 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-400">
            No outputs yet. Record a deliverable to populate this board.
          </div>
        ) : null}

        {groupedOutputs.map((group) => (
          <div key={group.label} className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
              <span className="h-px flex-1 bg-slate-200/70 dark:bg-slate-800/80" />
              <span>{group.label}</span>
              <span className="h-px flex-1 bg-slate-200/70 dark:bg-slate-800/80" />
            </div>
            {group.items.map((output) => {
              const typeKey =
                typeof output.type === "string" ? output.type.toLowerCase() : "other";
              const typeStyles = TYPE_STYLES[typeKey] ?? TYPE_STYLES.other;
              const status = normalizeStatus(output.status);
              return (
                <article
                  key={output.id}
                  role="link"
                  tabIndex={0}
                  onClick={() => window.open(output.url, "_blank", "noopener,noreferrer")}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      window.open(output.url, "_blank", "noopener,noreferrer");
                    }
                  }}
                  className="group cursor-pointer rounded-2xl border border-slate-200/70 bg-white/80 p-4 transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_12px_24px_rgba(15,23,42,0.12)] dark:border-slate-800/80 dark:bg-slate-950/50 dark:hover:border-slate-700"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ring-1 ${typeStyles.ring}`}
                      >
                        <span className={`text-[0.62rem] font-bold uppercase ${typeStyles.icon}`}>
                          {typeStyles.label}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <a
                          href={output.url}
                          target="_blank"
                          rel="noreferrer noopener"
                          onClick={(event) => event.stopPropagation()}
                          className="line-clamp-1 text-sm font-semibold text-slate-900 underline-offset-4 hover:underline dark:text-slate-100"
                        >
                          {output.title}
                        </a>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                          {formatTimestamp(output.createdAt)}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${STATUS_STYLES[status]}`}
                    >
                      {status}
                    </span>
                  </div>

                  {output.summary ? (
                    <p className="mt-3 line-clamp-3 text-sm text-slate-600 dark:text-slate-300">
                      {output.summary}
                    </p>
                  ) : null}

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {(output.tags ?? []).map((tag) => (
                      <span
                        key={`${output.id}-${tag}`}
                        className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${typeStyles.badge} border-current/20`}
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    {output.project ? (
                      <span className="rounded-full border border-slate-200/70 px-2.5 py-1 dark:border-slate-800">
                        Project: {output.project}
                      </span>
                    ) : null}
                    {output.linearIssueId ? (
                      <span className="rounded-full border border-slate-200/70 px-2.5 py-1 dark:border-slate-800">
                        Linear: {output.linearIssueId}
                      </span>
                    ) : null}
                    <span className={`rounded-full px-2.5 py-1 ${typeStyles.badge}`}>
                      {normalizeOutputType(output.type)}
                    </span>
                  </div>
                </article>
              );
            })}
          </div>
        ))}

        {filteredOutputs.length > visibleCount ? (
          <button
            type="button"
            onClick={() =>
              setVisibleCount((count) => Math.min(count + 10, filteredOutputs.length))
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
