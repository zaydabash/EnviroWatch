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
    // Intentionally runs once on mount to hydrate state from the initial URL only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Initial data fetch
  useEffect(() => {
    refreshAll().catch((err) => {
      toast.error(`Failed to load data: ${err.message}`);
    });
    // Intentionally runs once on mount; later refreshes are triggered by chat commands.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      {/* Decorative background: rotating gradient mesh + confetti dot field */}
      <div aria-hidden className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="bg-aurora" />
        <div className="bg-aurora-2" />
        <div className="bg-confetti" />
      </div>

      {/* Top header */}
      <header className="header-surface relative z-30 border-b border-white/[0.08] sticky top-0 overflow-hidden">
        <div className="h-[2px] w-full bg-gradient-to-r from-indigo-300 via-fuchsia-300 to-orange-300 opacity-90" />
        <div className="absolute inset-0 bg-slate-950/35 backdrop-blur-sm pointer-events-none" />
        <div className="container relative mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="text-sm font-medium tracking-tight text-slate-50">EnviroWatch</div>
            <div className="h-1 w-1 rounded-full bg-slate-600" />
            <div className="flex items-center gap-1.5">
              <div className="relative h-1.5 w-1.5">
                <div className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-75" />
                <div className="absolute inset-0 rounded-full bg-emerald-400" />
              </div>
              <span className="text-xs text-slate-400">Live</span>
            </div>
          </div>

          <div className="flex-1 flex justify-center min-w-0">
            <TopStats
              avgAqi={avgAqi}
              stations={filteredStations.length}
              anomalies={anomalies}
              temp={weather?.tempC ?? 0}
              loading={loading}
            />
          </div>

          <div className="gradient-sheen text-xs font-medium text-white px-3 py-1 rounded-md shrink-0 shadow-[0_4px_20px_-6px_rgb(0_0_0/0.6)]">
            {city}
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="relative z-10 flex-1 container mx-auto px-4 py-4 min-w-0">
        <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr_400px] gap-4 h-[calc(100vh-120px)] min-w-0">
          {/* Chat Panel */}
          <motion.div
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
            className="hidden lg:block min-w-0"
          >
            <ChatPanel />
          </motion.div>

          {/* Map */}
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1], delay: 0.05 }}
            className="relative min-w-0"
          >
            {loading && stations.length === 0 ? (
              <Skeleton className="w-full h-full rounded-xl" />
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
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1], delay: 0.1 }}
            className="hidden lg:block min-w-0"
          >
            <DetailsPanel />
          </motion.div>
        </div>

        {/* Mobile layout */}
        <div className="lg:hidden space-y-4">
          <ChatPanel />
          <div className="h-[400px]">
            {loading && stations.length === 0 ? (
              <Skeleton className="w-full h-full rounded-xl" />
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
