"use client";

import { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAppStore } from "@/store/useAppStore";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";

type Message = {
  id: string;
  role: "system" | "user";
  text: string;
};

export function ChatPanel() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const {
    city,
    setCity,
    setRadius,
    setThreshold,
    toggleAnomaliesOnly,
    showAnomaliesOnly,
    setSelected,
    refreshAll,
    stations,
  } = useAppStore();

  useEffect(() => {
    // Seed initial messages
    setMessages([
      {
        id: "1",
        role: "system",
        text: `Hi, I'm EnviroWatch. I'm monitoring air quality in ${city}.`,
      },
      {
        id: "2",
        role: "system",
        text: "Try commands like: set city San Jose, filter aqi > 100, show anomalies.",
      },
    ]);
  }, []);

  useEffect(() => {
    // Auto-scroll to bottom
    const scrollArea = scrollRef.current?.querySelector('[data-radix-scroll-area-viewport]');
    if (scrollArea) {
      scrollArea.scrollTop = scrollArea.scrollHeight;
    }
  }, [messages]);

  const handleSend = () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      text: input.trim(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");

    // Parse commands
    const text = input.trim().toLowerCase();

    // set city <name>
    const cityMatch = text.match(/set city (.+)/);
    if (cityMatch) {
      const cityName = cityMatch[1].trim();
      setCity(cityName);
      refreshAll();
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "system",
          text: `City set to ${cityName} and data refreshed.`,
        },
      ]);
      return;
    }

    // filter aqi > <N>
    const aqiMatch = text.match(/filter aqi > (\d+)/);
    if (aqiMatch) {
      const threshold = parseInt(aqiMatch[1], 10);
      setThreshold(threshold);
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "system",
          text: `Showing stations with AQI > ${threshold}.`,
        },
      ]);
      return;
    }

    // radius <km>
    const radiusMatch = text.match(/radius (\d+)/);
    if (radiusMatch) {
      const km = parseInt(radiusMatch[1], 10);
      setRadius(km);
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "system",
          text: `Radius set to ${km} km.`,
        },
      ]);
      return;
    }

    // show anomalies
    if (text.includes("show anomalies")) {
      if (!showAnomaliesOnly) {
        toggleAnomaliesOnly();
      }
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "system",
          text: "Highlighting anomalous stations.",
        },
      ]);
      return;
    }

    // hide anomalies
    if (text.includes("hide anomalies")) {
      if (showAnomaliesOnly) {
        toggleAnomaliesOnly();
      }
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "system",
          text: "Showing all stations.",
        },
      ]);
      return;
    }

    // select <id> or select "<name>"
    const selectMatch = text.match(/select (.+)/);
    if (selectMatch) {
      const query = selectMatch[1].trim().replace(/["']/g, "");
      const station = stations.find(
        (s) => s.id === query || s.name.toLowerCase().includes(query.toLowerCase())
      );
      if (station) {
        setSelected(station.id);
        setMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            role: "system",
            text: `Selected station: ${station.name}.`,
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            role: "system",
            text: `Station not found: ${query}.`,
          },
        ]);
      }
      return;
    }

    // Default response
    setMessages((prev) => [
      ...prev,
      {
        id: (Date.now() + 1).toString(),
        role: "system",
        text: "Got it — use one of the commands above to change the view.",
      },
    ]);
  };

  return (
    <Card className="bg-gradient-to-b from-slate-950/80 to-slate-900/80 border-slate-800 rounded-2xl h-full flex flex-col shadow-xl">
      <div className="p-4 border-b border-slate-800">
        <div className="text-sm font-semibold text-slate-50">EnviroWatch</div>
        <div className="text-xs text-slate-400">{city}</div>
      </div>

      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-3">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`text-sm rounded-2xl px-3 py-2 max-w-[80%] ${
                  msg.role === "user"
                    ? "bg-blue-500/90 text-white rounded-br-none"
                    : "bg-slate-800/80 text-slate-200 rounded-bl-none"
                }`}
              >
                {msg.text}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      <div className="p-4 border-t border-slate-800 flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              handleSend();
            }
          }}
          placeholder="Type a command..."
          className="bg-slate-900/50 border-slate-700 text-slate-50"
        />
        <Button onClick={handleSend} size="icon" className="bg-blue-500 hover:bg-blue-600">
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </Card>
  );
}

