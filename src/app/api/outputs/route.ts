import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

type OutputStatus = "draft" | "review" | "final";
type OutputAction = "review" | "approve" | "feedback" | "read";

type OutputItem = {
  id: string;
  title: string;
  type: string;
  url: string;
  summary?: string;
  tags: string[];
  project?: string;
  status: OutputStatus;
  action?: OutputAction;
  linearIssueId?: string;
  createdAt: string;
  [key: string]: unknown;
};

const dataFilePath = path.join(process.cwd(), "data", "outputs.json");

async function readOutputs(): Promise<OutputItem[]> {
  try {
    const raw = await fs.readFile(dataFilePath, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as OutputItem[]) : [];
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
    }
    throw error;
  }
}

async function writeOutputs(outputs: OutputItem[]): Promise<void> {
  await fs.writeFile(dataFilePath, JSON.stringify(outputs, null, 2), "utf8");
}

function normalizeStatus(value: unknown): OutputStatus {
  const normalized = typeof value === "string" ? value.toLowerCase() : "";
  if (normalized === "draft" || normalized === "review" || normalized === "final") {
    return normalized;
  }
  return "final";
}

function normalizeAction(value: unknown): OutputAction | undefined {
  const normalized = typeof value === "string" ? value.toLowerCase() : "";
  if (
    normalized === "review" ||
    normalized === "approve" ||
    normalized === "feedback" ||
    normalized === "read"
  ) {
    return normalized;
  }
  return undefined;
}

function toSafeString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function toTags(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}

function sortByCreatedAtDesc(outputs: OutputItem[]): OutputItem[] {
  return [...outputs].sort((a, b) => {
    const aTime = new Date(a.createdAt).getTime();
    const bTime = new Date(b.createdAt).getTime();
    const safeA = Number.isNaN(aTime) ? 0 : aTime;
    const safeB = Number.isNaN(bTime) ? 0 : bTime;
    return safeB - safeA;
  });
}

export async function GET() {
  try {
    const outputs = await readOutputs();
    return NextResponse.json(sortByCreatedAtDesc(outputs), { status: 200 });
  } catch {
    return NextResponse.json(
      { error: "Failed to read outputs." },
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

    const title = toSafeString(body.title);
    const type = toSafeString(body.type);
    const url = toSafeString(body.url);

    if (!title || !type || !url) {
      return NextResponse.json(
        { error: "title, type, and url are required." },
        { status: 400 }
      );
    }

    const output: OutputItem = {
      id: `out-${Date.now()}`,
      title,
      type,
      url,
      summary: toSafeString(body.summary) || undefined,
      tags: toTags(body.tags),
      project: toSafeString(body.project) || undefined,
      status: normalizeStatus(body.status),
      action: normalizeAction(body.action),
      linearIssueId: toSafeString(body.linearIssueId) || undefined,
      createdAt: new Date().toISOString(),
    };

    const current = await readOutputs();
    const updated = sortByCreatedAtDesc([output, ...current]);
    await writeOutputs(updated);

    return NextResponse.json(output, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Failed to create output." },
      { status: 500 }
    );
  }
}
