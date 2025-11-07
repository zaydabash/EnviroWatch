"use client";

import { create } from "zustand";
import type { Station } from "@/types";

type AppState = {
  city: string;
  center: [number, number]; // [lon, lat]
  radiusKm: number; // default 3
  aqiThreshold: number | null;
  showAnomaliesOnly: boolean;
  stations: Station[];
  selectedId?: string;
  weather?: { tempC: number; windKph: number };
  lastUpdated?: string;
  loading: boolean;
  error?: string;
};

type AppActions = {
  setCity: (city: string) => void;
  setCenter: (center: [number, number]) => void;
  setRadius: (radiusKm: number) => void;
  setThreshold: (threshold: number | null) => void;
  toggleAnomaliesOnly: () => void;
  setStations: (stations: Station[]) => void;
  setSelected: (id?: string) => void;
  setWeather: (weather: { tempC: number; windKph: number }) => void;
  setError: (msg?: string) => void;
  refreshAll: () => Promise<void>;
};

const getDefaultCity = (): string => {
  if (typeof window !== "undefined") {
    return process.env.NEXT_PUBLIC_DEFAULT_CITY || "San Francisco";
  }
  return process.env.NEXT_PUBLIC_DEFAULT_CITY || process.env.DEFAULT_CITY || "San Francisco";
};

const defaultCenter: [number, number] = [-122.4194, 37.7749]; // San Francisco

export const useAppStore = create<AppState & AppActions>((set, get) => ({
  city: getDefaultCity(),
  center: defaultCenter,
  radiusKm: 3,
  aqiThreshold: null,
  showAnomaliesOnly: false,
  stations: [],
  selectedId: undefined,
  weather: undefined,
  lastUpdated: undefined,
  loading: false,
  error: undefined,

  setCity: (city: string) => set({ city }),
  setCenter: (center: [number, number]) => set({ center }),
  setRadius: (radiusKm: number) => set({ radiusKm }),
  setThreshold: (threshold: number | null) => set({ aqiThreshold: threshold }),
  toggleAnomaliesOnly: () => set((state) => ({ showAnomaliesOnly: !state.showAnomaliesOnly })),
  setStations: (stations: Station[]) => set({ stations }),
  setSelected: (id?: string) => set({ selectedId: id }),
  setWeather: (weather: { tempC: number; windKph: number }) => set({ weather }),
  setError: (msg?: string) => set({ error: msg }),

  refreshAll: async () => {
    const state = get();
    set({ loading: true, error: undefined });

    try {
      // Fetch stations
      const stationsRes = await fetch(
        `/api/openaq/stations?city=${encodeURIComponent(state.city)}`,
        {
          cache: "no-store",
          headers: {
            "User-Agent": "EnviroWatch/1.0 (portfolio app)",
          },
        }
      );

      if (!stationsRes.ok) {
        throw new Error(`Failed to fetch stations: ${stationsRes.statusText}`);
      }

      const stationsData = await stationsRes.json();
      if (stationsData.error) {
        throw new Error(stationsData.error);
      }

      const stations: Station[] = Array.isArray(stationsData) ? stationsData : stationsData.stations || [];

      // Only recompute center if we have stations AND they're reasonably close to the expected city location
      // This prevents averaging global stations that might skew the center
      let newCenter = state.center;
      if (stations.length > 0) {
        // For San Francisco, expect stations roughly in the area
        // If city is SF, only update center if stations are in reasonable bounds
        const isSF = state.city.toLowerCase().includes("san francisco") || state.city.toLowerCase() === "sf";
        if (isSF) {
          // San Francisco bounds: roughly -122.5 to -122.3 lon, 37.7 to 37.8 lat
          const sfStations = stations.filter(
            (s) => s.lon >= -122.6 && s.lon <= -122.3 && s.lat >= 37.6 && s.lat <= 37.9
          );
          if (sfStations.length > 0) {
            const avgLon = sfStations.reduce((sum, s) => sum + s.lon, 0) / sfStations.length;
            const avgLat = sfStations.reduce((sum, s) => sum + s.lat, 0) / sfStations.length;
            newCenter = [avgLon, avgLat];
          }
          // Otherwise keep default SF center
        } else {
          // For other cities, compute center from all stations
          const avgLon = stations.reduce((sum, s) => sum + s.lon, 0) / stations.length;
          const avgLat = stations.reduce((sum, s) => sum + s.lat, 0) / stations.length;
          newCenter = [avgLon, avgLat];
        }
      }

      set({ stations, center: newCenter });

      // Fetch weather
      const [lon, lat] = newCenter;
      const weatherRes = await fetch(
        `/api/weather?lat=${lat}&lon=${lon}`,
        {
          cache: "no-store",
          headers: {
            "User-Agent": "EnviroWatch/1.0 (portfolio app)",
          },
        }
      );

      if (weatherRes.ok) {
        const weatherData = await weatherRes.json();
        if (!weatherData.error) {
          set({ weather: weatherData });
        }
      }

      // Prefetch history for top 10 stations by AQI
      const topStations = [...stations]
        .sort((a, b) => b.aqi - a.aqi)
        .slice(0, 10);

      const anomalyPromises = topStations.map(async (station) => {
        try {
          const historyRes = await fetch(
            `/api/openaq/history?stationId=${encodeURIComponent(station.id)}&parameter=pm25`,
            {
              cache: "no-store",
              headers: {
                "User-Agent": "EnviroWatch/1.0 (portfolio app)",
              },
            }
          );

          if (historyRes.ok) {
            const historyData = await historyRes.json();
            if (historyData.error) {
              return null;
            }
            const series = Array.isArray(historyData) ? historyData : historyData.series || [];
            if (series.length > 0) {
              const { computeAnomaly } = await import("@/lib/anomaly");
              const anomaly = computeAnomaly(series);
              return { id: station.id, anomaly };
            }
          }
        } catch (err) {
          // Silently fail for individual stations
        }
        return null;
      });

      const anomalyResults = await Promise.all(anomalyPromises);
      const updatedStations = stations.map((station) => {
        const result = anomalyResults.find((r) => r?.id === station.id);
        return result ? { ...station, anomaly: result.anomaly } : station;
      });

      set({
        stations: updatedStations,
        lastUpdated: new Date().toISOString(),
        loading: false,
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      set({ error: errorMsg, loading: false });
      throw error;
    }
  },
}));

