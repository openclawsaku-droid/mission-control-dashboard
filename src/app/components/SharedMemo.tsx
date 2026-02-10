"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type SharedMemo = {
  id: string;
  direction: string;
  type: string;
  message: string;
  createdAt: string;
  read: boolean;
};

const TYPE_STYLES: Record<string, string> = {
  質問: "bg-sky-500/10 text-sky-700 ring-1 ring-sky-200/80 dark:bg-sky-500/10 dark:text-sky-200 dark:ring-sky-500/30",
  提案: "bg-emerald-500/10 text-emerald-700 ring-1 ring-emerald-200/80 dark:bg-emerald-500/10 dark:text-emerald-200 dark:ring-emerald-500/30",
  報告: "bg-amber-500/10 text-amber-700 ring-1 ring-amber-200/80 dark:bg-amber-500/10 dark:text-amber-200 dark:ring-amber-500/30",
  回答: "bg-violet-500/10 text-violet-700 ring-1 ring-violet-200/80 dark:bg-violet-500/10 dark:text-violet-200 dark:ring-violet-500/30",
  指示: "bg-rose-500/10 text-rose-700 ring-1 ring-rose-200/80 dark:bg-rose-500/10 dark:text-rose-200 dark:ring-rose-500/30",
  フィードバック:
    "bg-slate-500/10 text-slate-700 ring-1 ring-slate-200/80 dark:bg-slate-500/10 dark:text-slate-200 dark:ring-slate-500/30",
  default:
    "bg-slate-500/10 text-slate-600 ring-1 ring-slate-200/80 dark:bg-slate-500/10 dark:text-slate-300 dark:ring-slate-500/30",
};

const DIRECTION_ORDER = ["さく → ぷんつく", "ぷんつく → さく"];

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "時刻不明";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export default function SharedMemo() {
  const [memos, setMemos] = useState<SharedMemo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const hasLoadedOnce = useRef(false);

  const loadMemos = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    setIsRefreshing(silent);
    try {
      const res = await fetch("/api/shared-memo", { cache: "no-store" });
      if (!res.ok) {
        throw new Error(`Request failed with status ${res.status}`);
      }
      const data = (await res.json()) as SharedMemo[];
      setMemos(Array.isArray(data) ? data : []);
      hasLoadedOnce.current = true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "共有メモの取得に失敗しました。");
    } finally {
      if (!silent) setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadMemos();
    const interval = setInterval(() => {
      loadMemos(true);
    }, 20_000);
    return () => clearInterval(interval);
  }, [loadMemos]);

  const unreadCount = useMemo(
    () => memos.filter((memo) => !memo.read).length,
    [memos]
  );

  const groupedMemos = useMemo(() => {
    const map = new Map<string, SharedMemo[]>();
    memos.forEach((memo) => {
      const key = memo.direction || "その他";
      if (!map.has(key)) map.set(key, []);
      map.get(key)?.push(memo);
    });
    for (const list of map.values()) {
      list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    }
    return DIRECTION_ORDER.map((direction) => ({
      direction,
      items: map.get(direction) ?? [],
    })).filter((group) => group.items.length > 0);
  }, [memos]);

  const toggleRead = async (memo: SharedMemo) => {
    const nextRead = !memo.read;
    setMemos((prev) =>
      prev.map((item) => (item.id === memo.id ? { ...item, read: nextRead } : item))
    );

    try {
      const res = await fetch("/api/shared-memo", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: memo.id, read: nextRead }),
      });
      if (!res.ok) {
        throw new Error(`Request failed with status ${res.status}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "更新に失敗しました。");
      loadMemos(true);
    }
  };

  return (
    <section className="rounded-3xl border border-slate-200/60 bg-white/80 p-6 shadow-[0_10px_30px_rgba(15,23,42,0.08)] backdrop-blur dark:border-slate-800/70 dark:bg-slate-900/70 dark:shadow-[0_18px_40px_rgba(15,23,42,0.6)]">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
            相互共有メモ
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            質問・提案・報告をリアルタイムで共有します。
          </p>
        </div>
        <div className="flex flex-col items-end gap-2 text-right">
          <span className="rounded-full border border-slate-200/70 px-3 py-1 text-xs font-semibold text-slate-500 dark:border-slate-800 dark:text-slate-400">
            未読 {unreadCount} 件
          </span>
          <span className="text-xs text-slate-400 dark:text-slate-500">
            {isRefreshing ? "更新中..." : "20秒ごとに更新"}
          </span>
        </div>
      </header>

      <div className="mt-6 space-y-4">
        {loading && !hasLoadedOnce.current ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-4 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-400">
            共有メモを読み込み中…
          </div>
        ) : null}

        {error ? (
          <div className="rounded-2xl border border-rose-200/60 bg-rose-50/70 p-4 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200">
            {error}
          </div>
        ) : null}

        {!loading && memos.length === 0 && !error ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-4 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-400">
            共有メモはまだありません。
          </div>
        ) : null}

        {groupedMemos.map((group) => (
          <div key={group.direction} className="space-y-3">
            <div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
              <span className="h-px flex-1 bg-slate-200/70 dark:bg-slate-800/80" />
              <span>{group.direction}</span>
              <span className="h-px flex-1 bg-slate-200/70 dark:bg-slate-800/80" />
            </div>
            {group.items.map((memo) => {
              const badgeClass = TYPE_STYLES[memo.type] ?? TYPE_STYLES.default;
              return (
                <article
                  key={memo.id}
                  className="flex flex-col gap-3 rounded-2xl border border-slate-200/70 bg-white/80 p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_12px_24px_rgba(15,23,42,0.12)] dark:border-slate-800/80 dark:bg-slate-950/40 dark:hover:border-slate-700"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${badgeClass}`}
                      >
                        {memo.type}
                      </span>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${memo.read
                          ? "bg-slate-100 text-slate-500 dark:bg-slate-800/70 dark:text-slate-400"
                          : "bg-rose-500/10 text-rose-600 ring-1 ring-rose-200/70 dark:bg-rose-500/10 dark:text-rose-200 dark:ring-rose-500/30"}`}
                      >
                        {memo.read ? "既読" : "未読"}
                      </span>
                    </div>
                    <span className="text-xs text-slate-400 dark:text-slate-500">
                      {formatDateTime(memo.createdAt)}
                    </span>
                  </div>

                  <p className="text-sm text-slate-600 dark:text-slate-200">
                    {memo.message}
                  </p>

                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400 dark:text-slate-500">
                      既読/未読を管理できます
                    </span>
                    <button
                      type="button"
                      onClick={() => toggleRead(memo)}
                      className="rounded-full border border-slate-200/70 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900 dark:border-slate-700 dark:text-slate-300 dark:hover:border-slate-500 dark:hover:text-white"
                    >
                      {memo.read ? "未読にする" : "既読にする"}
                    </button>
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
