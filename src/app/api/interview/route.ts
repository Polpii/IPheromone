import { NextRequest, NextResponse } from "next/server";
import openai from "@/lib/openai";

const SYSTEM_PROMPT = `You are a concise biographical interviewer. The screen is VERY small — be brief.

RULES:
- Ask ONE question at a time
- First questions: max 8 words
- Follow-up questions to fill gaps: MAX 3 words
- No filler, no pleasantries, no "great!" or "thanks!"
- Be direct and efficient
- Don't number your questions

COVER ALL AREAS:
1. Full name
2. Age or birth year
3. Birthplace
4. Places lived (with time periods)
5. Relationship status
6. Emotional patterns
7. Education (school, degree, years)
8. Career (job title, company, years)
9. Current projects
10. Technical skills
11. Interests & hobbies
12. Favorite movies, shows, games
13. What they're reading/watching/playing currently
14. Recent travel
15. Goals & aspirations
16. Growth areas
17. What kind of people they seek
18. Crafts or creative outlets

When ALL areas are sufficiently covered, respond with EXACTLY:
[COMPLETE]
Followed immediately by a JSON object matching this structure (fill ALL fields from what you learned):
{
  "sharinginstructions": {
    "version": "1.9",
    "protocol": {
      "sharing_logic": "Conservative; high-signal focus.",
      "vulnerability_threshold": "Low; protect themes of [infer from conversation].",
      "data_redaction": ["Redact sensitive info", "Obfuscate exact location", "Verify professional for projects"]
    }
  },
  "metadata": {
    "subject_id": "",
    "chronological_age": "",
    "life_stage": "",
    "last_sync": ""
  },
  "spatial_timeline": [
    {"period": "", "location": "", "attribute": ""}
  ],
  "active_projects": [
    {"title": "", "objective": "", "tech": [], "collabs": []}
  ],
  "recent_media": {
    "reading": [],
    "watching": [],
    "gaming": [],
    "trading": []
  },
  "favorite_movies": [],
  "recent_travel": [
    {"location": "", "date": "", "type": ""}
  ],
  "focus_areas": {
    "intellectual": [],
    "aesthetic": [],
    "crafts": []
  },
  "goals": {
    "vision": "",
    "growth_areas": "",
    "seeking": []
  }
}

Start now with your first question.`;

export async function POST(req: NextRequest) {
  try {
    const { messages, deviceId } = await req.json();

    const chatMessages = [
      { role: "system" as const, content: SYSTEM_PROMPT },
      ...(messages || []).map(
        (m: { role: string; content: string }) =>
          ({
            role: m.role as "user" | "assistant",
            content: m.content,
          })
      ),
    ];

    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o",
      messages: chatMessages,
      temperature: 0.7,
      max_tokens: 2000,
    });

    const reply = completion.choices[0]?.message?.content || "";

    if (reply.includes("[COMPLETE]")) {
      const jsonMatch = reply.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const profile = JSON.parse(jsonMatch[0]);
          profile.metadata = profile.metadata || {};
          profile.metadata.subject_id = deviceId || "";
          profile.metadata.last_sync = new Date().toISOString().split("T")[0];
          return NextResponse.json({
            complete: true,
            profile,
            message: "Profile complete!",
          });
        } catch {
          // JSON parse failed, ask again
          return NextResponse.json({
            message: reply.replace("[COMPLETE]", "").trim(),
          });
        }
      }
    }

    return NextResponse.json({ message: reply });
  } catch (error: unknown) {
    const msg =
      error instanceof Error ? error.message : "Interview failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
