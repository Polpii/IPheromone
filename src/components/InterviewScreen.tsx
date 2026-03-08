"use client";

import { useState, useRef, useEffect, useCallback } from "react";

interface Props {
  deviceId: string;
  onComplete: (profile: Record<string, unknown>) => void;
}

interface Message {
  role: "assistant" | "user";
  content: string;
}

export default function InterviewScreen({ deviceId, onComplete }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState("");
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    startInterview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    inputRef.current?.focus();
  }, [currentQuestion]);

  const startInterview = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [], deviceId }),
      });
      const data = await res.json();
      if (data.message) {
        setCurrentQuestion(data.message);
        setMessages([{ role: "assistant", content: data.message }]);
      }
    } catch {
      setCurrentQuestion("Something went wrong. Refresh to retry.");
    }
    setIsLoading(false);
  };

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isLoading) return;
    const updated: Message[] = [
      ...messages,
      { role: "user", content: text.trim() },
    ];
    setMessages(updated);
    setInput("");
    setCurrentQuestion("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: updated, deviceId }),
      });
      const data = await res.json();

      if (data.complete && data.profile) {
        await fetch("/api/profile", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ deviceId, profile: data.profile }),
        });
        setCurrentQuestion("Profile complete!");
        setTimeout(() => onComplete(data.profile), 1200);
      } else if (data.message) {
        setCurrentQuestion(data.message);
        setMessages([
          ...updated,
          { role: "assistant", content: data.message },
        ]);
      }
    } catch {
      setCurrentQuestion("Error. Try again.");
    }
    setIsLoading(false);
  }, [messages, isLoading, deviceId, onComplete]);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;

    const recognition = new SR();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((r: SpeechRecognitionResult) => r[0].transcript)
        .join("");
      setInput(transcript);
      if (event.results[0].isFinal) {
        setIsListening(false);
        sendMessage(transcript);
      }
    };

    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  };

  return (
    <div className="fixed inset-0 bg-black flex flex-col items-center justify-center px-4">
      {/* Current question - full width centered */}
      <div className="flex-1 flex items-center justify-center w-full">
        {isLoading ? (
          <p className="text-cyan-400 animate-pulse" style={{ fontSize: "clamp(24px, 7vw, 42px)" }}>
            ...
          </p>
        ) : (
          <p
            className="text-cyan-400 text-center w-full px-4 transition-opacity duration-300"
            style={{ fontSize: "clamp(24px, 7vw, 42px)" }}
          >
            {currentQuestion}
          </p>
        )}
      </div>

      {/* Input bar */}
      <div className="w-full max-w-lg p-4 flex gap-2">
        <button
          onClick={toggleListening}
          className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-white text-sm ${
            isListening ? "bg-red-500 animate-pulse" : "bg-cyan-700"
          }`}
        >
          🎤
        </button>
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage(input)}
          className="flex-1 bg-white/5 text-white px-4 py-2 rounded-full outline-none border border-white/10 focus:border-cyan-500"
          style={{ fontSize: "clamp(14px, 3.5vw, 18px)" }}
          placeholder="Type or speak..."
        />
        <button
          onClick={() => sendMessage(input)}
          className="shrink-0 w-10 h-10 rounded-full bg-cyan-700 flex items-center justify-center text-white text-sm"
        >
          →
        </button>
      </div>
    </div>
  );
}
