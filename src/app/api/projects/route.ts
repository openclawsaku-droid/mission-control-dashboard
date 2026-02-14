import { NextResponse } from "next/server";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const DATA_PATH = join(process.cwd(), "data", "projects.json");

export async function GET() {
  try {
    const raw = readFileSync(DATA_PATH, "utf-8");
    const data = JSON.parse(raw);
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({});
  }
}
