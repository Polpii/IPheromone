"use client";

import { useEffect, useState, useMemo } from "react";

export type TamagotchiState = "idle" | "wave" | "listen" | "think" | "happy" | "dating" | "interact";

// 10 unique pixel-art shapes — each 14 chars wide, 17 rows tall
// Color key: G=accent, g=accent2, C=body, c=detail, h=belly, W=white, K=pupil, P=pink, M=mouth, A=arm, D=feet
const SHAPES: string[][] = [
  // 0 — Classic
  [
    "      GG      ",
    "      gg      ",
    "    CCCCCC    ",
    "   CCCCCCCC   ",
    "  CCCCCCCCCC  ",
    "  WWWcCCcWWW  ",
    "  WKKcCCcKKW  ",
    "  WWWcCCcWWW  ",
    " ACPCCCCCPCA  ",
    " ACCCCMMCCCA  ",
    "  CCCCCCCCCC  ",
    "  CChCCCChCC  ",
    "   CCCCCCCC   ",
    "    CCCCCC    ",
    "     CCCC     ",
    "              ",
    "   DD    DD   ",
  ],
  // 1 — Cat (pointed ears)
  [
    " GG        GG ",
    "  CG      GC  ",
    "   CCCCCCCC   ",
    "  CCCCCCCCCC  ",
    "  CCCCCCCCCC  ",
    "  WWWcCCcWWW  ",
    "  WKKcCCcKKW  ",
    "  WWWcCCcWWW  ",
    "  CCPCCCCCPC  ",
    "  CCCCMMCCCC  ",
    "  CCCCCCCCCC  ",
    "   CChCChCC   ",
    "    CCCCCC    ",
    "     CCCC     ",
    "              ",
    "   DD    DD   ",
    "              ",
  ],
  // 2 — Ghost (wavy bottom, no feet)
  [
    "              ",
    "    CCCCCC    ",
    "   CCCCCCCC   ",
    "  CCCCCCCCCC  ",
    "  CCCCCCCCCC  ",
    "  WWWcCCcWWW  ",
    "  WKKcCCcKKW  ",
    "  WWWcCCcWWW  ",
    "  CCCCCCCCCC  ",
    "  CCCCMMCCCC  ",
    "  CCCCCCCCCC  ",
    "  CCCCCCCCCC  ",
    "  CCCCCCCCCC  ",
    "  CChCCCChCC  ",
    " CC CC  CC CC ",
    "  C  C  C  C  ",
    "              ",
  ],
  // 3 — Robot (square, screen-face)
  [
    "     GGGG     ",
    "      gg      ",
    "  CCCCCCCCCC  ",
    "  CCCCCCCCCC  ",
    "  CCCCCCCCCC  ",
    "  CWWWccWWWC  ",
    "  CWKKccKKWC  ",
    "  CWWWccWWWC  ",
    "  CCCCCCCCCC  ",
    "  CCCCMMCCCC  ",
    " ACCCCCCCCCA  ",
    " ACCCCCCCCCA  ",
    "  CChCCCChCC  ",
    "  CCCCCCCCCC  ",
    "  CCCCCCCCCC  ",
    "  DDDD  DDDD  ",
    "              ",
  ],
  // 4 — Bear (round ears)
  [
    "  CC      CC  ",
    " CCCC    CCCC ",
    "  CCCCCCCCCC  ",
    "  CCCCCCCCCC  ",
    "  CCCCCCCCCC  ",
    "  WWWcCCcWWW  ",
    "  WKKcCCcKKW  ",
    "  WWWcCCcWWW  ",
    "  CCPCCCCCPC  ",
    "   CCCMMCCC   ",
    "  CCCCCCCCCC  ",
    "  CChCCCChCC  ",
    "   CCCCCCCC   ",
    "    CCCCCC    ",
    "     CCCC     ",
    "   DD    DD   ",
    "              ",
  ],
  // 5 — Bunny (long ears)
  [
    "   CC    CC   ",
    "   CC    CC   ",
    "   CC    CC   ",
    "   CCCCCCCC   ",
    "  CCCCCCCCCC  ",
    "  WWWcCCcWWW  ",
    "  WKKcCCcKKW  ",
    "  WWWcCCcWWW  ",
    "  PPCCCCCCPP  ",
    "   CCCMMCCC   ",
    "  CCCCCCCCCC  ",
    "  CChCCCChCC  ",
    "   CCCCCCCC   ",
    "    CCCCCC    ",
    "     CCCC     ",
    "   DD    DD   ",
    "              ",
  ],
  // 6 — Alien (big head, thin body)
  [
    "      GG      ",
    "   GGGGGGGG   ",
    "  GGGGGGGGGG  ",
    " CCCCCCCCCCCC ",
    " CCCCCCCCCCCC ",
    " CWWWcCCcWWWC ",
    " CWKKcCCcKKWC ",
    " CWWWcCCcWWWC ",
    "  CCCCCCCCCC  ",
    "  CCCCMMCCCC  ",
    "   CCCCCCCC   ",
    "    CCCCCC    ",
    "    CChChC    ",
    "     CCCC     ",
    "      CC      ",
    "    DD  DD    ",
    "              ",
  ],
  // 7 — Penguin (round belly, wings)
  [
    "              ",
    "    CCCCCC    ",
    "   CCCCCCCC   ",
    "  CCCCCCCCCC  ",
    "  CCCCCCCCCC  ",
    "  WWWcCCcWWW  ",
    "  WKKcCCcKKW  ",
    "  WWWcCCcWWW  ",
    "AACCCCCCCCAA  ",
    "AACCCCMMCCAA  ",
    " AChCCCCChCA  ",
    " AChCCCCChCA  ",
    "  ChhCCChhC   ",
    "   CCCCCCCC   ",
    "    CCCCCC    ",
    "   DDD  DDD   ",
    "              ",
  ],
  // 8 — Mushroom (wide cap, small stem)
  [
    "   GGGGGGGG   ",
    "  GGGGGGGGGG  ",
    " GGGGGGGGGGGG ",
    " GGhGGGGGGhGG ",
    " GGGGGGGGGGGG ",
    "  CCCCCCCCCC  ",
    "  WWWcCCcWWW  ",
    "  WKKcCCcKKW  ",
    "  WWWcCCcWWW  ",
    "   CCCCCCCC   ",
    "    CCMMCC    ",
    "    CCCCCC    ",
    "    CCCCCC    ",
    "    CChChC    ",
    "    CCCCCC    ",
    "   DDDDDDDD   ",
    "              ",
  ],
  // 9 — Octopus (dome head, tentacles)
  [
    "              ",
    "    CCCCCC    ",
    "   CCCCCCCC   ",
    "  CCCCCCCCCC  ",
    "  CCCCCCCCCC  ",
    "  WWWcCCcWWW  ",
    "  WKKcCCcKKW  ",
    "  WWWcCCcWWW  ",
    "  CCPCCCCCPC  ",
    "  CCCCMMCCCC  ",
    "  CCCCCCCCCC  ",
    " CCCCCCCCCCCC ",
    " DC DC DC DC  ",
    "  D  D  D  D  ",
    " DC DC DC DC  ",
    "  D  D  D  D  ",
    "              ",
  ],
];

// 10 color palettes
const PALETTES: Record<string, string>[] = [
  { G: "#FFD700", g: "#FFA000", C: "#00E5FF", c: "#B2EBF2", h: "#4DD0E1", W: "#FFFFFF", K: "#1A1A2E", P: "#FF69B4", M: "#FF4081", A: "#00BCD4", D: "#00838F" },
  { G: "#FF6B6B", g: "#EE5A24", C: "#FF6348", c: "#FFB8B8", h: "#FF4757", W: "#FFFFFF", K: "#1A1A2E", P: "#FFDD59", M: "#FFC312", A: "#FF3838", D: "#C44569" },
  { G: "#A3CB38", g: "#009432", C: "#6AB04C", c: "#BADC58", h: "#7BED9F", W: "#FFFFFF", K: "#1A1A2E", P: "#E056A0", M: "#D63031", A: "#2ECC71", D: "#1B9CFC" },
  { G: "#E056A0", g: "#B83280", C: "#D980FA", c: "#E8AFFF", h: "#C56CF0", W: "#FFFFFF", K: "#1A1A2E", P: "#FF69B4", M: "#FDA7DF", A: "#BE2EDD", D: "#6C5CE7" },
  { G: "#FFC312", g: "#F79F1F", C: "#F39C12", c: "#FFE0A0", h: "#FDCB6E", W: "#FFFFFF", K: "#1A1A2E", P: "#E17055", M: "#D63031", A: "#E67E22", D: "#D35400" },
  { G: "#1B9CFC", g: "#0652DD", C: "#3742FA", c: "#A4B0F5", h: "#70A1FF", W: "#FFFFFF", K: "#1A1A2E", P: "#7BED9F", M: "#2ED573", A: "#1E90FF", D: "#3742FA" },
  { G: "#FDA7DF", g: "#D63031", C: "#FD79A8", c: "#FFCCCC", h: "#FF6B81", W: "#FFFFFF", K: "#1A1A2E", P: "#E84393", M: "#FF4081", A: "#E84393", D: "#B53471" },
  { G: "#55E6C1", g: "#58B19F", C: "#00D2D3", c: "#AAFFEE", h: "#7EFACC", W: "#FFFFFF", K: "#1A1A2E", P: "#FECA57", M: "#FF9FF3", A: "#48DBFB", D: "#01A3A4" },
  { G: "#FF9F43", g: "#EE5A24", C: "#FFA502", c: "#FFD8A8", h: "#FECA57", W: "#FFFFFF", K: "#1A1A2E", P: "#FF6348", M: "#EE5A24", A: "#E67E22", D: "#CC8E35" },
  { G: "#C4E538", g: "#A3CB38", C: "#7BED9F", c: "#DFFFD6", h: "#55E6C1", W: "#FFFFFF", K: "#1A1A2E", P: "#FECA57", M: "#BADC58", A: "#33D9B2", D: "#218C74" },
];

interface Props {
  state?: TamagotchiState;
  userId?: string;
  className?: string;
}

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

export default function Tamagotchi({ state = "idle", userId, className = "" }: Props) {
  const [blink, setBlink] = useState(false);

  useEffect(() => {
    const interval = setInterval(
      () => {
        setBlink(true);
        setTimeout(() => setBlink(false), 150);
      },
      2500 + Math.random() * 2000
    );
    return () => clearInterval(interval);
  }, []);

  const hash = useMemo(() => (userId ? hashStr(userId) : 0), [userId]);
  const COLORS = useMemo(() => PALETTES[hash % PALETTES.length], [hash]);
  const shape = useMemo(() => SHAPES[Math.floor(hash / SHAPES.length) % SHAPES.length], [hash]);

  const pixels = useMemo(() => {
    const result: { x: number; y: number; color: string }[] = [];
    for (let y = 0; y < shape.length; y++) {
      const row = shape[y];
      for (let x = 0; x < row.length; x++) {
        let char = row[x];
        // Blink: close eyes by replacing W→C, K→C
        if (blink && (char === "W" || char === "K")) char = "C";
        if (char !== " " && COLORS[char]) {
          result.push({ x, y, color: COLORS[char] });
        }
      }
    }
    return result;
  }, [blink, COLORS, shape]);

  const animClass =
    state === "idle"
      ? "animate-float"
      : state === "wave"
        ? "animate-wave"
        : state === "listen"
          ? "animate-listen"
          : state === "think"
            ? "animate-think"
            : state === "dating"
              ? "animate-dating"
              : state === "interact"
                ? "animate-interact"
                : "";

  return (
    <div className={`relative ${animClass} ${className}`}>
      {/* Ripple waves for dating state */}
      {state === "dating" && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="absolute w-[140%] h-[140%] rounded-full border border-current opacity-0 animate-ripple-1" style={{ color: COLORS.C }} />
          <div className="absolute w-[140%] h-[140%] rounded-full border border-current opacity-0 animate-ripple-2" style={{ color: COLORS.C }} />
          <div className="absolute w-[140%] h-[140%] rounded-full border border-current opacity-0 animate-ripple-3" style={{ color: COLORS.C }} />
        </div>
      )}
      {/* Ripple waves for interact state */}
      {state === "interact" && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="absolute w-[120%] h-[120%] rounded-full border-2 border-current opacity-0 animate-ripple-fast-1" style={{ color: COLORS.G }} />
          <div className="absolute w-[120%] h-[120%] rounded-full border-2 border-current opacity-0 animate-ripple-fast-2" style={{ color: COLORS.G }} />
        </div>
      )}
      <svg
        viewBox="0 0 14 17"
        className="w-full h-full"
        style={{ imageRendering: "pixelated" }}
      >
        {state === "listen" && (
          <rect
            x="-1"
            y="-1"
            width="16"
            height="19"
            fill="none"
            stroke={COLORS.C}
            strokeWidth="0.3"
            opacity="0.6"
            rx="1"
          />
        )}
        {pixels.map((p, i) => (
          <rect
            key={i}
            x={p.x}
            y={p.y}
            width="1"
            height="1"
            fill={p.color}
          />
        ))}
      </svg>
    </div>
  );
}
