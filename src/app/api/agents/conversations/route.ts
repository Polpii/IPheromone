import { NextResponse } from "next/server";
import { getAllConversations } from "@/lib/conversations";

export async function GET() {
  try {
    const conversations = await getAllConversations();
    return NextResponse.json({ conversations });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to fetch";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
