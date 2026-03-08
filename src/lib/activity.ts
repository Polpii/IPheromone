import fs from "fs/promises";
import path from "path";

const ACTIVITY_FILE = path.join(process.cwd(), "data", "activity.json");

export interface DatingActivity {
  type: "dating";
  requesterId: string;
  currentTargetId: string | null;
  phase: "screening" | "dating" | "done";
  targetQueue: string[]; // IDs they will visit
  completedTargets: string[]; // IDs they finished visiting
  startedAt: string;
  updatedAt: string;
}

async function ensureFile() {
  try {
    await fs.access(ACTIVITY_FILE);
  } catch {
    await fs.mkdir(path.dirname(ACTIVITY_FILE), { recursive: true });
    await fs.writeFile(ACTIVITY_FILE, JSON.stringify([], null, 2));
  }
}

export async function getActivities(): Promise<DatingActivity[]> {
  await ensureFile();
  try {
    const content = await fs.readFile(ACTIVITY_FILE, "utf-8");
    return JSON.parse(content);
  } catch {
    return [];
  }
}

export async function setActivities(activities: DatingActivity[]): Promise<void> {
  await ensureFile();
  await fs.writeFile(ACTIVITY_FILE, JSON.stringify(activities, null, 2));
}

export async function upsertActivity(activity: DatingActivity): Promise<void> {
  const all = await getActivities();
  const idx = all.findIndex((a) => a.requesterId === activity.requesterId);
  if (idx >= 0) all[idx] = activity;
  else all.push(activity);
  await setActivities(all);
}

export async function removeActivity(requesterId: string): Promise<void> {
  const all = await getActivities();
  await setActivities(all.filter((a) => a.requesterId !== requesterId));
}
