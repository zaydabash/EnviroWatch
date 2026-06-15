"use client";

import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { circle } from "@turf/turf";
import { MapPin } from "lucide-react";
import type { Station } from "@/types";
import { getMapStyleUrl } from "@/lib/geo";
import { Legend } from "./Legend";

type MapViewProps = {
  center: [number, number];
  stations: Station[];
  radiusKm: number;
  selectedId?: string;
  onSelect: (id: string) => void;
};

export function MapView({ center, stations, radiusKm, selectedId, onSelect }: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: getMapStyleUrl(),
      center: center,
      zoom: 12,
    });

    map.current.addControl(new maplibregl.NavigationControl(), "top-right");

    // Add radius circle
    const radiusCircle = circle(center, radiusKm, { units: "kilometers" });

    map.current.on("load", () => {
      if (!map.current) return;

      // Add radius source and layer
      map.current.addSource("radius", {
        type: "geojson",
        data: radiusCircle,
      });

      map.current.addLayer({
        id: "radius-fill",
        type: "fill",
        source: "radius",
        paint: {
          "fill-color": "#3b82f6",
          "fill-opacity": 0.15,
        },
      });

      map.current.addLayer({
        id: "radius-outline",
        type: "line",
        source: "radius",
        paint: {
          "line-color": "#60a5fa",
          "line-width": 2,
        },
      });

      // Add stations source
      const stationsGeoJson = {
        type: "FeatureCollection" as const,
        features: stations.map((station) => ({
          type: "Feature" as const,
          geometry: {
            type: "Point" as const,
            coordinates: [station.lon, station.lat],
          },
          properties: {
            id: station.id,
            name: station.name,
            aqi: station.aqi,
            band: station.band,
          },
        })),
      };

      map.current.addSource("stations", {
        type: "geojson",
        data: stationsGeoJson,
      });

      map.current.addLayer({
        id: "stations-layer",
        type: "circle",
        source: "stations",
        paint: {
          "circle-radius": [
            "case",
            ["==", ["get", "id"], selectedId || ""],
            8,
            6,
          ],
          "circle-color": [
            "case",
            ["==", ["get", "band"], "good"],
            "#10b981",
            ["==", ["get", "band"], "moderate"],
            "#eab308",
            ["==", ["get", "band"], "unhealthy"],
            "#f97316",
            ["==", ["get", "band"], "very-unhealthy"],
            "#ef4444",
            "#a855f7",
          ],
          "circle-stroke-width": [
            "case",
            ["==", ["get", "id"], selectedId || ""],
            2,
            0,
          ],
          "circle-stroke-color": "#ffffff",
        },
      });

      // Click handler
      map.current.on("click", "stations-layer", (e) => {
        if (e.features && e.features[0]) {
          const id = e.features[0].properties?.id;
          if (id) {
            onSelect(id);
          }
        }
      });

      // Hover cursor
      map.current.on("mouseenter", "stations-layer", () => {
        if (map.current) {
          map.current.getCanvas().style.cursor = "pointer";
        }
      });

      map.current.on("mouseleave", "stations-layer", () => {
        if (map.current) {
          map.current.getCanvas().style.cursor = "";
        }
      });
    });

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
    // Map is created once on mount; subsequent prop changes are applied via the
    // dedicated effects below rather than recreating the map instance.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update center
  useEffect(() => {
    if (map.current) {
      map.current.setCenter(center);
    }
  }, [center]);

  // Update radius
  useEffect(() => {
    if (map.current && map.current.getSource("radius")) {
      const radiusCircle = circle(center, radiusKm, { units: "kilometers" });
      (map.current.getSource("radius") as maplibregl.GeoJSONSource).setData(radiusCircle);
    }
  }, [center, radiusKm]);

  // Update stations
  useEffect(() => {
    if (map.current && map.current.getSource("stations")) {
      const stationsGeoJson = {
        type: "FeatureCollection" as const,
        features: stations.map((station) => ({
          type: "Feature" as const,
          geometry: {
            type: "Point" as const,
            coordinates: [station.lon, station.lat],
          },
          properties: {
            id: station.id,
            name: station.name,
            aqi: station.aqi,
            band: station.band,
          },
        })),
      };

      (map.current.getSource("stations") as maplibregl.GeoJSONSource).setData(stationsGeoJson);
    }
  }, [stations]);

  // Update selected marker
  useEffect(() => {
    if (map.current && map.current.getLayer("stations-layer")) {
      map.current.setPaintProperty("stations-layer", "circle-radius", [
        "case",
        ["==", ["get", "id"], selectedId || ""],
        8,
        6,
      ]);
      map.current.setPaintProperty("stations-layer", "circle-stroke-width", [
        "case",
        ["==", ["get", "id"], selectedId || ""],
        2,
        0,
      ]);
    }
  }, [selectedId]);

  return (
    <div className="relative w-full h-full rounded-xl overflow-hidden border border-white/[0.06] shadow-[0_8px_30px_-12px_rgb(0_0_0/0.6)]">
      <div ref={mapContainer} className="w-full h-full" />

      {/* Coordinates */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 rounded-md border border-white/[0.06] bg-slate-900/80 px-3 py-1.5 text-xs text-slate-300 backdrop-blur-xl shadow-[0_8px_30px_-12px_rgb(0_0_0/0.6)]">
        <MapPin className="h-3 w-3 text-slate-500" />
        <span className="tabular-nums">
          {center[1].toFixed(4)}, {center[0].toFixed(4)}
        </span>
      </div>

      {/* Live indicator */}
      <div className="absolute bottom-4 left-4 z-20 flex items-center gap-1.5">
        <div className="relative h-1.5 w-1.5">
          <div className="absolute inset-0 rounded-full bg-blue-400 animate-ping opacity-75" />
          <div className="absolute inset-0 rounded-full bg-blue-400" />
        </div>
        <span className="text-xs text-slate-300 [text-shadow:0_1px_6px_rgb(0_0_0/0.9)]">Live</span>
      </div>

      {/* Legend */}
      <div className="absolute top-4 right-4 z-20">
        <Legend radiusKm={radiusKm} stationsCount={stations.length} />
      </div>
    </div>
  );
}

