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
    <Card className="glass-panel rounded-xl p-3">
      <div className="text-xs font-semibold tracking-tight text-slate-50 mb-2">Map Legend</div>
      <div className="space-y-1.5 text-xs text-slate-400">
        <div className="flex justify-between gap-4">
          <span>Radius</span>
          <span className="tabular-nums text-slate-300">{radiusKm} km</span>
        </div>
        <div className="flex justify-between gap-4">
          <span>Stations</span>
          <span className="tabular-nums text-slate-300">{stationsCount}</span>
        </div>
        <div className="pt-2 border-t border-white/[0.06] space-y-1.5">
          {bands.map((band) => (
            <div key={band.band} className="flex items-center gap-2">
              <div
                className="h-2.5 w-2.5 rounded-full shrink-0"
                style={{ backgroundColor: band.color, boxShadow: `0 0 8px 0 ${band.color}66` }}
              />
              <span className="text-[10px]">{band.label}</span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

