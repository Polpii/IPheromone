import fs from "fs/promises";
import path from "path";

const PROFILES_DIR = path.join(process.cwd(), "data", "profiles");
const COUNTER_FILE = path.join(process.cwd(), "data", "counter.json");

async function ensureDir() {
  await fs.mkdir(PROFILES_DIR, { recursive: true });
}

export async function getNextId(): Promise<number> {
  await ensureDir();
  let counter = 0;
  try {
    const content = await fs.readFile(COUNTER_FILE, "utf-8");
    counter = JSON.parse(content).next || 0;
  } catch {
    // file doesn't exist yet
  }
  counter++;
  await fs.writeFile(COUNTER_FILE, JSON.stringify({ next: counter }));
  return counter;
}

export async function saveProfile(
  id: string,
  data: Record<string, unknown>
): Promise<void> {
  await ensureDir();
  const safeId = id.replace(/[^a-zA-Z0-9_-]/g, "");
  if (!safeId) throw new Error("Invalid profile ID");
  const filePath = path.join(PROFILES_DIR, `${safeId}.json`);
  await fs.writeFile(filePath, JSON.stringify(data, null, 2));
}

export async function getProfile(
  id: string
): Promise<Record<string, unknown> | null> {
  await ensureDir();
  const safeId = id.replace(/[^a-zA-Z0-9_-]/g, "");
  if (!safeId) return null;
  const filePath = path.join(PROFILES_DIR, `${safeId}.json`);
  try {
    const content = await fs.readFile(filePath, "utf-8");
    return JSON.parse(content);
  } catch {
    return null;
  }
}

export async function getAllProfiles(): Promise<Record<string, unknown>[]> {
  await ensureDir();
  const files = await fs.readdir(PROFILES_DIR);
  const profiles: Record<string, unknown>[] = [];
  for (const file of files) {
    if (file.endsWith(".json")) {
      try {
        const content = await fs.readFile(
          path.join(PROFILES_DIR, file),
          "utf-8"
        );
        profiles.push(JSON.parse(content));
      } catch {
        // skip malformed files
      }
    }
  }
  return profiles;
}
