"use client";

import { useState, useEffect, useRef, useMemo } from "react";

interface Profile {
  metadata?: {
    subject_id?: string;
    chronological_age?: string;
    life_stage?: string;
  };
  goals?: {
    vision?: string;
  };
  focus_areas?: {
    intellectual?: string[];
    crafts?: string[];
  };
}

interface ConvMessage {
  from: string;
  to: string;
  content: string;
  timestamp: string;
}

interface Conversation {
  id: string;
  agentA: string;
  agentB: string;
  query: string;
  requestedBy: string;
  messages: ConvMessage[];
  result?: {
    score: number;
    summary: string;
    compatibility: Record<string, number>;
  };
  createdAt: string;
}

export default function Home() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  // Track which user groups are expanded and which individual conversations are open
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());
  const [openConvs, setOpenConvs] = useState<Set<string>>(new Set());
  const prevCountRef = useRef(0);

  const fetchData = async (initial = false) => {
    if (initial) setLoading(true);
    try {
      const [convRes, profRes] = await Promise.all([
        fetch("/api/agents/conversations"),
        fetch("/api/profile"),
      ]);
      const convData = await convRes.json();
      const profData = await profRes.json();
      const newConvs: Conversation[] = convData.conversations || [];
      setConversations(newConvs);
      setProfiles(profData.profiles || []);
      prevCountRef.current = newConvs.length;
    } catch {
      // no data yet
    }
    if (initial) setLoading(false);
  };

  useEffect(() => {
    fetchData(true);
    const interval = setInterval(() => fetchData(false), 3000);
    return () => clearInterval(interval);
  }, []);

  const createUser = async () => {
    setSeeding(true);
    try {
      await fetch("/api/seed", { method: "POST" });
      await fetchData(false);
    } catch {
      // ignore
    }
    setSeeding(false);
  };

  // Group conversations by requestedBy user
  const convsByUser = useMemo(() => {
    const map: Record<string, Conversation[]> = {};
    for (const conv of conversations) {
      const key = conv.requestedBy || conv.agentA;
      if (!map[key]) map[key] = [];
      map[key].push(conv);
    }
    return map;
  }, [conversations]);

  const toggleUser = (userId: string) => {
    setExpandedUsers((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  const toggleConv = (convId: string) => {
    setOpenConvs((prev) => {
      const next = new Set(prev);
      if (next.has(convId)) next.delete(convId);
      else next.add(convId);
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-black text-white overflow-y-auto">
      <div className="max-w-4xl mx-auto p-4 pb-20">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 sticky top-0 bg-black/90 backdrop-blur-sm py-3 z-10">
          <h1 className="text-xl font-bold text-cyan-400">
            Pheromones &mdash; Agent Network
          </h1>
          <div className="flex gap-2 items-center">
            <a href="/agents" className="text-xs text-white/30 hover:text-white/60 transition-colors">
              Visualize
            </a>
            <button
              onClick={createUser}
              disabled={seeding}
              className="text-xs bg-cyan-800 hover:bg-cyan-700 px-3 py-1.5 rounded-full transition-colors disabled:opacity-50"
            >
              {seeding ? "Creating..." : "+ Create User"}
            </button>
            <span className="text-[10px] text-green-400/60 self-center">● live</span>
          </div>
        </div>

        {/* Users grid */}
        <div className="mb-8">
          <h2 className="text-sm font-medium text-white/50 mb-3">
            Users ({profiles.length})
          </h2>
          {profiles.length === 0 ? (
            <p className="text-white/20 text-xs">
              No users yet. Click &ldquo;Seed 10 Users&rdquo; or go to{" "}
              <span className="text-cyan-400">/user/1</span> to create one.
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {profiles.map((p, i) => {
                const id = p.metadata?.subject_id || `${i + 1}`;
                return (
                  <a
                    key={id}
                    href={`/user/${encodeURIComponent(id)}`}
                    className="bg-white/5 border border-white/10 rounded-lg p-3 hover:bg-white/10 transition-colors block"
                  >
                    <p className="text-cyan-400 text-sm font-mono">{id}</p>
                    <p className="text-white/40 text-xs mt-1 truncate">
                      {p.metadata?.life_stage || "—"}
                    </p>
                    <p className="text-white/20 text-[10px] mt-1 truncate">
                      {p.goals?.vision || "—"}
                    </p>
                  </a>
                );
              })}
            </div>
          )}
        </div>

        {/* Conversations grouped by user — compact & collapsible */}
        <div>
          <h2 className="text-sm font-medium text-white/50 mb-3">
            Conversations ({conversations.length})
          </h2>

          {loading ? (
            <p className="text-white/50 text-sm animate-pulse">Loading...</p>
          ) : conversations.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-white/30 text-sm mb-2">
                No agent conversations yet.
              </p>
              <p className="text-white/20 text-xs">
                Go to a user page, press L, and ask to find matches.
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {Object.entries(convsByUser).map(([userId, userConvs]) => {
                const isUserExpanded = expandedUsers.has(userId);
                const avgScore = Math.round(
                  userConvs.reduce((s, c) => s + (c.result?.score ?? 0), 0) / userConvs.length
                );
                return (
                  <div key={userId} className="rounded-lg overflow-hidden">
                    {/* User header — click to expand list */}
                    <button
                      onClick={() => toggleUser(userId)}
                      className="w-full flex items-center justify-between px-3 py-2 hover:bg-white/5 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] transition-transform ${isUserExpanded ? "rotate-90" : ""}`}>
                          ▶
                        </span>
                        <span className="text-cyan-400 text-xs font-mono">{userId}</span>
                        <span className="text-white/20 text-[10px]">
                          {userConvs.length} conv{userConvs.length > 1 ? "s" : ""}
                        </span>
                      </div>
                      <span className="text-white/20 text-[10px]">avg {avgScore}%</span>
                    </button>

                    {/* Expanded: list of conversations */}
                    {isUserExpanded && (
                      <div className="ml-4 border-l border-white/5 space-y-0.5">
                        {userConvs.map((conv) => {
                          const isOpen = openConvs.has(conv.id);
                          return (
                            <div key={conv.id}>
                              {/* Conversation row — compact */}
                              <button
                                onClick={() => toggleConv(conv.id)}
                                className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-white/5 transition-colors text-left"
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className={`text-[9px] transition-transform ${isOpen ? "rotate-90" : ""}`}>
                                    ▶
                                  </span>
                                  <span className="text-white/50 text-[11px] font-mono truncate">
                                    {conv.agentB}
                                  </span>
                                  <span className="text-white/15 text-[10px] shrink-0">
                                    {conv.messages.length} msg
                                  </span>
                                </div>
                                {conv.result && (
                                  <span
                                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${
                                      conv.result.score >= 70
                                        ? "bg-green-500/20 text-green-400"
                                        : conv.result.score >= 40
                                          ? "bg-yellow-500/20 text-yellow-400"
                                          : "bg-red-500/20 text-red-400"
                                    }`}
                                  >
                                    {conv.result.score}%
                                  </span>
                                )}
                              </button>

                              {/* Open conversation — messages */}
                              {isOpen && (
                                <div className="ml-4 border-l border-white/5 p-2 space-y-1.5 max-h-[40vh] overflow-y-auto">
                                  {conv.messages.map((msg, mi) => {
                                    const isA = msg.from === `agent-${conv.agentA}`;
                                    return (
                                      <div
                                        key={mi}
                                        className={`flex ${isA ? "justify-start" : "justify-end"}`}
                                      >
                                        <div
                                          className={`max-w-[85%] rounded-lg px-2.5 py-1.5 text-[11px] ${
                                            isA
                                              ? "bg-cyan-900/30 text-cyan-200"
                                              : "bg-pink-900/30 text-pink-200"
                                          }`}
                                        >
                                          <p className="font-mono text-[9px] opacity-40 mb-0.5">
                                            {msg.from.replace("agent-", "")}
                                          </p>
                                          {msg.content}
                                        </div>
                                      </div>
                                    );
                                  })}
                                  {conv.result && (
                                    <div className="mt-2 pt-2 border-t border-white/5">
                                      <p className="text-white/50 text-[11px] mb-1">
                                        {conv.result.summary}
                                      </p>
                                      <div className="flex flex-wrap gap-x-4 gap-y-0.5">
                                        {Object.entries(conv.result.compatibility).map(
                                          ([key, val]) => (
                                            <span key={key} className="text-[10px]">
                                              <span className="text-white/30 capitalize">{key}</span>{" "}
                                              <span
                                                className={`font-mono ${
                                                  val >= 70
                                                    ? "text-green-400"
                                                    : val >= 40
                                                      ? "text-yellow-400"
                                                      : "text-red-400"
                                                }`}
                                              >
                                                {val}
                                              </span>
                                            </span>
                                          )
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
