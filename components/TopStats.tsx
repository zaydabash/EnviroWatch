"use client";

import { Gauge, Cloudy, AlertTriangle, Thermometer } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type TopStatsProps = {
  avgAqi: number;
  stations: number;
  anomalies: number;
  temp: number;
  loading?: boolean;
};

export function TopStats({ avgAqi, stations, anomalies, temp, loading }: TopStatsProps) {
  if (loading) {
    return (
      <div className="flex items-center gap-3">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="bg-slate-900/80 border-slate-800 rounded-2xl px-4 py-2 flex-1">
            <Skeleton className="h-4 w-16 mb-2" />
            <Skeleton className="h-6 w-12" />
          </Card>
        ))}
      </div>
    );
  }

  const getAqiColor = (aqi: number) => {
    if (aqi <= 50) return "text-emerald-400";
    if (aqi <= 100) return "text-yellow-400";
    if (aqi <= 150) return "text-orange-400";
    if (aqi <= 200) return "text-red-400";
    return "text-purple-400";
  };

  const getAqiGradient = (aqi: number) => {
    if (aqi <= 50) return "from-emerald-500 to-emerald-400";
    if (aqi <= 100) return "from-yellow-500 to-yellow-400";
    if (aqi <= 150) return "from-orange-500 to-orange-400";
    if (aqi <= 200) return "from-red-500 to-red-400";
    return "from-purple-500 to-purple-400";
  };

  return (
    <div className="flex items-center gap-3">
      <Card className="bg-slate-900/80 border-slate-800 rounded-2xl px-4 py-2 flex items-center gap-3 shadow-lg flex-1">
        <Gauge className="h-5 w-5 text-blue-400" />
        <div className="flex-1">
          <div className="text-[10px] tracking-[0.2em] text-slate-500 uppercase mb-1">
            Overall AQI
          </div>
          <div className={`text-lg font-semibold ${getAqiColor(avgAqi)}`}>
            {Math.round(avgAqi)}
          </div>
          <div className="h-1 rounded-full bg-slate-800 mt-1 overflow-hidden">
            <div
              className={`h-full bg-gradient-to-r ${getAqiGradient(avgAqi)}`}
              style={{ width: `${Math.min((avgAqi / 300) * 100, 100)}%` }}
            />
          </div>
        </div>
      </Card>

      <Card className="bg-slate-900/80 border-slate-800 rounded-2xl px-4 py-2 flex items-center gap-3 shadow-lg flex-1">
        <Cloudy className="h-5 w-5 text-blue-400" />
        <div className="flex-1">
          <div className="text-[10px] tracking-[0.2em] text-slate-500 uppercase mb-1">
            Stations
          </div>
          <div className="text-lg font-semibold text-slate-50">{stations}</div>
          <div className="h-1 rounded-full bg-slate-800 mt-1" />
        </div>
      </Card>

      <Card className="bg-slate-900/80 border-slate-800 rounded-2xl px-4 py-2 flex items-center gap-3 shadow-lg flex-1">
        <AlertTriangle className="h-5 w-5 text-violet-400" />
        <div className="flex-1">
          <div className="text-[10px] tracking-[0.2em] text-slate-500 uppercase mb-1">
            Anomalies
          </div>
          <div className={`text-lg font-semibold ${anomalies > 0 ? "text-violet-400" : "text-slate-50"}`}>
            {anomalies}
          </div>
          <div className="h-1 rounded-full bg-slate-800 mt-1 overflow-hidden">
            {anomalies > 0 && (
              <div
                className="h-full bg-gradient-to-r from-violet-500 to-violet-400"
                style={{ width: `${Math.min((anomalies / stations) * 100, 100)}%` }}
              />
            )}
          </div>
        </div>
      </Card>

      <Card className="bg-slate-900/80 border-slate-800 rounded-2xl px-4 py-2 flex items-center gap-3 shadow-lg flex-1">
        <Thermometer className="h-5 w-5 text-blue-400" />
        <div className="flex-1">
          <div className="text-[10px] tracking-[0.2em] text-slate-500 uppercase mb-1">
            Temperature
          </div>
          <div className="text-lg font-semibold text-slate-50">
            {Math.round(temp)}°C
          </div>
          <div className="h-1 rounded-full bg-slate-800 mt-1" />
        </div>
      </Card>
    </div>
  );
}

