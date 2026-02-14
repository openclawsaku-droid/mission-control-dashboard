"use client";

import { useEffect, useMemo, useState } from "react";

type OutputStatus = "draft" | "review" | "final";
type OutputAction = "review" | "approve" | "feedback" | "read";
type OutputFilter = "ALL" | "ACTION" | "DOCS" | "MEMORY" | "GITHUB" | "SLIDE" | "OTHER";

type OutputItem = {
  id: string;
  title: string;
  type: string;
  url: string;
  summary?: string;
  tags?: string[];
  project?: string;
  status?: OutputStatus;
  action?: OutputAction;
  createdAt: string;
};

const FILTERS: OutputFilter[] = ["ALL", "ACTION", "DOCS", "MEMORY", "GITHUB", "SLIDE", "OTHER"];

const STATUS_CLASSES: Record<OutputStatus, string> = {
  draft: "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-200",
  review: "bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-200",
  final: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200",
};

const TYPE_CLASSES: Record<OutputFilter, string> = {
  ALL: "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200",
  ACTION: "bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-200",
  DOCS: "bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-200",
  MEMORY: "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-200",
  GITHUB: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200",
  SLIDE: "bg-violet-50 text-violet-700 dark:bg-violet-500/15 dark:text-violet-200",
  OTHER: "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200",
};

const ACTION_BADGE: Record<OutputAction, { label: string; className: string }> = {
  review: {
    label: "レビュー依頼",
    className: "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-200",
  },
  approve: {
    label: "承認待ち",
    className: "bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-200",
  },
  feedback: {
    label: "FB募集",
    className: "bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-200",
  },
  read: {
    label: "要確認",
    className: "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-200",
  },
};

function normalizeType(type: string): OutputFilter {
  const value = type.trim().toLowerCase();
  if (value === "google-docs" || value === "docs" || value === "doc") return "DOCS";
  if (value === "memory") return "MEMORY";
  if (value === "github") return "GITHUB";
  if (value === "slide" || value === "slides") return "SLIDE";
  return "OTHER";
}

function normalizeStatus(status?: string): OutputStatus {
  const value = status?.toLowerCase();
  if (value === "draft" || value === "review" || value === "final") {
    return value;
  }
  return "final";
}

function normalizeAction(action?: string): OutputAction | undefined {
  const value = action?.toLowerCase();
  if (value === "review" || value === "approve" || value === "feedback" || value === "read") {
    return value;
  }
  return undefined;
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(date);
}

export default function OutputsView() {
  const [outputs, setOutputs] = useState<OutputItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<OutputFilter>("ALL");

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
          setError(err instanceof Error ? err.message : "Failed to load outputs.");
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

  const filtered = useMemo(() => {
    if (filter === "ALL") return outputs;
    if (filter === "ACTION") return outputs.filter((item) => normalizeAction(item.action));
    return outputs.filter((item) => normalizeType(item.type) === filter);
  }, [outputs, filter]);

  const actionItems = useMemo(
    () => filtered.filter((item) => normalizeAction(item.action)),
    [filtered]
  );

  const groupedByProject = useMemo(() => {
    const groups = new Map<string, OutputItem[]>();

    filtered.forEach((item) => {
      const projectName = item.project?.trim() ? item.project.trim() : "Other";
      const current = groups.get(projectName);
      if (current) {
        current.push(item);
      } else {
        groups.set(projectName, [item]);
      }
    });

    if (groups.has("Other")) {
      const otherItems = groups.get("Other");
      if (otherItems) {
        groups.delete("Other");
        groups.set("Other", otherItems);
      }
    }

    return Array.from(groups.entries());
  }, [filtered]);

  const renderCard = (item: OutputItem) => {
    const type = normalizeType(item.type);
    const status = normalizeStatus(item.status);
    const action = normalizeAction(item.action);
    const isMemory = type === "MEMORY";
    const cardClassName =
      "group relative rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900";

    const content = (
      <>
        <div className="mb-4 flex items-start gap-2">
          <span className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${TYPE_CLASSES[type]}`}>
            {type}
          </span>
          {action ? (
            <span
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${ACTION_BADGE[action].className}`}
            >
              {ACTION_BADGE[action].label}
            </span>
          ) : null}
          <span className={`ml-auto rounded-lg px-2.5 py-1 text-xs font-semibold ${STATUS_CLASSES[status]}`}>
            {status}
          </span>
        </div>

        <h4 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{item.title}</h4>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          {item.summary?.trim() || "No summary provided."}
        </p>

        {isMemory ? (
          <p className="mt-3 rounded-lg border border-indigo-100 bg-indigo-50 px-3 py-2 text-xs font-medium text-indigo-700 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-200">
            このファイルはローカルです。URL遷移はサポートされていません。
          </p>
        ) : null}

        <div className="mt-6 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          {(item.tags ?? []).slice(0, 3).map((tag) => (
            <span
              key={`${item.id}-${tag}`}
              className="rounded-lg bg-slate-100 px-2 py-1 dark:bg-slate-800"
            >
              #{tag}
            </span>
          ))}
          <span>{formatDate(item.createdAt)}</span>
        </div>
      </>
    );

    if (isMemory) {
      return (
        <article key={item.id} className={cardClassName}>
          {content}
        </article>
      );
    }

    return (
      <a
        key={item.id}
        href={item.url}
        target="_blank"
        rel="noreferrer"
        className={cardClassName}
      >
        {content}
      </a>
    );
  };

  return (
    <section className="space-y-8">
      <header className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Outputs</h2>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              {filtered.length} items
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {FILTERS.map((item) => {
              const isActive = item === filter;
              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => setFilter(item)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-200 ${
                    isActive
                      ? "bg-blue-600 text-white"
                      : "border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                  }`}
                >
                  {item}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {loading ? <p className="text-sm text-slate-500 dark:text-slate-400">Loading outputs...</p> : null}
      {error ? <p className="text-sm text-rose-600 dark:text-rose-300">{error}</p> : null}

      {!loading && !error && filtered.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          No outputs found for this filter.
        </p>
      ) : null}

      <div className="space-y-8">
        {actionItems.length > 0 ? (
          <section className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-slate-100">
                <span className="h-2.5 w-2.5 rounded-full bg-rose-500" aria-hidden />
                要対応
              </h3>
              <span className="rounded-lg bg-rose-100 px-2.5 py-1 text-xs font-semibold text-rose-700 dark:bg-rose-500/20 dark:text-rose-200">
                {actionItems.length} items
              </span>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              {actionItems.map((item) => renderCard(item))}
            </div>
          </section>
        ) : null}

        {groupedByProject.map(([projectName, items]) => (
          <section key={projectName} className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{projectName}</h3>
              <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                {items.length} items
              </span>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              {items.map((item) => renderCard(item))}
            </div>
          </section>
        ))}
      </div>
    </section>
  );
}
