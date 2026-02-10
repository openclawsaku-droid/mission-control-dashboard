import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

type SharedTask = {
  id: string;
  owner: string;
  title: string;
  priority: string;
  dueDate: string;
  completed: boolean;
  [key: string]: unknown;
};

const dataFilePath = path.join(process.cwd(), "data", "shared-tasks.json");

async function readTasks(): Promise<SharedTask[]> {
  try {
    const raw = await fs.readFile(dataFilePath, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as SharedTask[]) : [];
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
    }
    throw error;
  }
}

async function writeTasks(tasks: SharedTask[]): Promise<void> {
  const payload = JSON.stringify(tasks, null, 2);
  await fs.writeFile(dataFilePath, payload, "utf8");
}

export async function GET() {
  try {
    const tasks = await readTasks();
    return NextResponse.json(tasks, { status: 200 });
  } catch {
    return NextResponse.json(
      { error: "Failed to read shared tasks." },
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

    const { id, completed } = body as { id?: string; completed?: boolean };

    if (typeof id !== "string" || id.trim() === "") {
      return NextResponse.json(
        { error: "Task id is required." },
        { status: 400 }
      );
    }

    if (typeof completed !== "boolean") {
      return NextResponse.json(
        { error: "Completed status must be boolean." },
        { status: 400 }
      );
    }

    const tasks = await readTasks();
    const index = tasks.findIndex((task) => task.id === id);

    if (index === -1) {
      return NextResponse.json({ error: "Task not found." }, { status: 404 });
    }

    const updated = [...tasks];
    updated[index] = {
      ...updated[index],
      completed,
    };

    await writeTasks(updated);

    return NextResponse.json(updated[index], { status: 200 });
  } catch {
    return NextResponse.json(
      { error: "Failed to update task." },
      { status: 500 }
    );
  }
}
