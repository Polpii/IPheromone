import fs from "fs/promises";
import path from "path";

const CONVERSATIONS_DIR = path.join(process.cwd(), "data", "conversations");

export interface ConversationMessage {
  from: string; // agent ID (e.g. "agent-3")
  to: string;
  content: string;
  timestamp: string;
}

export interface Conversation {
  id: string;
  agentA: string; // user ID like "3"
  agentB: string;
  query: string; // what the user asked for
  requestedBy: string; // which user triggered this
  messages: ConversationMessage[];
  result?: {
    score: number;
    summary: string;
    compatibility: Record<string, number>;
  };
  createdAt: string;
}

async function ensureDir() {
  await fs.mkdir(CONVERSATIONS_DIR, { recursive: true });
}

export async function saveConversation(conv: Conversation): Promise<void> {
  await ensureDir();
  const filePath = path.join(CONVERSATIONS_DIR, `${conv.id}.json`);
  await fs.writeFile(filePath, JSON.stringify(conv, null, 2));
}

export async function getConversation(
  id: string
): Promise<Conversation | null> {
  await ensureDir();
  const safeId = id.replace(/[^a-zA-Z0-9_-]/g, "");
  if (!safeId) return null;
  const filePath = path.join(CONVERSATIONS_DIR, `${safeId}.json`);
  try {
    const content = await fs.readFile(filePath, "utf-8");
    return JSON.parse(content);
  } catch {
    return null;
  }
}

export async function getAllConversations(): Promise<Conversation[]> {
  await ensureDir();
  const files = await fs.readdir(CONVERSATIONS_DIR);
  const conversations: Conversation[] = [];
  for (const file of files) {
    if (file.endsWith(".json")) {
      try {
        const content = await fs.readFile(
          path.join(CONVERSATIONS_DIR, file),
          "utf-8"
        );
        conversations.push(JSON.parse(content));
      } catch {
        // skip
      }
    }
  }
  conversations.sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  return conversations;
}
