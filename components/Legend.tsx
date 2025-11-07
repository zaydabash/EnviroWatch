"use client";

import { Card } from "@/components/ui/card";

type LegendProps = {
  radiusKm: number;
  stationsCount: number;
};

export function Legend({ radiusKm, stationsCount }: LegendProps) {
  const bands = [
    { label: "Good (0–50)", color: "#10b981", band: "good" },
    { label: "Moderate (51–100)", color: "#eab308", band: "moderate" },
    { label: "Unhealthy (101–200)", color: "#f97316", band: "unhealthy" },
    { label: "Very Unhealthy (201–300)", color: "#ef4444", band: "very-unhealthy" },
    { label: "Hazardous (301+)", color: "#a855f7", band: "hazardous" },
  ];

  return (
    <Card className="bg-slate-900/90 border-slate-800 rounded-xl p-3 backdrop-blur shadow-lg">
      <div className="text-xs font-semibold text-slate-50 mb-2">Map Legend</div>
      <div className="space-y-2 text-xs text-slate-400">
        <div>Radius: {radiusKm} km</div>
        <div>Stations: {stationsCount}</div>
        <div className="pt-2 border-t border-slate-800 space-y-1.5">
          {bands.map((band) => (
            <div key={band.band} className="flex items-center gap-2">
              <div
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: band.color }}
              />
              <span className="text-[10px]">{band.label}</span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

