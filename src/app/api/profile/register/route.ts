import { NextResponse } from "next/server";
import { getNextId } from "@/lib/profiles";

export async function POST() {
  try {
    const id = await getNextId();
    return NextResponse.json({ id });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Registration failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
