// lib/aqi.ts
export type AqiBand =
  | "good"
  | "moderate"
  | "unhealthy"
  | "very-unhealthy"
  | "hazardous";

type Breakpoint = {
  cLow: number;
  cHigh: number;
  iLow: number;
  iHigh: number;
  band: AqiBand;
};

const pm25Breakpoints: Breakpoint[] = [
  { cLow: 0.0, cHigh: 12.0, iLow: 0, iHigh: 50, band: "good" },
  { cLow: 12.1, cHigh: 35.4, iLow: 51, iHigh: 100, band: "moderate" },
  { cLow: 35.5, cHigh: 55.4, iLow: 101, iHigh: 150, band: "unhealthy" },
  { cLow: 55.5, cHigh: 150.4, iLow: 151, iHigh: 200, band: "very-unhealthy" },
  { cLow: 150.5, cHigh: 500.4, iLow: 201, iHigh: 500, band: "hazardous" },
];

export function pm25ToAqi(pm25: number): { value: number; band: AqiBand } {
  const bp =
    pm25Breakpoints.find(b => pm25 >= b.cLow && pm25 <= b.cHigh) ??
    pm25Breakpoints[pm25Breakpoints.length - 1];

  const { cLow, cHigh, iLow, iHigh, band } = bp;

  const value =
    ((iHigh - iLow) / (cHigh - cLow)) * (pm25 - cLow) + iLow;

  return { value: Math.round(value), band };
}
