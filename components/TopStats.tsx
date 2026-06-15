"use client";

import { Gauge, Cloudy, AlertTriangle, Thermometer } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";

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
          <Card key={i} className="glass-panel rounded-xl px-4 py-2 flex-1">
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

  const cards = [
    {
      icon: Gauge,
      iconColor: "text-blue-400",
      label: "Overall AQI",
      value: Math.round(avgAqi),
      valueColor: getAqiColor(avgAqi),
      bar: (
        <div className="h-1 rounded-full bg-white/[0.06] mt-1 overflow-hidden">
          <div
            className={`h-full bg-gradient-to-r ${getAqiGradient(avgAqi)} transition-[width] duration-300 ease-[cubic-bezier(0.23,1,0.32,1)]`}
            style={{ width: `${Math.min((avgAqi / 300) * 100, 100)}%` }}
          />
        </div>
      ),
    },
    {
      icon: Cloudy,
      iconColor: "text-blue-400",
      label: "Stations",
      value: stations,
      valueColor: "text-slate-50",
      bar: <div className="h-1 rounded-full bg-white/[0.06] mt-1" />,
    },
    {
      icon: AlertTriangle,
      iconColor: "text-violet-400",
      label: "Anomalies",
      value: anomalies,
      valueColor: anomalies > 0 ? "text-violet-400" : "text-slate-50",
      bar: (
        <div className="h-1 rounded-full bg-white/[0.06] mt-1 overflow-hidden">
          {anomalies > 0 && (
            <div
              className="h-full bg-gradient-to-r from-violet-500 to-violet-400 transition-[width] duration-300 ease-[cubic-bezier(0.23,1,0.32,1)]"
              style={{ width: `${Math.min((anomalies / stations) * 100, 100)}%` }}
            />
          )}
        </div>
      ),
    },
    {
      icon: Thermometer,
      iconColor: "text-blue-400",
      label: "Temperature",
      value: `${Math.round(temp)}°C`,
      valueColor: "text-slate-50",
      bar: <div className="h-1 rounded-full bg-white/[0.06] mt-1" />,
    },
  ];

  return (
    <div className="flex items-center gap-3">
      {cards.map((card, i) => {
        const Icon = card.icon;
        return (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: [0.23, 1, 0.32, 1], delay: i * 0.05 }}
            className="flex-1"
          >
            <Card className="glass-panel rounded-xl px-4 py-2 flex items-center gap-3 transition-all duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] hover:-translate-y-0.5 hover:border-white/[0.12] hover:shadow-[0_12px_40px_-12px_rgb(0_0_0/0.7)]">
              <Icon className={`h-5 w-5 shrink-0 ${card.iconColor}`} />
              <div className="flex-1 min-w-0">
                <div className="text-[10px] tracking-[0.2em] text-slate-500 uppercase mb-1">
                  {card.label}
                </div>
                <div className={`text-lg font-medium tabular-nums ${card.valueColor}`}>
                  {card.value}
                </div>
                {card.bar}
              </div>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
}

