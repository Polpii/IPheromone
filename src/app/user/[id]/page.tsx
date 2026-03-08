"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import WelcomeScreen from "@/components/WelcomeScreen";
import InterviewScreen from "@/components/InterviewScreen";
import CompanionScreen from "@/components/CompanionScreen";

type Phase = "loading" | "welcome" | "interview" | "companion";

export default function UserPage() {
  const params = useParams();
  const userId = params.id as string;
  const [phase, setPhase] = useState<Phase>("loading");
  const [hasProfile, setHasProfile] = useState(false);

  useEffect(() => {
    if (!userId) return;
    fetch(`/api/profile?deviceId=${encodeURIComponent(userId)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.profile) setHasProfile(true);
        setPhase("welcome");
      })
      .catch(() => setPhase("welcome"));
  }, [userId]);

  const handleWelcomeComplete = useCallback(() => {
    setPhase(hasProfile ? "companion" : "interview");
  }, [hasProfile]);

  const handleInterviewComplete = useCallback(() => {
    setPhase("companion");
  }, []);

  if (phase === "loading" || !userId) {
    return <div className="fixed inset-0 bg-black" />;
  }

  switch (phase) {
    case "welcome":
      return (
        <WelcomeScreen onComplete={handleWelcomeComplete} userId={userId} />
      );
    case "interview":
      return (
        <InterviewScreen
          deviceId={userId}
          onComplete={handleInterviewComplete}
        />
      );
    case "companion":
      return <CompanionScreen deviceId={userId} />;
  }
}
