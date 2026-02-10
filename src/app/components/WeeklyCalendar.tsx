"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type Task = {
  id: string;
  title: string;
  date: string;
  time: string;
  status: "pending" | "in-progress" | "completed" | string;
  priority: "low" | "medium" | "high" | string;
};

type TaskFormState = {
  id?: string;
  title: string;
  date: string;
  time: string;
  status: Task["status"];
  priority: Task["priority"];
};

const STATUS_STYLES: Record<
  string,
  { badge: string; dot: string; label: string }
> = {
  pending: {
    badge:
      "bg-amber-100 text-amber-700 ring-1 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/30",
    dot: "bg-amber-400",
    label: "Pending",
  },
  "in-progress": {
    badge:
      "bg-sky-100 text-sky-700 ring-1 ring-sky-200 dark:bg-sky-500/10 dark:text-sky-300 dark:ring-sky-500/30",
    dot: "bg-sky-400",
    label: "In progress",
  },
  completed: {
    badge:
      "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/30",
    dot: "bg-emerald-400",
    label: "Completed",
  },
};

const PRIORITY_OPTIONS: Task["priority"][] = ["low", "medium", "high"];
const STATUS_OPTIONS: Task["status"][] = [
  "pending",
  "in-progress",
  "completed",
];
const MAX_VISIBLE_TASKS = 4;

const PRIORITY_STYLES: Record<string, { dot: string; ring: string; text: string }> = {
  high: {
    dot: "bg-rose-500 shadow-[0_0_0_2px_rgba(244,63,94,0.2)]",
    ring: "ring-rose-200/70 dark:ring-rose-500/30",
    text: "text-rose-700 dark:text-rose-300",
  },
  medium: {
    dot: "bg-amber-400 shadow-[0_0_0_2px_rgba(251,191,36,0.2)]",
    ring: "ring-amber-200/70 dark:ring-amber-500/30",
    text: "text-amber-700 dark:text-amber-300",
  },
  low: {
    dot: "bg-slate-400 shadow-[0_0_0_2px_rgba(148,163,184,0.2)]",
    ring: "ring-slate-200/70 dark:ring-slate-600/50",
    text: "text-slate-500 dark:text-slate-400",
  },
};

function normalizeDate(date: Date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function startOfWeek(date: Date) {
  const normalized = normalizeDate(date);
  const day = normalized.getDay();
  normalized.setDate(normalized.getDate() - day);
  return normalized;
}

function addDays(date: Date, amount: number) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + amount);
  return copy;
}

function formatDateInput(date: Date) {
  return date.toISOString().slice(0, 10);
}

function formatDayLabel(date: Date) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "2-digit",
  }).format(date);
}

function formatWeekRange(start: Date, end: Date) {
  const formatter = new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "2-digit",
  });
  return `${formatter.format(start)} - ${formatter.format(end)}`;
}

function createEmptyFormState(date: Date): TaskFormState {
  return {
    title: "",
    date: formatDateInput(date),
    time: "09:00",
    status: "pending",
    priority: "medium",
  };
}

function isToday(date: Date) {
  const today = normalizeDate(new Date());
  return normalizeDate(date).getTime() === today.getTime();
}

export default function WeeklyCalendar() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [weekAnchor, setWeekAnchor] = useState<Date>(() => new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());
  const [activeForm, setActiveForm] = useState<
    { mode: "create" | "edit"; data: TaskFormState } | null
  >(null);
  const [confirmDelete, setConfirmDelete] = useState<Task | null>(null);
  const hasLoadedOnce = useRef(false);

  const loadTasks = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/tasks", { cache: "no-store" });
      if (!res.ok) {
        throw new Error(`Request failed with status ${res.status}`);
      }
      const data = (await res.json()) as Task[];
      setTasks(Array.isArray(data) ? data : []);
      hasLoadedOnce.current = true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load tasks.");
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const weekStart = useMemo(() => startOfWeek(weekAnchor), [weekAnchor]);
  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, idx) => addDays(weekStart, idx)),
    [weekStart]
  );

  const tasksByDate = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const task of tasks) {
      if (!map.has(task.date)) {
        map.set(task.date, []);
      }
      map.get(task.date)?.push(task);
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.time.localeCompare(b.time));
    }
    return map;
  }, [tasks]);

  const openCreateModal = (date?: Date) => {
    const baseDate = date ?? selectedDate ?? new Date();
    setError(null);
    setActiveForm({ mode: "create", data: createEmptyFormState(baseDate) });
  };

  const openEditModal = (task: Task) => {
    setError(null);
    setActiveForm({
      mode: "edit",
      data: {
        id: task.id,
        title: task.title,
        date: task.date,
        time: task.time,
        status: task.status,
        priority: task.priority,
      },
    });
  };

  const closeModal = () => {
    setActiveForm(null);
    setConfirmDelete(null);
    setError(null);
  };

  const handleFormChange = (field: keyof TaskFormState, value: string) => {
    if (!activeForm) return;
    setActiveForm({
      ...activeForm,
      data: {
        ...activeForm.data,
        [field]: value,
      },
    });
  };

  const submitForm = async () => {
    if (!activeForm) return;
    const payload = {
      title: activeForm.data.title.trim(),
      date: activeForm.data.date,
      time: activeForm.data.time,
      status: activeForm.data.status,
      priority: activeForm.data.priority,
    };

    if (!payload.title) {
      setError("Task title is required.");
      return;
    }

    try {
      const res = await fetch("/api/tasks", {
        method: activeForm.mode === "create" ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          activeForm.mode === "create"
            ? payload
            : { ...payload, id: activeForm.data.id }
        ),
      });
      if (!res.ok) {
        throw new Error(`Request failed with status ${res.status}`);
      }
      await loadTasks(true);
      closeModal();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save task.");
    }
  };

  const confirmDeleteTask = (task: Task) => {
    setConfirmDelete(task);
  };

  const deleteTask = async () => {
    if (!confirmDelete) return;
    try {
      const res = await fetch("/api/tasks", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: confirmDelete.id }),
      });
      if (!res.ok) {
        throw new Error(`Request failed with status ${res.status}`);
      }
      await loadTasks(true);
      closeModal();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete task.");
    }
  };

  return (
    <section className="rounded-3xl border border-slate-200/60 bg-white/80 p-6 shadow-[0_10px_30px_rgba(15,23,42,0.08)] backdrop-blur dark:border-slate-800/70 dark:bg-slate-900/70 dark:shadow-[0_18px_40px_rgba(15,23,42,0.6)]">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
            Weekly Calendar
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {formatWeekRange(weekStart, addDays(weekStart, 6))}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setWeekAnchor(addDays(weekAnchor, -7))}
            className="rounded-full border border-slate-200/80 px-3 py-1.5 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900 dark:border-slate-700 dark:text-slate-300 dark:hover:border-slate-500 dark:hover:text-white"
          >
            Prev
          </button>
          <button
            type="button"
            onClick={() => setWeekAnchor(addDays(weekAnchor, 7))}
            className="rounded-full border border-slate-200/80 px-3 py-1.5 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900 dark:border-slate-700 dark:text-slate-300 dark:hover:border-slate-500 dark:hover:text-white"
          >
            Next
          </button>
          <button
            type="button"
            onClick={() => openCreateModal()}
            className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 dark:bg-slate-50 dark:text-slate-900 dark:hover:bg-white"
          >
            Add task
          </button>
        </div>
      </header>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-7">
        {weekDays.map((day) => {
          const dayKey = formatDateInput(day);
          const dayTasks = tasksByDate.get(dayKey) ?? [];
          const today = isToday(day);
          const selected =
            normalizeDate(day).getTime() === normalizeDate(selectedDate).getTime();

          return (
            <div
              key={dayKey}
              className={`flex min-h-[180px] flex-col rounded-2xl border p-3 transition hover:border-slate-300 dark:hover:border-slate-600 ${
                today
                  ? "border-sky-300 bg-sky-50/70 shadow-[0_8px_20px_rgba(56,189,248,0.2)] dark:border-sky-500/40 dark:bg-sky-500/10"
                  : "border-slate-200/70 bg-white/70 dark:border-slate-800/80 dark:bg-slate-950/40"
              } ${
                selected && !today
                  ? "ring-2 ring-slate-300/60 dark:ring-slate-600/70"
                  : ""
              }`}
              onClick={() => setSelectedDate(day)}
            >
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    setSelectedDate(day);
                    openCreateModal(day);
                  }}
                  className="text-xs font-semibold text-slate-400 transition hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
                >
                  +
                </button>
                <div className="text-right">
                  <p
                    className={`text-xs font-semibold uppercase tracking-wide ${
                      today
                        ? "text-sky-700 dark:text-sky-300"
                        : "text-slate-500 dark:text-slate-400"
                    }`}
                  >
                    {formatDayLabel(day)}
                  </p>
                </div>
              </div>

              <div className="mt-3 space-y-2">
                {dayTasks.length === 0 ? (
                  <p className="text-xs text-slate-400 dark:text-slate-500">
                    No tasks
                  </p>
                ) : null}
                <div className="max-h-[220px] space-y-2 overflow-y-auto pr-1">
                  {dayTasks.slice(0, MAX_VISIBLE_TASKS).map((task) => {
                    const style =
                      STATUS_STYLES[task.status] ?? STATUS_STYLES.pending;
                    const priorityStyle =
                      PRIORITY_STYLES[task.priority] ?? PRIORITY_STYLES.low;
                    return (
                      <button
                        key={task.id}
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          openEditModal(task);
                        }}
                        className={`group w-full rounded-xl border border-slate-200/70 bg-white/80 p-2 text-left transition hover:border-slate-300 hover:bg-white dark:border-slate-800/80 dark:bg-slate-950/40 dark:hover:border-slate-600 ${
                          priorityStyle.ring ? `ring-1 ${priorityStyle.ring}` : ""
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className={`h-2 w-2 shrink-0 rounded-full ${priorityStyle.dot}`}
                            aria-hidden="true"
                          />
                          <div className="flex min-w-0 flex-1 items-center gap-1 text-[11px] font-semibold text-slate-700 dark:text-slate-200">
                            <span className="shrink-0 text-[10px] font-medium text-slate-400 dark:text-slate-500">
                              {task.time}
                            </span>
                            <span className="min-w-0 flex-1 truncate">
                              {task.title}
                            </span>
                          </div>
                        </div>
                        <div className="mt-1 hidden text-[10px] text-slate-500 transition group-hover:block dark:text-slate-400">
                          <span className="block truncate">
                            {task.title}
                          </span>
                          <span className="mt-0.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold">
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${style.dot}`}
                            />
                            <span className={priorityStyle.text}>
                              {task.priority}
                            </span>
                            <span className="text-slate-400 dark:text-slate-500">
                              ·
                            </span>
                            <span>{style.label}</span>
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
                {dayTasks.length > MAX_VISIBLE_TASKS ? (
                  <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500">
                    +{dayTasks.length - MAX_VISIBLE_TASKS} more
                  </p>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      {loading && !hasLoadedOnce.current ? (
        <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-4 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-400">
          Loading tasks…
        </div>
      ) : null}

      {error ? (
        <div className="mt-4 rounded-2xl border border-rose-200/60 bg-rose-50/70 p-4 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200">
          {error}
        </div>
      ) : null}

      {activeForm && !confirmDelete ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-lg rounded-3xl border border-slate-200/70 bg-white p-6 shadow-[0_20px_50px_rgba(15,23,42,0.25)] dark:border-slate-800 dark:bg-slate-950">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
                  {activeForm.mode === "create" ? "Add Task" : "Edit Task"}
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {activeForm.mode === "create"
                    ? "Plan out the work for this week."
                    : "Update details or remove the task."}
                </p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="text-slate-400 transition hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
              >
                Close
              </button>
            </div>

            <div className="mt-4 grid gap-4">
              <label className="grid gap-2 text-sm text-slate-600 dark:text-slate-300">
                Title
                <input
                  type="text"
                  value={activeForm.data.title}
                  onChange={(event) =>
                    handleFormChange("title", event.target.value)
                  }
                  className="rounded-2xl border border-slate-200/80 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-slate-600 dark:focus:ring-slate-700"
                  placeholder="Task name"
                />
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-2 text-sm text-slate-600 dark:text-slate-300">
                  Date
                  <input
                    type="date"
                    value={activeForm.data.date}
                    onChange={(event) =>
                      handleFormChange("date", event.target.value)
                    }
                    className="rounded-2xl border border-slate-200/80 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-slate-600 dark:focus:ring-slate-700"
                  />
                </label>
                <label className="grid gap-2 text-sm text-slate-600 dark:text-slate-300">
                  Time
                  <input
                    type="time"
                    value={activeForm.data.time}
                    onChange={(event) =>
                      handleFormChange("time", event.target.value)
                    }
                    className="rounded-2xl border border-slate-200/80 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-slate-600 dark:focus:ring-slate-700"
                  />
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-2 text-sm text-slate-600 dark:text-slate-300">
                  Status
                  <select
                    value={activeForm.data.status}
                    onChange={(event) =>
                      handleFormChange("status", event.target.value)
                    }
                    className="rounded-2xl border border-slate-200/80 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-slate-600 dark:focus:ring-slate-700"
                  >
                    {STATUS_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-2 text-sm text-slate-600 dark:text-slate-300">
                  Priority
                  <select
                    value={activeForm.data.priority}
                    onChange={(event) =>
                      handleFormChange("priority", event.target.value)
                    }
                    className="rounded-2xl border border-slate-200/80 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-slate-600 dark:focus:ring-slate-700"
                  >
                    {PRIORITY_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
              {activeForm.mode === "edit" ? (
                <button
                  type="button"
                  onClick={() => {
                    const task = tasks.find(
                      (item) => item.id === activeForm.data.id
                    );
                    if (task) {
                      confirmDeleteTask(task);
                    }
                  }}
                  className="rounded-full border border-rose-200/70 px-4 py-2 text-sm font-semibold text-rose-600 transition hover:border-rose-300 hover:text-rose-700 dark:border-rose-800 dark:text-rose-300 dark:hover:border-rose-700"
                >
                  Delete
                </button>
              ) : (
                <span className="text-xs text-slate-400 dark:text-slate-500">
                  Tip: click a day to schedule faster.
                </span>
              )}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-full border border-slate-200/80 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900 dark:border-slate-700 dark:text-slate-300 dark:hover:border-slate-500 dark:hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={submitForm}
                  className="rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 dark:bg-slate-50 dark:text-slate-900 dark:hover:bg-white"
                >
                  {activeForm.mode === "create" ? "Create" : "Save"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {confirmDelete ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-3xl border border-slate-200/70 bg-white p-6 shadow-[0_20px_50px_rgba(15,23,42,0.25)] dark:border-slate-800 dark:bg-slate-950">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
              Delete task?
            </h3>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              This will permanently remove “{confirmDelete.title}”.
            </p>
            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmDelete(null)}
                className="rounded-full border border-slate-200/80 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900 dark:border-slate-700 dark:text-slate-300 dark:hover:border-slate-500 dark:hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={deleteTask}
                className="rounded-full bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-500"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
