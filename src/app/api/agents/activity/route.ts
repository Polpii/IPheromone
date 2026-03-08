import { NextResponse } from "next/server";
import { getActivities } from "@/lib/activity";

export async function GET() {
  try {
    const activities = await getActivities();
    return NextResponse.json({ activities });
  } catch {
    return NextResponse.json({ activities: [] });
  }
}
