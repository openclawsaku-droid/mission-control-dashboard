"use client";

import { useEffect, useMemo, useState } from "react";

type SearchResult = {
  id?: string;
  path: string;
  preview?: string;
  type?: string;
};

function getTypeLabel(result: SearchResult) {
  if (result.type?.trim()) return result.type.toUpperCase();
  const ext = result.path.split(".").pop();
  return ext ? ext.toUpperCase() : "FILE";
}

export default function GlobalSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      setError(null);
      setLoading(false);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}`);
        if (!res.ok) {
          throw new Error(`Request failed with status ${res.status}`);
        }
        const data = (await res.json()) as SearchResult[] | { results?: SearchResult[] };
        const list = Array.isArray(data)
          ? data
          : Array.isArray(data.results)
            ? data.results
            : [];
        setResults(list);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Search failed.");
      } finally {
        setLoading(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [query]);

  const normalized = useMemo(
    () =>
      results.map((item, index) => ({
        id: item.id ?? `${item.path}-${index}`,
        path: item.path,
        preview: item.preview ?? "",
        typeLabel: getTypeLabel(item),
      })),
    [results]
  );

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Global Search</h3>
        <span className="text-xs text-slate-500 dark:text-slate-400">/api/search</span>
      </div>

      <div className="mt-4">
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search files and notes"
          className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900 outline-none transition-all duration-200 focus:border-blue-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
        />
      </div>

      <div className="mt-4 space-y-2">
        {loading ? <p className="text-sm text-slate-500 dark:text-slate-400">Searching...</p> : null}
        {error ? <p className="text-sm text-rose-600 dark:text-rose-300">{error}</p> : null}

        {!loading && !error && query.trim() && normalized.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">No results found.</p>
        ) : null}

        {!query.trim() ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Start typing to search the workspace.
          </p>
        ) : null}

        {normalized.map((item) => (
          <article key={item.id} className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{item.path}</p>
              <span className="rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                {item.typeLabel}
              </span>
            </div>
            {item.preview ? (
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{item.preview}</p>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}
