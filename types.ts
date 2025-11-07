export type Pollutants = {
  pm25?: number;
  pm10?: number;
  o3?: number;
  no2?: number;
  so2?: number;
  co?: number;
};

export type Station = {
  id: string;
  name: string;
  lat: number;
  lon: number;
  aqi: number; // numeric AQI value
  band: "good" | "moderate" | "unhealthy" | "very-unhealthy" | "hazardous";
  pollutants: Pollutants;
  anomaly?: number; // 0–100 scaled anomaly score
};

export type SeriesPoint = {
  time: string; // ISO string
  value: number;
};

