import { NextRequest, NextResponse } from "next/server";
import openai from "@/lib/openai";
import { getProfile, saveProfile } from "@/lib/profiles";

function applyUpdates(
  profile: Record<string, unknown>,
  updates: Record<string, unknown>
): Record<string, unknown> {
  const updated = JSON.parse(JSON.stringify(profile));
  for (const [path, value] of Object.entries(updates)) {
    const keys = path.split(".");
    let obj = updated;
    for (let i = 0; i < keys.length - 1; i++) {
      if (!obj[keys[i]] || typeof obj[keys[i]] !== "object") {
        obj[keys[i]] = {};
      }
      obj = obj[keys[i]] as Record<string, unknown>;
    }
    obj[keys[keys.length - 1]] = value;
  }
  return updated;
}

export async function POST(req: NextRequest) {
  try {
    const { deviceId, text } = await req.json();
    if (!deviceId || !text) {
      return NextResponse.json(
        { error: "Missing deviceId or text" },
        { status: 400 }
      );
    }

    const profile = await getProfile(deviceId);
    if (!profile) {
      return NextResponse.json(
        { message: "No profile found", action: "none" },
        { status: 404 }
      );
    }

    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You manage a user's biographical profile memory. Current profile:
${JSON.stringify(profile, null, 2)}

The user just said something. Determine:
1. If they want to FIND people (love, friends, activity partners, matches, dates) → respond: {"action": "dating", "query": "what they're looking for"}
2. If they share ANY personal information about themselves → you MUST respond with action "update" and save it. This includes: name, age, hobbies, interests, job, location, preferences, opinions, favorites, skills, goals, relationships, experiences, personality traits, or ANYTHING about their life. ALWAYS extract and save new info.
   → respond: {"action": "update", "message": "short friendly confirmation", "updates": {"path.to.field": "newValue"}}
   Examples of paths: "metadata.chronological_age", "focus_areas.intellectual", "focus_areas.crafts", "goals.vision", "goals.growth_areas", "goals.seeking", "recent_media.reading", "recent_media.watching", "recent_media.gaming", "favorite_movies", "active_projects", "metadata.life_stage", "spatial_timeline"
   For array fields, provide the full updated array (merge with existing).
3. ONLY if truly unclear and no personal info was shared → respond: {"action": "none", "message": "brief response"}

Bias STRONGLY toward "update". If in doubt, save it. Never say "noted" without actually saving.
Respond ONLY with valid JSON. No extra text.`,
        },
        { role: "user", content: text },
      ],
      temperature: 0.5,
      max_tokens: 500,
    });

    const reply = completion.choices[0]?.message?.content || "{}";
    try {
      const parsed = JSON.parse(reply);

      if (parsed.action === "update" && parsed.updates) {
        const updated = applyUpdates(profile, parsed.updates);
        updated.metadata = updated.metadata || {};
        (updated.metadata as Record<string, unknown>).last_sync = new Date()
          .toISOString()
          .split("T")[0];
        await saveProfile(deviceId, updated);
        return NextResponse.json({
          action: "update",
          message: parsed.message || "Updated!",
        });
      }

      if (parsed.action === "dating") {
        return NextResponse.json({
          action: "dating",
          query: parsed.query,
        });
      }

      return NextResponse.json({
        action: "none",
        message: parsed.message || "Got it!",
      });
    } catch {
      return NextResponse.json({ action: "none", message: "Got it!" });
    }
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Listen failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
