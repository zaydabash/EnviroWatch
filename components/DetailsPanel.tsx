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
  const { stations, selectedId, weather, city, setCenter, setSelected } = useAppStore();
  const [history, setHistory] = useState<SeriesPoint[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const selectedStation = stations.find((s) => s.id === selectedId);

  useEffect(() => {
    if (!selectedId || !selectedStation) {
      setHistory([]);
      return;
    }

    setLoadingHistory(true);
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
        console.error("Error fetching history:", err);
        setHistory([]);
      })
      .finally(() => {
        setLoadingHistory(false);
      });
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
      <Card className="bg-slate-900/80 border-slate-800 rounded-2xl h-full flex flex-col items-center justify-center p-8 shadow-xl">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <div className="h-16 w-16 rounded-full bg-slate-800 flex items-center justify-center">
            <Search className="h-8 w-8 text-slate-400" />
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-slate-50 mb-1">No station selected</div>
            <div className="text-sm text-slate-400">
              Click a pin on the map or try 'show anomalies' in the chat.
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
    <Card className="bg-slate-900/80 border-slate-800 rounded-2xl h-full flex flex-col shadow-xl overflow-hidden">
      <motion.div
        key={selectedId}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col h-full overflow-y-auto"
      >
        {/* Header pill */}
        <div className="p-4 border-b border-slate-800">
          {selectedStation.anomaly && selectedStation.anomaly >= 75 ? (
            <Badge className="bg-violet-500/20 text-violet-400 border-violet-500/30 mb-3">
              ANOMALOUS
            </Badge>
          ) : (
            <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 mb-3">
              STATION SELECTED
            </Badge>
          )}
          <div className="text-lg font-semibold text-slate-50 mb-1">{selectedStation.name}</div>
          <div className="text-xs text-slate-400">
            {city} · {selectedStation.lat.toFixed(4)}, {selectedStation.lon.toFixed(4)}
          </div>
        </div>

        {/* Info grid */}
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-slate-500 uppercase tracking-wide mb-1">AQI</div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-slate-50">{selectedStation.aqi}</span>
                <Badge className={getBandColor(selectedStation.band)}>
                  {selectedStation.band}
                </Badge>
              </div>
            </div>
            {selectedStation.anomaly !== undefined && (
              <div>
                <div className="text-xs text-slate-500 uppercase tracking-wide mb-1">Anomaly</div>
                <Badge
                  className={`${
                    selectedStation.anomaly >= 75
                      ? "bg-violet-500/20 text-violet-400 border-violet-500/30"
                      : "bg-slate-500/20 text-slate-400 border-slate-500/30"
                  }`}
                >
                  {selectedStation.anomaly}/100
                </Badge>
              </div>
            )}
          </div>

          {weather && (
            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-800">
              <div>
                <div className="text-xs text-slate-500 uppercase tracking-wide mb-1">Temperature</div>
                <div className="text-lg font-semibold text-slate-50">{Math.round(weather.tempC)}°C</div>
              </div>
              <div>
                <div className="text-xs text-slate-500 uppercase tracking-wide mb-1">Wind Speed</div>
                <div className="text-lg font-semibold text-slate-50">{Math.round(weather.windKph)} kph</div>
              </div>
            </div>
          )}

          {/* Pollutant chips */}
          <div className="pt-2 border-t border-slate-800">
            <div className="text-xs text-slate-500 uppercase tracking-wide mb-2">Pollutants</div>
            <div className="flex flex-wrap gap-2">
              {selectedStation.pollutants.pm25 !== undefined && (
                <Badge className="bg-slate-800 text-slate-300">
                  PM2.5: {selectedStation.pollutants.pm25.toFixed(1)} µg/m³
                </Badge>
              )}
              {selectedStation.pollutants.pm10 !== undefined && (
                <Badge className="bg-slate-800 text-slate-300">
                  PM10: {selectedStation.pollutants.pm10.toFixed(1)} µg/m³
                </Badge>
              )}
              {selectedStation.pollutants.o3 !== undefined && (
                <Badge className="bg-slate-800 text-slate-300">
                  O₃: {selectedStation.pollutants.o3.toFixed(1)} ppb
                </Badge>
              )}
              {selectedStation.pollutants.no2 !== undefined && (
                <Badge className="bg-slate-800 text-slate-300">
                  NO₂: {selectedStation.pollutants.no2.toFixed(1)} ppb
                </Badge>
              )}
              {selectedStation.pollutants.so2 !== undefined && (
                <Badge className="bg-slate-800 text-slate-300">
                  SO₂: {selectedStation.pollutants.so2.toFixed(1)} ppb
                </Badge>
              )}
              {selectedStation.pollutants.co !== undefined && (
                <Badge className="bg-slate-800 text-slate-300">
                  CO: {selectedStation.pollutants.co.toFixed(1)} ppm
                </Badge>
              )}
            </div>
          </div>

          {/* Chart */}
          <div className="pt-2 border-t border-slate-800">
            <div className="text-xs text-slate-500 uppercase tracking-wide mb-2">7-Day PM2.5 History</div>
            {loadingHistory ? (
              <Skeleton className="h-[180px] w-full rounded-xl" />
            ) : chartData.length > 0 ? (
              <Card className="bg-slate-950 border-slate-800 rounded-xl h-[180px] p-3">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis
                      dataKey="time"
                      stroke="#94a3b8"
                      fontSize={10}
                      tick={{ fill: "#94a3b8" }}
                    />
                    <YAxis stroke="#94a3b8" fontSize={10} tick={{ fill: "#94a3b8" }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#1e293b",
                        border: "1px solid #334155",
                        borderRadius: "8px",
                        color: "#f1f5f9",
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      dot={{ fill: "#3b82f6", r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </Card>
            ) : (
              <div className="h-[180px] flex items-center justify-center text-sm text-slate-400 rounded-xl bg-slate-950 border border-slate-800">
                No history data available
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="p-4 border-t border-slate-800 mt-auto grid grid-cols-2 gap-2">
          <Button
            onClick={handleCenterMap}
            className="bg-emerald-500 hover:bg-emerald-600 text-white"
            size="sm"
          >
            <MapPin className="h-4 w-4 mr-2" />
            Center map
          </Button>
          <Button
            onClick={handleCopyLink}
            className="bg-violet-500 hover:bg-violet-600 text-white"
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

