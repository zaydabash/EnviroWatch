"use client";

import { useEffect, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useAppStore } from "@/store/useAppStore";
import { TopStats } from "@/components/TopStats";
import { ChatPanel } from "@/components/ChatPanel";
import { MapView } from "@/components/MapView";
import { DetailsPanel } from "@/components/DetailsPanel";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import { toast } from "sonner";

function HomeContent() {
  const searchParams = useSearchParams();
  const {
    city,
    stations,
    selectedId,
    weather,
    loading,
    error,
    center,
    radiusKm,
    aqiThreshold,
    showAnomaliesOnly,
    setCity,
    setCenter,
    setRadius,
    setThreshold,
    setSelected,
    toggleAnomaliesOnly,
    refreshAll,
  } = useAppStore();

  // Hydrate from URL params on mount
  useEffect(() => {
    const cityParam = searchParams.get("city");
    const aqiParam = searchParams.get("aqi_gt");
    const radiusParam = searchParams.get("radius");
    const anomaliesParam = searchParams.get("anomalies");
    const selectParam = searchParams.get("select");

    if (cityParam) {
      setCity(cityParam);
    }
    if (aqiParam) {
      setThreshold(parseInt(aqiParam, 10));
    }
    if (radiusParam) {
      setRadius(parseInt(radiusParam, 10));
    }
    if (anomaliesParam === "1") {
      if (!showAnomaliesOnly) {
        toggleAnomaliesOnly();
      }
    }
    if (selectParam) {
      setSelected(selectParam);
    }
  }, []);

  // Initial data fetch
  useEffect(() => {
    refreshAll().catch((err) => {
      toast.error(`Failed to load data: ${err.message}`);
    });
  }, []);

  // Show error toast
  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  // Filter stations
  const filteredStations = useMemo(() => {
    let filtered = [...stations];

    if (aqiThreshold !== null) {
      filtered = filtered.filter((s) => s.aqi > aqiThreshold);
    }

    if (showAnomaliesOnly) {
      filtered = filtered.filter((s) => (s.anomaly ?? 0) >= 75);
    }

    return filtered;
  }, [stations, aqiThreshold, showAnomaliesOnly]);

  // Compute stats
  const avgAqi = useMemo(() => {
    if (filteredStations.length === 0) return 0;
    const sum = filteredStations.reduce((acc, s) => acc + s.aqi, 0);
    return sum / filteredStations.length;
  }, [filteredStations]);

  const anomalies = useMemo(() => {
    return filteredStations.filter((s) => (s.anomaly ?? 0) >= 75).length;
  }, [filteredStations]);

  const handleSelectStation = (id: string) => {
    setSelected(id);
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top header */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="text-sm font-semibold text-slate-50">EnviroWatch</div>
            <div className="text-xs text-slate-400">·</div>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs text-slate-400">Live</span>
            </div>
          </div>

          <div className="flex-1 flex justify-center">
            <TopStats
              avgAqi={avgAqi}
              stations={filteredStations.length}
              anomalies={anomalies}
              temp={weather?.tempC ?? 0}
              loading={loading}
            />
          </div>

          <div className="text-xs text-slate-400 px-3 py-1 rounded-full bg-slate-800/50 border border-slate-700">
            {city}
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 container mx-auto px-4 py-4">
        <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr_400px] gap-4 h-[calc(100vh-120px)]">
          {/* Chat Panel */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
            className="hidden lg:block"
          >
            <ChatPanel />
          </motion.div>

          {/* Map */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            className="relative"
          >
            {loading && stations.length === 0 ? (
              <Skeleton className="w-full h-full rounded-2xl" />
            ) : (
              <MapView
                center={center}
                stations={filteredStations}
                radiusKm={radiusKm}
                selectedId={selectedId}
                onSelect={handleSelectStation}
              />
            )}
          </motion.div>

          {/* Details Panel */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
            className="hidden lg:block"
          >
            <DetailsPanel />
          </motion.div>
        </div>

        {/* Mobile layout */}
        <div className="lg:hidden space-y-4">
          <ChatPanel />
          <div className="h-[400px]">
            {loading && stations.length === 0 ? (
              <Skeleton className="w-full h-full rounded-2xl" />
            ) : (
              <MapView
                center={center}
                stations={filteredStations}
                radiusKm={radiusKm}
                selectedId={selectedId}
                onSelect={handleSelectStation}
              />
            )}
          </div>
          <DetailsPanel />
        </div>
      </main>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-950 to-slate-900">
        <div className="text-slate-400">Loading...</div>
      </div>
    }>
      <HomeContent />
    </Suspense>
  );
}
