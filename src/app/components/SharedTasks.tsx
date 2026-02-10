"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";

type SharedTask = {
  id: string;
  owner: string;
  title: string;
  priority: string;
  dueDate: string;
  completed: boolean;
};

const PRIORITY_STYLES: Record<string, { badge: string; text: string }> = {
  high: {
    badge:
      "bg-rose-500/10 text-rose-700 ring-1 ring-rose-200/80 dark:bg-rose-500/10 dark:text-rose-200 dark:ring-rose-500/30",
    text: "text-rose-700 dark:text-rose-300",
  },
  medium: {
    badge:
      "bg-amber-500/10 text-amber-700 ring-1 ring-amber-200/80 dark:bg-amber-500/10 dark:text-amber-200 dark:ring-amber-500/30",
    text: "text-amber-700 dark:text-amber-300",
  },
  low: {
    badge:
      "bg-slate-500/10 text-slate-700 ring-1 ring-slate-200/80 dark:bg-slate-500/10 dark:text-slate-300 dark:ring-slate-500/30",
    text: "text-slate-600 dark:text-slate-400",
  },
  default: {
    badge:
      "bg-slate-500/10 text-slate-600 ring-1 ring-slate-200/80 dark:bg-slate-500/10 dark:text-slate-300 dark:ring-slate-500/30",
    text: "text-slate-600 dark:text-slate-400",
  },
};

const OWNER_ORDER = ["さく", "ぷんつく"];

function formatDueDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "期限未設定";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "2-digit",
  }).format(date);
}

function isOverdue(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date.getTime() < today.getTime();
}

export default function SharedTasks() {
  const [tasks, setTasks] = useState<SharedTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasLoadedOnce = useRef(false);
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState("medium");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadTasks = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/shared-tasks", { cache: "no-store" });
      if (!res.ok) {
        throw new Error(`Request failed with status ${res.status}`);
      }
      const data = (await res.json()) as SharedTask[];
      setTasks(Array.isArray(data) ? data : []);
      hasLoadedOnce.current = true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "共有タスクの取得に失敗しました。");
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTasks();
    const interval = setInterval(() => {
      loadTasks(true);
    }, 30_000);
    return () => clearInterval(interval);
  }, [loadTasks]);

  const groupedTasks = useMemo(() => {
    const map = new Map<string, SharedTask[]>();
    tasks.forEach((task) => {
      const key = task.owner || "未設定";
      if (!map.has(key)) map.set(key, []);
      map.get(key)?.push(task);
    });
    for (const list of map.values()) {
      list.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
    }
    return OWNER_ORDER.map((owner) => ({
      owner,
      items: map.get(owner) ?? [],
    })).filter((group) => group.items.length > 0);
  }, [tasks]);

  const remainingCount = useMemo(
    () => tasks.filter((task) => !task.completed).length,
    [tasks]
  );

  const toggleComplete = async (task: SharedTask) => {
    const nextCompleted = !task.completed;
    setTasks((prev) =>
      prev.map((item) =>
        item.id === task.id ? { ...item, completed: nextCompleted } : item
      )
    );

    try {
      const res = await fetch("/api/shared-tasks", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: task.id, completed: nextCompleted }),
      });
      if (!res.ok) {
        throw new Error(`Request failed with status ${res.status}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "更新に失敗しました。");
      loadTasks(true);
    }
  };

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError("タイトルを入力してください。");
      return;
    }

    if (!dueDate) {
      setError("期限を選択してください。");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/shared-tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: trimmedTitle,
          dueDate,
          priority,
        }),
      });
      if (!res.ok) {
        throw new Error(`Request failed with status ${res.status}`);
      }
      const created = (await res.json()) as SharedTask;
      setTasks((prev) => [created, ...prev]);
      setTitle("");
      setDueDate("");
      setPriority("medium");
    } catch (err) {
      setError(err instanceof Error ? err.message : "共有タスクの作成に失敗しました。");
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteTask = async (task: SharedTask) => {
    setTasks((prev) => prev.filter((item) => item.id !== task.id));
    try {
      const res = await fetch("/api/shared-tasks", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: task.id }),
      });
      if (!res.ok) {
        throw new Error(`Request failed with status ${res.status}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "削除に失敗しました。");
      loadTasks(true);
    }
  };

  return (
    <section className="rounded-3xl border border-slate-200/60 bg-white/80 p-6 shadow-[0_10px_30px_rgba(15,23,42,0.08)] backdrop-blur dark:border-slate-800/70 dark:bg-slate-900/70 dark:shadow-[0_18px_40px_rgba(15,23,42,0.6)]">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
            タスクリスト（共有）
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            優先度と期限を合わせて管理します。
          </p>
        </div>
        <span className="rounded-full border border-slate-200/70 px-3 py-1 text-xs font-semibold text-slate-500 dark:border-slate-800 dark:text-slate-400">
          未完了 {remainingCount} 件
        </span>
      </header>

      <form
        onSubmit={handleCreate}
        className="mt-6 rounded-2xl border border-slate-200/70 bg-white/90 p-4 shadow-sm dark:border-slate-800/80 dark:bg-slate-950/40"
      >
        <div className="flex flex-wrap items-center gap-3">
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="タスクのタイトル"
            className="min-w-[220px] flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 shadow-sm focus:border-slate-300 focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
          />
          <input
            type="date"
            value={dueDate}
            onChange={(event) => setDueDate(event.target.value)}
            className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-slate-300 focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
          />
          <select
            value={priority}
            onChange={(event) => setPriority(event.target.value)}
            className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-slate-300 focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
          >
            <option value="high">high</option>
            <option value="medium">medium</option>
            <option value="low">low</option>
          </select>
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-full border border-slate-200/70 px-4 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:border-slate-500 dark:hover:text-white"
          >
            {isSubmitting ? "追加中..." : "タスクを追加"}
          </button>
        </div>
      </form>

      <div className="mt-6 space-y-4">
        {loading && !hasLoadedOnce.current ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-4 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-400">
            共有タスクを読み込み中…
          </div>
        ) : null}

        {error ? (
          <div className="rounded-2xl border border-rose-200/60 bg-rose-50/70 p-4 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200">
            {error}
          </div>
        ) : null}

        {!loading && tasks.length === 0 && !error ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-4 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-400">
            共有タスクはまだありません。
          </div>
        ) : null}

        {groupedTasks.map((group) => (
          <div key={group.owner} className="space-y-3">
            <div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
              <span className="h-px flex-1 bg-slate-200/70 dark:bg-slate-800/80" />
              <span>{group.owner} のタスク</span>
              <span className="h-px flex-1 bg-slate-200/70 dark:bg-slate-800/80" />
            </div>

            {group.items.map((task) => {
              const styles = PRIORITY_STYLES[task.priority] ?? PRIORITY_STYLES.default;
              const overdue = isOverdue(task.dueDate) && !task.completed;
              return (
                <article
                  key={task.id}
                  className={`flex flex-col gap-3 rounded-2xl border border-slate-200/70 bg-white/80 p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_12px_24px_rgba(15,23,42,0.12)] dark:border-slate-800/80 dark:bg-slate-950/40 dark:hover:border-slate-700 ${
                    task.completed ? "opacity-70" : ""
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={task.completed}
                        onChange={() => toggleComplete(task)}
                        className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-300"
                      />
                      <div>
                        <p
                          className={`text-sm font-semibold ${
                            task.completed
                              ? "text-slate-400 line-through dark:text-slate-500"
                              : "text-slate-900 dark:text-slate-100"
                          }`}
                        >
                          {task.title}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          期限: {formatDueDate(task.dueDate)}
                          {overdue ? "（期限超過）" : ""}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${styles.badge}`}
                    >
                      {task.priority}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-400 dark:text-slate-500">
                    <span>完了チェックで共有更新</span>
                    <div className="flex items-center gap-2">
                      <span className={styles.text}>優先度: {task.priority}</span>
                      <button
                        type="button"
                        onClick={() => deleteTask(task)}
                        className="rounded-full border border-rose-200/70 px-3 py-1 text-xs font-semibold text-rose-600 transition hover:border-rose-300 hover:text-rose-700 dark:border-rose-800 dark:text-rose-300 dark:hover:border-rose-600 dark:hover:text-rose-200"
                      >
                        削除
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ))}
      </div>
    </section>
  );
}
