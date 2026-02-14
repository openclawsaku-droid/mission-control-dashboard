import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

type Task = {
  id: string;
  title: string;
  date: string;
  time: string;
  status: string;
  priority: string;
  [key: string]: unknown;
};

const dataFilePath = path.join(process.cwd(), "data", "tasks.json");

async function readTasks(): Promise<Task[]> {
  try {
    const raw = await fs.readFile(dataFilePath, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Task[]) : [];
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
    }
    throw error;
  }
}

async function writeTasks(tasks: Task[]): Promise<void> {
  const payload = JSON.stringify(tasks, null, 2);
  await fs.writeFile(dataFilePath, payload, "utf8");
}

function nextId(tasks: Task[]): string {
  const maxId = tasks.reduce((max, task) => {
    const numeric = Number(task.id);
    return Number.isFinite(numeric) ? Math.max(max, numeric) : max;
  }, 0);
  return String(maxId + 1);
}

function isValidTaskPayload(payload: unknown): payload is Omit<Task, "id"> {
  if (!payload || typeof payload !== "object") {
    return false;
  }

  const { title, date, time, status, priority } = payload as Task;

  return (
    typeof title === "string" &&
    typeof date === "string" &&
    typeof time === "string" &&
    typeof status === "string" &&
    typeof priority === "string"
  );
}

export async function GET() {
  try {
    const tasks = await readTasks();
    return NextResponse.json(tasks, { status: 200 });
  } catch {
    return NextResponse.json(
      { error: "Failed to read tasks." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!isValidTaskPayload(body)) {
      return NextResponse.json(
        { error: "Invalid request body." },
        { status: 400 }
      );
    }

    const validatedBody = body as { title: string; date: string; time: string; status: string; priority: string };
    const tasks = await readTasks();
    const task: Task = {
      title: validatedBody.title,
      date: validatedBody.date,
      time: validatedBody.time,
      status: validatedBody.status,
      priority: validatedBody.priority,
      id: nextId(tasks),
    };

    const updated = [task, ...tasks];
    await writeTasks(updated);

    return NextResponse.json(task, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Failed to create task." },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Invalid request body." },
        { status: 400 }
      );
    }

    const { id } = body as Task;
    if (typeof id !== "string" || id.trim() === "") {
      return NextResponse.json(
        { error: "Task id is required." },
        { status: 400 }
      );
    }

    if (!isValidTaskPayload(body)) {
      return NextResponse.json(
        { error: "Invalid task payload." },
        { status: 400 }
      );
    }

    const tasks = await readTasks();
    const index = tasks.findIndex((task) => task.id === id);

    if (index === -1) {
      return NextResponse.json({ error: "Task not found." }, { status: 404 });
    }

    const updatedTask: Task = {
      ...tasks[index],
      ...body,
      id: tasks[index].id,
    };

    const updated = [...tasks];
    updated[index] = updatedTask;
    await writeTasks(updated);

    return NextResponse.json(updatedTask, { status: 200 });
  } catch {
    return NextResponse.json(
      { error: "Failed to update task." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const body = await request.json();

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Invalid request body." },
        { status: 400 }
      );
    }

    const { id } = body as Task;
    if (typeof id !== "string" || id.trim() === "") {
      return NextResponse.json(
        { error: "Task id is required." },
        { status: 400 }
      );
    }

    const tasks = await readTasks();
    const updated = tasks.filter((task) => task.id !== id);

    if (updated.length === tasks.length) {
      return NextResponse.json({ error: "Task not found." }, { status: 404 });
    }

    await writeTasks(updated);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch {
    return NextResponse.json(
      { error: "Failed to delete task." },
      { status: 500 }
    );
  }
}
