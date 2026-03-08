import { NextRequest, NextResponse } from "next/server";
import { saveProfile, getProfile, getAllProfiles } from "@/lib/profiles";

export async function POST(req: NextRequest) {
  try {
    const { deviceId, profile } = await req.json();
    if (!deviceId || !profile) {
      return NextResponse.json(
        { error: "Missing deviceId or profile" },
        { status: 400 }
      );
    }
    // Ensure subject_id is always set
    profile.metadata = profile.metadata || {};
    profile.metadata.subject_id = deviceId;
    await saveProfile(deviceId, profile);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Save failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const deviceId = req.nextUrl.searchParams.get("deviceId");
    if (deviceId) {
      const profile = await getProfile(deviceId);
      return NextResponse.json({ profile });
    }
    const profiles = await getAllProfiles();
    return NextResponse.json({ profiles });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Read failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
