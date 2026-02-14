#!/usr/bin/env node

function parseArgs(argv) {
  const result = {};

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith("--")) continue;

    const key = token.slice(2);
    if (!key) continue;

    const next = argv[i + 1];
    if (!next || next.startsWith("--")) {
      result[key] = true;
      continue;
    }

    result[key] = next;
    i += 1;
  }

  return result;
}

function toTags(value) {
  if (typeof value !== "string") return [];
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function usage() {
  console.error(
    "Usage: node scripts/auto-record-output.js --title \"xx\" --type google-docs --url \"https://...\" [--summary \"...\"] [--tags \"tag1,tag2\"] [--project \"xx\"] [--status final] [--linear \"SAK-42\"]"
  );
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  const title = typeof args.title === "string" ? args.title.trim() : "";
  const type = typeof args.type === "string" ? args.type.trim() : "";
  const url = typeof args.url === "string" ? args.url.trim() : "";

  if (!title || !type || !url) {
    usage();
    process.exitCode = 1;
    return;
  }

  const payload = {
    title,
    type,
    url,
    summary: typeof args.summary === "string" ? args.summary : undefined,
    tags: toTags(args.tags),
    project: typeof args.project === "string" ? args.project : undefined,
    status: typeof args.status === "string" ? args.status : "final",
    linearIssueId: typeof args.linear === "string" ? args.linear : undefined,
  };

  const res = await fetch("http://localhost:3000/api/outputs", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    console.error("Failed to record output:", data);
    process.exitCode = 1;
    return;
  }

  console.log("Recorded output:", data);
}

main().catch((error) => {
  console.error("Request failed:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
