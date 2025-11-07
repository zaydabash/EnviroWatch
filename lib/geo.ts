// lib/geo.ts
export function getMapStyleUrl() {
  const key = process.env.NEXT_PUBLIC_MAPTILER_KEY;
  // Use MapTiler if key is available (shows state boundaries, roads, etc.)
  // Otherwise fall back to free demo tiles
  if (key) {
    return `https://api.maptiler.com/maps/streets-v2-dark/style.json?key=${key}`;
  }
  return "https://demotiles.maplibre.org/style.json";
}
