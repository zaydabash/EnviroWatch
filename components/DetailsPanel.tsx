"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAppStore } from "@/store/useAppStore";
import { Search, Copy, MapPin } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { motion } from "framer-motion";
import { toast } from "sonner";
import type { SeriesPoint } from "@/types";

export function DetailsPanel() {
  const { stations, selectedId, weather, city, setCenter } = useAppStore();
  const [history, setHistory] = useState<SeriesPoint[]>([]);
  const [historyStationId, setHistoryStationId] = useState<string>();

  const selectedStation = stations.find((s) => s.id === selectedId);
  const loadingHistory = selectedId !== undefined && historyStationId !== selectedId;

  useEffect(() => {
    if (!selectedId || !selectedStation) {
      return;
    }

    let ignore = false;

    fetch(`/api/openaq/history?stationId=${encodeURIComponent(selectedId)}&parameter=pm25`, {
      cache: "no-store",
    })
      .then((res) => {
        // Check response status before parsing JSON
        if (!res.ok && res.status === 404) {
          // 404 means no history data - this is expected for many stations
          return { error: "No history data available", upstreamStatus: 404 };
        }
        return res.json();
      })
      .then((data) => {
        if (ignore) return;
        if (data.error) {
          // Only log actual server errors (500+) - missing data (404) and generic failures are normal
          if (data.upstreamStatus && data.upstreamStatus >= 500) {
            console.error("History error:", data.error);
          }
          // Silently handle missing data or generic fetch failures
          setHistory([]);
        } else if (Array.isArray(data)) {
          setHistory(data);
        } else if (data.series) {
          setHistory(data.series);
        } else {
          setHistory([]);
        }
      })
      .catch((err) => {
        if (ignore) return;
        console.error("Error fetching history:", err);
        setHistory([]);
      })
      .finally(() => {
        if (!ignore) setHistoryStationId(selectedId);
      });

    return () => {
      ignore = true;
    };
  }, [selectedId, selectedStation]);

  const handleCenterMap = () => {
    if (selectedStation) {
      setCenter([selectedStation.lon, selectedStation.lat]);
      toast.success("Map centered on station");
    }
  };

  const handleCopyLink = () => {
    if (!selectedStation) return;

    const state = useAppStore.getState();
    const params = new URLSearchParams();
    params.set("city", state.city);
    params.set("select", selectedStation.id);
    
    const threshold = state.aqiThreshold;
    if (threshold !== null) {
      params.set("aqi_gt", threshold.toString());
    }
    
    const radius = state.radiusKm;
    if (radius !== 3) {
      params.set("radius", radius.toString());
    }
    
    if (state.showAnomaliesOnly) {
      params.set("anomalies", "1");
    }

    const url = `${window.location.origin}${window.location.pathname}?${params.toString()}`;
    navigator.clipboard.writeText(url);
    toast.success("Link copied to clipboard");
  };

  const getBandColor = (band: string) => {
    switch (band) {
      case "good":
        return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
      case "moderate":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      case "unhealthy":
        return "bg-orange-500/20 text-orange-400 border-orange-500/30";
      case "very-unhealthy":
        return "bg-red-500/20 text-red-400 border-red-500/30";
      case "hazardous":
        return "bg-purple-500/20 text-purple-400 border-purple-500/30";
      default:
        return "bg-slate-500/20 text-slate-400 border-slate-500/30";
    }
  };

  if (!selectedStation) {
    return (
      <Card className="glass-panel rounded-xl h-full flex flex-col items-center justify-center p-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
          className="flex flex-col items-center gap-4"
        >
          <div className="h-16 w-16 rounded-full bg-white/[0.04] border border-white/[0.06] flex items-center justify-center">
            <Search className="h-7 w-7 text-slate-400" />
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold tracking-tight text-slate-50 mb-1">No station selected</div>
            <div className="text-sm text-slate-400">
              Click a pin on the map or try &apos;show anomalies&apos; in the chat.
            </div>
          </div>
        </motion.div>
      </Card>
    );
  }

  const chartData = history.map((point) => ({
    time: new Date(point.time).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    value: Math.round(point.value * 10) / 10,
  }));

  return (
    <Card className="glass-panel rounded-xl h-full flex flex-col overflow-hidden">
      <motion.div
        key={selectedId}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
        className="flex flex-col h-full overflow-y-auto"
      >
        {/* Header */}
        <div className="p-4 border-b border-white/[0.06]">
          {selectedStation.anomaly && selectedStation.anomaly >= 75 ? (
            <Badge className="bg-violet-500/10 text-violet-400 border-violet-500/20 mb-3">
              ANOMALOUS
            </Badge>
          ) : (
            <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20 mb-3">
              STATION SELECTED
            </Badge>
          )}
          <div className="text-lg font-semibold tracking-tight text-slate-50 mb-1">{selectedStation.name}</div>
          <div className="text-xs text-slate-400 tabular-nums">
            {city} · {selectedStation.lat.toFixed(4)}, {selectedStation.lon.toFixed(4)}
          </div>
        </div>

        {/* Info grid */}
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-[10px] tracking-[0.2em] text-slate-500 uppercase mb-1">AQI</div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-semibold tabular-nums text-slate-50">{selectedStation.aqi}</span>
                <Badge className={getBandColor(selectedStation.band)}>
                  {selectedStation.band}
                </Badge>
              </div>
            </div>
            {selectedStation.anomaly !== undefined && (
              <div>
                <div className="text-[10px] tracking-[0.2em] text-slate-500 uppercase mb-1">Anomaly</div>
                <Badge
                  className={`tabular-nums ${
                    selectedStation.anomaly >= 75
                      ? "bg-violet-500/10 text-violet-400 border-violet-500/20"
                      : "bg-white/[0.04] text-slate-400 border-white/[0.06]"
                  }`}
                >
                  {selectedStation.anomaly}/100
                </Badge>
              </div>
            )}
          </div>

          {weather && (
            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-white/[0.06]">
              <div>
                <div className="text-[10px] tracking-[0.2em] text-slate-500 uppercase mb-1">Temperature</div>
                <div className="text-lg font-medium tabular-nums text-slate-50">{Math.round(weather.tempC)}°C</div>
              </div>
              <div>
                <div className="text-[10px] tracking-[0.2em] text-slate-500 uppercase mb-1">Wind Speed</div>
                <div className="text-lg font-medium tabular-nums text-slate-50">{Math.round(weather.windKph)} kph</div>
              </div>
            </div>
          )}

          {/* Pollutant chips */}
          <div className="pt-2 border-t border-white/[0.06]">
            <div className="text-[10px] tracking-[0.2em] text-slate-500 uppercase mb-2">Pollutants</div>
            <div className="flex flex-wrap gap-2">
              {selectedStation.pollutants.pm25 !== undefined && (
                <Badge className="bg-white/[0.04] border-white/[0.06] text-slate-300 tabular-nums">
                  PM2.5: {selectedStation.pollutants.pm25.toFixed(1)} µg/m³
                </Badge>
              )}
              {selectedStation.pollutants.pm10 !== undefined && (
                <Badge className="bg-white/[0.04] border-white/[0.06] text-slate-300 tabular-nums">
                  PM10: {selectedStation.pollutants.pm10.toFixed(1)} µg/m³
                </Badge>
              )}
              {selectedStation.pollutants.o3 !== undefined && (
                <Badge className="bg-white/[0.04] border-white/[0.06] text-slate-300 tabular-nums">
                  O₃: {selectedStation.pollutants.o3.toFixed(1)} ppb
                </Badge>
              )}
              {selectedStation.pollutants.no2 !== undefined && (
                <Badge className="bg-white/[0.04] border-white/[0.06] text-slate-300 tabular-nums">
                  NO₂: {selectedStation.pollutants.no2.toFixed(1)} ppb
                </Badge>
              )}
              {selectedStation.pollutants.so2 !== undefined && (
                <Badge className="bg-white/[0.04] border-white/[0.06] text-slate-300 tabular-nums">
                  SO₂: {selectedStation.pollutants.so2.toFixed(1)} ppb
                </Badge>
              )}
              {selectedStation.pollutants.co !== undefined && (
                <Badge className="bg-white/[0.04] border-white/[0.06] text-slate-300 tabular-nums">
                  CO: {selectedStation.pollutants.co.toFixed(1)} ppm
                </Badge>
              )}
            </div>
          </div>

          {/* Chart */}
          <div className="pt-2 border-t border-white/[0.06]">
            <div className="text-[10px] tracking-[0.2em] text-slate-500 uppercase mb-2">7-Day PM2.5 History</div>
            {loadingHistory ? (
              <Skeleton className="h-[180px] w-full rounded-xl" />
            ) : chartData.length > 0 ? (
              <Card className="bg-black/20 border-white/[0.06] rounded-xl h-[180px] p-3">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff14" />
                    <XAxis
                      dataKey="time"
                      stroke="#64748b"
                      fontSize={10}
                      tick={{ fill: "#94a3b8" }}
                    />
                    <YAxis stroke="#64748b" fontSize={10} tick={{ fill: "#94a3b8" }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "rgba(15, 23, 42, 0.9)",
                        border: "1px solid rgba(255, 255, 255, 0.08)",
                        borderRadius: "8px",
                        color: "#f1f5f9",
                        backdropFilter: "blur(8px)",
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke="#60a5fa"
                      strokeWidth={2}
                      dot={{ fill: "#60a5fa", r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </Card>
            ) : (
              <div className="h-[180px] flex flex-col items-center justify-center text-sm text-slate-400 rounded-xl bg-black/20 border border-white/[0.06] px-3 text-center">
                <div>No history data available</div>
                <div className="text-xs text-slate-500 mt-1">
                  OpenAQ may not provide 7-day PM2.5 history for this station.
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="p-4 border-t border-white/[0.06] mt-auto grid grid-cols-2 gap-2">
          <Button
            onClick={handleCenterMap}
            className="bg-blue-500 hover:bg-blue-600 text-white"
            size="sm"
          >
            <MapPin className="h-4 w-4 mr-2" />
            Center map
          </Button>
          <Button
            onClick={handleCopyLink}
            variant="outline"
            className="bg-white/[0.03] border-white/[0.08] text-slate-200 hover:bg-white/[0.06] hover:text-white"
            size="sm"
          >
            <Copy className="h-4 w-4 mr-2" />
            Copy link
          </Button>
        </div>
      </motion.div>
    </Card>
  );
}

