import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

type Activity = {
  id: string;
  timestamp: string;
  type: string;
  action: string;
  details: string;
  [key: string]: unknown;
};

const dataFilePath = path.join(process.cwd(), "data", "activities.json");

async function readActivities(): Promise<Activity[]> {
  try {
    const raw = await fs.readFile(dataFilePath, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Activity[]) : [];
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
    }
    throw error;
  }
}

async function writeActivities(activities: Activity[]): Promise<void> {
  const payload = JSON.stringify(activities, null, 2);
  await fs.writeFile(dataFilePath, payload, "utf8");
}

function nextId(activities: Activity[]): string {
  const maxId = activities.reduce((max, activity) => {
    const numeric = Number(activity.id);
    return Number.isFinite(numeric) ? Math.max(max, numeric) : max;
  }, 0);
  return String(maxId + 1);
}

export async function GET() {
  try {
    const activities = await readActivities();
    return NextResponse.json(activities, { status: 200 });
  } catch {
    return NextResponse.json(
      { error: "Failed to read activities." },
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

    const activities = await readActivities();
    const activity: Activity = {
      ...body,
      id: nextId(activities),
      timestamp: new Date().toISOString(),
    };

    const updated = [activity, ...activities];
    await writeActivities(updated);

    return NextResponse.json(activity, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Failed to create activity." },
      { status: 500 }
    );
  }
}
