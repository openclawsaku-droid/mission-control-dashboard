import { NextResponse } from "next/server";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const REPORTS_DIR = join(process.cwd(), "data", "reports");

export async function GET() {
  try {
    if (!existsSync(REPORTS_DIR)) {
      return NextResponse.json([]);
    }

    const files = readdirSync(REPORTS_DIR)
      .filter((f) => f.endsWith(".json"))
      .sort()
      .reverse()
      .slice(0, 14); // last 2 weeks

    const reports = files.map((file) => {
      const raw = readFileSync(join(REPORTS_DIR, file), "utf-8");
      return JSON.parse(raw);
    });

    return NextResponse.json(reports);
  } catch {
    return NextResponse.json([]);
  }
}
