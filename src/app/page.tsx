"use client";

import { useEffect, useMemo, useState } from "react";

type OutputItem = {
  id: string;
  title: string;
  type: string;
  url: string;
  summary?: string;
  tags?: string[];
  project?: string;
  status?: "draft" | "review" | "final";
  action?: "review" | "approve" | "feedback" | "read";
  createdAt: string;
};

type NextAction = {
  owner: string;
  task: string;
};

type ProjectProgress = {
  done?: string[];
  inProgress?: string[];
  blocked?: string[];
};

type ProjectMeta = {
  description?: string;
  goal?: string;
  status?: string;
  emoji?: string;
  progress?: ProjectProgress;
  nextActions?: NextAction[];
};

type ViewState =
  | { kind: "overview" }
  | { kind: "action-required" }
  | { kind: "my-actions" }
  | { kind: "saku-report" }
  | { kind: "project"; name: string };

const THEME_KEY = "mission-control-theme";

const ACTION_BADGE: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  review: { label: "レビュー依頼", bg: "bg-rose-50 dark:bg-rose-500/10", text: "text-rose-700 dark:text-rose-300", dot: "bg-rose-500" },
  approve: { label: "承認待ち", bg: "bg-orange-50 dark:bg-orange-500/10", text: "text-orange-700 dark:text-orange-300", dot: "bg-orange-500" },
  feedback: { label: "FB募集", bg: "bg-violet-50 dark:bg-violet-500/10", text: "text-violet-700 dark:text-violet-300", dot: "bg-violet-500" },
  read: { label: "要確認", bg: "bg-blue-50 dark:bg-blue-500/10", text: "text-blue-700 dark:text-blue-300", dot: "bg-blue-500" },
};

const STATUS_LABEL: Record<string, string> = { draft: "Draft", review: "Review", final: "Final" };

const EMOJI_MAP: Record<string, string> = {
  rocket: "\u{1F680}",
  target: "\u{1F3AF}",
  seedling: "\u{1F331}",
  zap: "\u{26A1}",
  chart: "\u{1F4CA}",
  book: "\u{1F4DA}",
  gear: "\u{2699}\uFE0F",
  mic: "\u{1F3A4}",
  pickaxe: "\u{26CF}\uFE0F",
};

function formatDate(v: string) {
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("ja-JP", { month: "short", day: "numeric" }).format(d);
}

function OutputCard({ item }: { item: OutputItem }) {
  const isMemory = item.type === "memory";
  const action = item.action && ACTION_BADGE[item.action] ? ACTION_BADGE[item.action] : null;
  const status = item.status || "final";

  const inner = (
    <div className="flex h-full flex-col">
      {action && (
        <div className={`mb-3 flex items-center gap-2 rounded-lg px-3 py-2 ${action.bg}`}>
          <span className={`h-2 w-2 shrink-0 rounded-full ${action.dot}`} />
          <span className={`text-xs font-semibold ${action.text}`}>{action.label}</span>
        </div>
      )}
      <h4 className="text-[15px] font-semibold leading-snug text-slate-900 dark:text-slate-100">
        {item.title}
      </h4>
      {item.summary && (
        <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
          {item.summary}
        </p>
      )}
      <div className="mt-auto flex items-center gap-2 pt-4 text-xs text-slate-400 dark:text-slate-500">
        <span className="rounded bg-slate-100 px-1.5 py-0.5 font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400">
          {STATUS_LABEL[status] || status}
        </span>
        {isMemory && (
          <span className="rounded bg-indigo-50 px-1.5 py-0.5 font-medium text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
            Local
          </span>
        )}
        <span className="ml-auto">{formatDate(item.createdAt)}</span>
      </div>
    </div>
  );

  const cls =
    "group flex flex-col rounded-xl border border-slate-200 bg-white p-5 transition-all duration-150 hover:border-slate-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700";

  if (isMemory) {
    return <article className={cls}>{inner}</article>;
  }
  return (
    <a href={item.url} target="_blank" rel="noreferrer" className={cls}>
      {inner}
    </a>
  );
}

function ProjectOverview({
  projects,
  actionItems,
  projectMeta,
  onSelect,
}: {
  projects: { name: string; items: OutputItem[]; actionCount: number }[];
  actionItems: OutputItem[];
  projectMeta: Record<string, ProjectMeta>;
  onSelect: (v: ViewState) => void;
}) {
  return (
    <div className="space-y-10">
      {/* Action Required Banner */}
      {actionItems.length > 0 && (
        <button
          type="button"
          onClick={() => onSelect({ kind: "action-required" })}
          className="flex w-full items-center gap-4 rounded-xl border border-rose-200 bg-rose-50 p-5 text-left transition-all hover:shadow-md dark:border-rose-500/20 dark:bg-rose-500/5"
        >
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-rose-100 dark:bg-rose-500/20">
            <span className="text-lg font-bold text-rose-600 dark:text-rose-300">{actionItems.length}</span>
          </div>
          <div>
            <p className="text-base font-semibold text-rose-800 dark:text-rose-200">要対応</p>
            <p className="mt-0.5 text-sm text-rose-600 dark:text-rose-400">
              レビュー・承認・確認が必要なアイテムがあります
            </p>
          </div>
          <span className="ml-auto text-rose-400">→</span>
        </button>
      )}

      {/* Project Grid */}
      <div>
        <h2 className="mb-6 text-xl font-semibold text-slate-900 dark:text-slate-100">Projects</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => {
            const meta = projectMeta[p.name];
            const emoji = meta?.emoji ? EMOJI_MAP[meta.emoji] || "" : "";
            return (
              <button
                key={p.name}
                type="button"
                onClick={() => onSelect({ kind: "project", name: p.name })}
                className="flex flex-col rounded-xl border border-slate-200 bg-white p-5 text-left transition-all hover:border-slate-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700"
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                    {emoji && <span className="mr-1.5">{emoji}</span>}
                    {p.name}
                  </h3>
                  {meta?.status && (
                    <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                      {meta.status}
                    </span>
                  )}
                </div>
                {meta?.description && (
                  <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                    {meta.description}
                  </p>
                )}
                {meta?.nextActions && meta.nextActions.length > 0 && (
                  <div className="mt-3 space-y-1">
                    {meta.nextActions.slice(0, 2).map((action, i) => (
                      <div key={i} className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                        <span className={`shrink-0 rounded px-1 py-0.5 text-[10px] font-semibold ${
                          action.owner === "ぷんつく"
                            ? "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400"
                            : "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400"
                        }`}>
                          {action.owner}
                        </span>
                        <span className="truncate">{action.task}</span>
                      </div>
                    ))}
                    {meta.nextActions.length > 2 && (
                      <p className="text-[11px] text-slate-400 dark:text-slate-500">+{meta.nextActions.length - 2} more</p>
                    )}
                  </div>
                )}
                <div className="mt-auto flex items-center gap-3 pt-3 text-xs text-slate-400 dark:text-slate-500">
                  <span>{p.items.length} outputs</span>
                  {p.actionCount > 0 && (
                    <span className="flex items-center gap-1 text-rose-600 dark:text-rose-400">
                      <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                      {p.actionCount} 要対応
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function ProjectDetail({
  name,
  items,
  meta,
}: {
  name: string;
  items: OutputItem[];
  meta?: ProjectMeta;
}) {
  const emoji = meta?.emoji ? EMOJI_MAP[meta.emoji] || "" : "";
  const p = meta?.progress;
  const doneCount = p?.done?.length || 0;
  const ipCount = p?.inProgress?.length || 0;
  const blockedCount = p?.blocked?.length || 0;
  const totalTasks = doneCount + ipCount + blockedCount;
  const progressPct = totalTasks > 0 ? Math.round((doneCount / totalTasks) * 100) : 0;

  // Sort outputs: action items first, then review, then draft, then final
  const statusOrder: Record<string, number> = { review: 0, draft: 1, final: 2 };
  const sortedItems = [...items].sort((a, b) => {
    if (a.action && !b.action) return -1;
    if (!a.action && b.action) return 1;
    return (statusOrder[a.status || "final"] ?? 2) - (statusOrder[b.status || "final"] ?? 2);
  });

  return (
    <div className="space-y-6">
      {/* Project Header */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
            {emoji && <span className="mr-2">{emoji}</span>}
            {name}
          </h2>
          {meta?.status && (
            <span className="shrink-0 rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 dark:bg-blue-500/15 dark:text-blue-300">
              {meta.status}
            </span>
          )}
        </div>
        {meta?.description && (
          <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
            {meta.description}
          </p>
        )}
        {meta?.goal && (
          <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">
            <span className="font-medium text-slate-500 dark:text-slate-400">Goal: </span>
            {meta.goal}
          </p>
        )}
        {/* Progress Bar */}
        {totalTasks > 0 && (
          <div className="mt-4">
            <div className="mb-1.5 flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400">進捗</span>
              <span className="font-medium text-slate-700 dark:text-slate-300">{progressPct}%（{doneCount}/{totalTasks}）</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Status Grid: Blocked + In Progress + Next Actions in columns */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Blocked */}
        <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-4 dark:border-rose-500/20 dark:bg-rose-500/5">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-rose-700 dark:text-rose-300">
            <span className="h-2 w-2 rounded-full bg-rose-500" />
            ブロック中
          </h3>
          {blockedCount > 0 ? (
            <ul className="space-y-2">
              {p?.blocked?.map((item, i) => (
                <li key={i} className="text-sm text-rose-700 dark:text-rose-300">{item}</li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-rose-400 dark:text-rose-500">なし</p>
          )}
        </div>

        {/* In Progress */}
        <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4 dark:border-blue-500/20 dark:bg-blue-500/5">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-blue-700 dark:text-blue-300">
            <span className="h-2 w-2 rounded-full bg-blue-500" />
            進行中
          </h3>
          {ipCount > 0 ? (
            <ul className="space-y-2">
              {p?.inProgress?.map((item, i) => (
                <li key={i} className="text-sm text-blue-700 dark:text-blue-300">{item}</li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-blue-400 dark:text-blue-500">なし</p>
          )}
        </div>

        {/* Next Actions */}
        <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 dark:border-amber-500/20 dark:bg-amber-500/5">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-amber-700 dark:text-amber-300">
            <span className="h-2 w-2 rounded-full bg-amber-500" />
            Next Actions
          </h3>
          {meta?.nextActions && meta.nextActions.length > 0 ? (
            <ul className="space-y-2">
              {meta.nextActions.map((action, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span className={`mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                    action.owner === "ぷんつく"
                      ? "bg-amber-200 text-amber-800 dark:bg-amber-500/20 dark:text-amber-200"
                      : "bg-blue-200 text-blue-800 dark:bg-blue-500/20 dark:text-blue-200"
                  }`}>
                    {action.owner}
                  </span>
                  <span className="text-amber-800 dark:text-amber-200">{action.task}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-amber-400 dark:text-amber-500">なし</p>
          )}
        </div>
      </div>

      {/* Done Items (collapsible summary) */}
      {doneCount > 0 && (
        <details className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 dark:border-emerald-500/20 dark:bg-emerald-500/5">
          <summary className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            完了済み（{doneCount}件）
          </summary>
          <ul className="mt-3 space-y-1.5">
            {p?.done?.map((item, i) => (
              <li key={i} className="text-sm text-emerald-700 dark:text-emerald-300">✓ {item}</li>
            ))}
          </ul>
        </details>
      )}

      {/* Output Cards */}
      <div>
        <h3 className="mb-4 text-sm font-semibold text-slate-700 dark:text-slate-300">
          アウトプット（{items.length}件）
        </h3>
        <div className="grid gap-4 sm:grid-cols-2">
          {sortedItems.map((item) => (
            <OutputCard key={item.id} item={item} />
          ))}
        </div>
      </div>
    </div>
  );
}

function MyActionsView({
  projectMeta,
}: {
  projectMeta: Record<string, ProjectMeta>;
}) {
  const allActions = Object.entries(projectMeta).flatMap(([project, meta]) =>
    (meta.nextActions || [])
      .filter((a) => a.owner === "ぷんつく")
      .map((a) => ({ ...a, project, emoji: meta.emoji ? EMOJI_MAP[meta.emoji] || "" : "" }))
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">ぷんつくのアクション一覧</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          全プロジェクトから集約（{allActions.length}件）
        </p>
      </div>
      <div className="space-y-3">
        {allActions.map((action, i) => (
          <div
            key={i}
            className="flex items-start gap-4 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
          >
            <span className="mt-0.5 shrink-0 text-lg">{action.emoji}</span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{action.task}</p>
              <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">{action.project}</p>
            </div>
          </div>
        ))}
        {allActions.length === 0 && (
          <p className="text-sm text-slate-400">アクションなし、全部さくがやるよ 笑</p>
        )}
      </div>
    </div>
  );
}

type ReportEntry = {
  date: string;
  entries: { time: string; content: string; project?: string }[];
};

function SakuReportView() {
  const [reports, setReports] = useState<ReportEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/reports", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => setReports(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">さくの活動レポート</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            日別の活動ログ（GitHub管理）
          </p>
        </div>
        <a
          href="https://github.com/SakuSakuAICompany/mission-control-reports"
          target="_blank"
          rel="noreferrer"
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition-all hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
        >
          GitHub →
        </a>
      </div>
      {loading ? (
        <p className="text-sm text-slate-400">Loading...</p>
      ) : reports.length === 0 ? (
        <p className="text-sm text-slate-400">レポートはまだありません</p>
      ) : (
        <div className="space-y-6">
          {reports.map((report) => (
            <div key={report.date} className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
              <h3 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-300">{report.date}</h3>
              <div className="space-y-2">
                {report.entries.map((entry, i) => (
                  <div key={i} className="flex items-start gap-3 text-sm">
                    <span className="shrink-0 font-mono text-xs text-slate-400 dark:text-slate-500">{entry.time}</span>
                    <div className="min-w-0">
                      <p className="text-slate-700 dark:text-slate-300">{entry.content}</p>
                      {entry.project && (
                        <span className="mt-0.5 inline-block rounded bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                          {entry.project}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ActionRequiredView({ items }: { items: OutputItem[] }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">要対応</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          レビュー・承認・確認が必要なアイテム（{items.length}件）
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {items.map((item) => (
          <OutputCard key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}

export default function Home() {
  const [outputs, setOutputs] = useState<OutputItem[]>([]);
  const [projectMeta, setProjectMeta] = useState<Record<string, ProjectMeta>>({});
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<ViewState>({ kind: "overview" });
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(THEME_KEY);
    if (stored === "dark") {
      const frame = window.requestAnimationFrame(() => setIsDark(true));
      return () => window.cancelAnimationFrame(frame);
    }
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
    window.localStorage.setItem(THEME_KEY, isDark ? "dark" : "light");
  }, [isDark]);

  useEffect(() => {
    Promise.all([
      fetch("/api/outputs", { cache: "no-store" }).then((r) => r.json()),
      fetch("/api/projects", { cache: "no-store" }).then((r) => r.json()).catch(() => ({})),
    ])
      .then(([outputsData, projectsData]) => {
        setOutputs(Array.isArray(outputsData) ? outputsData : []);
        setProjectMeta(projectsData || {});
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const actionItems = useMemo(
    () => outputs.filter((o) => o.action && ACTION_BADGE[o.action]),
    [outputs]
  );

  const projects = useMemo(() => {
    const map = new Map<string, OutputItem[]>();
    for (const o of outputs) {
      const name = o.project?.trim() || "Other";
      const list = map.get(name);
      if (list) list.push(o);
      else map.set(name, [o]);
    }
    return Array.from(map.entries())
      .map(([name, items]) => ({
        name,
        items,
        actionCount: items.filter((i) => i.action && ACTION_BADGE[i.action]).length,
      }))
      .sort((a, b) => {
        // Action items first, then by count
        if (a.actionCount !== b.actionCount) return b.actionCount - a.actionCount;
        return b.items.length - a.items.length;
      });
  }, [outputs]);

  const breadcrumb =
    view.kind === "project"
      ? view.name
      : view.kind === "action-required"
        ? "要対応"
        : view.kind === "my-actions"
          ? "My Actions"
          : view.kind === "saku-report"
            ? "さくレポート"
            : null;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="flex min-h-screen flex-col md:flex-row">
        {/* Sidebar */}
        <aside className="w-full shrink-0 border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950 md:w-[220px] md:border-b-0 md:border-r">
          <div className="p-5">
            <button
              type="button"
              onClick={() => setView({ kind: "overview" })}
              className="text-left"
            >
              <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
                Mission Control
              </p>
              <h1 className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-100">
                Projects
              </h1>
            </button>
          </div>

          <nav className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-col md:overflow-visible md:px-3 md:pb-5">
            {/* Action Required */}
            {actionItems.length > 0 && (
              <button
                type="button"
                onClick={() => setView({ kind: "action-required" })}
                className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-all md:w-full ${
                  view.kind === "action-required"
                    ? "bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300"
                    : "text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10"
                }`}
              >
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white">
                  {actionItems.length}
                </span>
                <span className="font-medium">要対応</span>
              </button>
            )}

            {/* My Actions */}
            <button
              type="button"
              onClick={() => setView({ kind: "my-actions" })}
              className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-all md:w-full ${
                view.kind === "my-actions"
                  ? "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300"
                  : "text-amber-600 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-500/10"
              }`}
            >
              <span className="font-medium">My Actions</span>
            </button>

            {/* Saku Report */}
            <button
              type="button"
              onClick={() => setView({ kind: "saku-report" })}
              className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-all md:w-full ${
                view.kind === "saku-report"
                  ? "bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-200"
                  : "text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-500/10"
              }`}
            >
              <span className="font-medium">さくレポート</span>
            </button>

            <div className="mx-2 hidden border-t border-slate-100 dark:border-slate-800 md:my-2 md:block" />

            {/* Project List */}
            {projects.map((p) => (
              <button
                key={p.name}
                type="button"
                onClick={() => setView({ kind: "project", name: p.name })}
                className={`flex shrink-0 items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-all md:w-full ${
                  view.kind === "project" && view.name === p.name
                    ? "bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-200"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                }`}
              >
                <span className="truncate">{p.name}</span>
                <span className="ml-2 flex items-center gap-1.5">
                  {p.actionCount > 0 && (
                    <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                  )}
                  <span className="text-xs text-slate-400 dark:text-slate-500">{p.items.length}</span>
                </span>
              </button>
            ))}
          </nav>
        </aside>

        {/* Main */}
        <main className="min-w-0 flex-1 p-6 md:p-10">
          <header className="mb-8 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-slate-400 dark:text-slate-500">
              <button
                type="button"
                onClick={() => setView({ kind: "overview" })}
                className="hover:text-slate-600 dark:hover:text-slate-300"
              >
                Projects
              </button>
              {breadcrumb && (
                <>
                  <span>/</span>
                  <span className="text-slate-700 dark:text-slate-200">{breadcrumb}</span>
                </>
              )}
            </div>
            <button
              type="button"
              onClick={() => setIsDark((prev) => !prev)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600 transition-all hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
            >
              {isDark ? "Dark" : "Light"}
            </button>
          </header>

          {loading ? (
            <p className="text-sm text-slate-400">Loading...</p>
          ) : view.kind === "overview" ? (
            <ProjectOverview
              projects={projects}
              actionItems={actionItems}
              projectMeta={projectMeta}
              onSelect={setView}
            />
          ) : view.kind === "action-required" ? (
            <ActionRequiredView items={actionItems} />
          ) : view.kind === "my-actions" ? (
            <MyActionsView projectMeta={projectMeta} />
          ) : view.kind === "saku-report" ? (
            <SakuReportView />
          ) : (
            <ProjectDetail
              name={view.name}
              items={projects.find((p) => p.name === view.name)?.items || []}
              meta={projectMeta[view.name]}
            />
          )}
        </main>
      </div>
    </div>
  );
}
