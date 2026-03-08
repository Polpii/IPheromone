"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Tamagotchi, { type TamagotchiState } from "@/components/Tamagotchi";

interface Profile {
  metadata?: {
    subject_id?: string;
  };
}

interface DatingActivity {
  requesterId: string;
  currentTargetId: string | null;
  phase: string;
  targetQueue: string[];
  completedTargets: string[];
}

// Pseudo-random but stable position from userId string
function stableHash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

// Scatter tamagotchis with guaranteed no overlap using grid-based placement + repulsion
function getRoomPositions(userIds: string[], w: number, h: number) {
  const TAMA = 70;
  const MIN_DIST = TAMA * 1.8; // guaranteed minimum distance between centers
  const pad = TAMA;
  const usableW = Math.max(MIN_DIST, w - pad * 2);
  const usableH = Math.max(MIN_DIST, h - pad * 2);
  const positions: Record<string, { x: number; y: number }> = {};

  const n = userIds.length;
  if (n === 0) return positions;

  // Calculate grid layout to guarantee enough space
  const cols = Math.ceil(Math.sqrt(n * (usableW / usableH)));
  const rows = Math.ceil(n / cols);
  const cellW = usableW / cols;
  const cellH = usableH / rows;

  // Place each tamagotchi in a grid cell with hash-based jitter
  const placed: { id: string; x: number; y: number }[] = [];
  for (let i = 0; i < n; i++) {
    const id = userIds[i];
    const hash = stableHash(id);
    const col = i % cols;
    const row = Math.floor(i / cols);

    // Center of cell + small jitter from hash (max ±20% of cell size)
    const jitterX = ((hash % 100) / 100 - 0.5) * cellW * 0.35;
    const jitterY = (((hash >> 8) % 100) / 100 - 0.5) * cellH * 0.35;
    let x = pad + (col + 0.5) * cellW + jitterX;
    let y = pad + (row + 0.5) * cellH + jitterY;

    // Clamp to bounds
    x = Math.max(pad, Math.min(w - pad, x));
    y = Math.max(pad, Math.min(h - pad, y));
    placed.push({ id, x, y });
  }

  // Repulsion passes to push apart any that are too close
  for (let pass = 0; pass < 15; pass++) {
    for (let i = 0; i < placed.length; i++) {
      for (let j = i + 1; j < placed.length; j++) {
        const dx = placed[i].x - placed[j].x;
        const dy = placed[i].y - placed[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < MIN_DIST && dist > 0.1) {
          const push = (MIN_DIST - dist) / 2 + 1;
          const angle = Math.atan2(dy, dx);
          placed[i].x += Math.cos(angle) * push;
          placed[i].y += Math.sin(angle) * push;
          placed[j].x -= Math.cos(angle) * push;
          placed[j].y -= Math.sin(angle) * push;
        } else if (dist <= 0.1) {
          // Identical positions: push apart arbitrarily
          placed[i].x += MIN_DIST * 0.5;
          placed[j].x -= MIN_DIST * 0.5;
        }
      }
    }
    // Clamp after each pass
    for (const p of placed) {
      p.x = Math.max(pad, Math.min(w - pad, p.x));
      p.y = Math.max(pad, Math.min(h - pad, p.y));
    }
  }

  for (const p of placed) {
    positions[p.id] = { x: p.x, y: p.y };
  }
  return positions;
}

export default function AgentsPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [activities, setActivities] = useState<DatingActivity[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ w: 1200, h: 700 });

  const fetchData = useCallback(async () => {
    try {
      const [profRes, actRes] = await Promise.all([
        fetch("/api/profile"),
        fetch("/api/agents/activity"),
      ]);
      const profData = await profRes.json();
      const actData = await actRes.json();
      setProfiles(profData.profiles || []);
      setActivities(actData.activities || []);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 2000);
    return () => clearInterval(interval);
  }, [fetchData]);

  useEffect(() => {
    const update = () => {
      if (containerRef.current) {
        setDims({
          w: containerRef.current.clientWidth,
          h: containerRef.current.clientHeight,
        });
      }
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const userIds = useMemo(
    () => profiles.map((p) => p.metadata?.subject_id || "?"),
    [profiles]
  );

  const homePositions = useMemo(
    () => getRoomPositions(userIds, dims.w, dims.h),
    [userIds, dims]
  );

  const TAMA_SIZE = 70;

  // Build activity lookup
  const activityByUser: Record<string, DatingActivity> = {};
  for (const act of activities) {
    activityByUser[act.requesterId] = act;
  }

  // Who is being talked to right now?
  const beingTargeted = new Set<string>();
  for (const act of activities) {
    if (act.currentTargetId) beingTargeted.add(act.currentTargetId);
  }

  // Compute live position: if dating someone, walk right up next to them
  const getLivePosition = (userId: string) => {
    const home = homePositions[userId] || { x: dims.w / 2, y: dims.h / 2 };
    const act = activityByUser[userId];
    if (!act?.currentTargetId) return home;

    const targetHome = homePositions[act.currentTargetId];
    if (!targetHome) return home;

    // Walk to right next to the target (offset slightly so they face each other)
    const dx = targetHome.x - home.x;
    const dy = targetHome.y - home.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 1) return home;

    // Stop ~40px away from the target center (so they're shoulder to shoulder)
    const stopDist = TAMA_SIZE * 0.6;
    const nx = dx / dist;
    const ny = dy / dist;
    return {
      x: targetHome.x - nx * stopDist,
      y: targetHome.y - ny * stopDist,
    };
  };

  const getState = (userId: string): TamagotchiState => {
    if (activityByUser[userId]?.currentTargetId) return "dating";
    if (beingTargeted.has(userId)) return "interact";
    return "idle";
  };

  return (
    <div className="fixed inset-0 bg-black overflow-hidden" ref={containerRef}>
      {/* Tamagotchis scattered naturally */}
      {userIds.map((userId) => {
        const pos = getLivePosition(userId);
        const state = getState(userId);
        const isBusy = state === "dating" || state === "interact";

        return (
          <div
            key={userId}
            className="absolute flex flex-col items-center"
            style={{
              left: pos.x - TAMA_SIZE / 2,
              top: pos.y - TAMA_SIZE / 2,
              width: TAMA_SIZE,
              transition: "left 2s cubic-bezier(.4,0,.2,1), top 2s cubic-bezier(.4,0,.2,1)",
              zIndex: isBusy ? 10 : 1,
            }}
          >
            <div style={{ width: TAMA_SIZE, height: TAMA_SIZE }}>
              <Tamagotchi state={state} userId={userId} />
            </div>
            <span
              className="text-[9px] font-mono mt-0.5 text-center truncate w-full"
              style={{
                color: state === "interact"
                  ? "#FFD700"
                  : state === "dating"
                    ? "#FF69B4"
                    : "rgba(255,255,255,0.25)",
              }}
            >
              {userId}
            </span>
          </div>
        );
      })}
    </div>
  );
}
