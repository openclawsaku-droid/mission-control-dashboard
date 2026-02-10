import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";

type SharedMemo = {
  id: string;
  direction: string;
  type: string;
  message: string;
  createdAt: string;
  read: boolean;
  [key: string]: unknown;
};

const dataFilePath = path.join(process.cwd(), "data", "shared-memo.json");

async function readMemos(): Promise<SharedMemo[]> {
  try {
    const raw = await fs.readFile(dataFilePath, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as SharedMemo[]) : [];
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
    }
    throw error;
  }
}

async function writeMemos(memos: SharedMemo[]): Promise<void> {
  const payload = JSON.stringify(memos, null, 2);
  await fs.writeFile(dataFilePath, payload, "utf8");
}

export async function GET() {
  try {
    const memos = await readMemos();
    return NextResponse.json(memos, { status: 200 });
  } catch {
    return NextResponse.json(
      { error: "Failed to read shared memos." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Invalid request body." },
        { status: 400 }
      );
    }

    const { direction, message, type } = body as {
      direction?: string;
      message?: string;
      type?: string;
    };

    if (typeof direction !== "string" || direction.trim() === "") {
      return NextResponse.json(
        { error: "Direction is required." },
        { status: 400 }
      );
    }

    if (typeof message !== "string" || message.trim() === "") {
      return NextResponse.json(
        { error: "Message is required." },
        { status: 400 }
      );
    }

    const memos = await readMemos();
    const newMemo: SharedMemo = {
      id: randomUUID(),
      direction: direction.trim(),
      type: typeof type === "string" && type.trim() !== "" ? type.trim() : "メモ",
      message: message.trim(),
      createdAt: new Date().toISOString(),
      read: false,
    };

    const next = [newMemo, ...memos];
    await writeMemos(next);

    return NextResponse.json(newMemo, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Failed to create memo." },
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

    const { id, read } = body as { id?: string; read?: boolean };

    if (typeof id !== "string" || id.trim() === "") {
      return NextResponse.json(
        { error: "Memo id is required." },
        { status: 400 }
      );
    }

    if (typeof read !== "boolean") {
      return NextResponse.json(
        { error: "Read status must be boolean." },
        { status: 400 }
      );
    }

    const memos = await readMemos();
    const index = memos.findIndex((memo) => memo.id === id);

    if (index === -1) {
      return NextResponse.json({ error: "Memo not found." }, { status: 404 });
    }

    const updated = [...memos];
    updated[index] = {
      ...updated[index],
      read,
    };

    await writeMemos(updated);

    return NextResponse.json(updated[index], { status: 200 });
  } catch {
    return NextResponse.json(
      { error: "Failed to update memo." },
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

    const { id } = body as { id?: string };

    if (typeof id !== "string" || id.trim() === "") {
      return NextResponse.json(
        { error: "Memo id is required." },
        { status: 400 }
      );
    }

    const memos = await readMemos();
    const next = memos.filter((memo) => memo.id !== id);

    if (next.length === memos.length) {
      return NextResponse.json({ error: "Memo not found." }, { status: 404 });
    }

    await writeMemos(next);

    return NextResponse.json({ id }, { status: 200 });
  } catch {
    return NextResponse.json(
      { error: "Failed to delete memo." },
      { status: 500 }
    );
  }
}
