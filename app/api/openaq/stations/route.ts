// app/api/openaq/stations/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { pm25ToAqi } from "@/lib/aqi";
import type { Station, Pollutants } from "@/types";

export const dynamic = "force-dynamic";

const OPENAQ_BASE = "https://api.openaq.org/v3";

function openAqHeaders() {
  const key = process.env.OPENAQ_API_KEY;
  console.log("OPENAQ key present?", !!key); // debug
  return {
    "User-Agent": "EnviroWatch/1.0 (portfolio app)",
    Accept: "application/json",
    ...(key ? { "X-API-Key": key } : {}),
  };
}

// ---- Zod schemas ----
const sensorSchema = z.object({
  id: z.number(),
  parameter: z.object({
    id: z.number(),
    name: z.string(),
    units: z.string(),
    displayName: z.string().nullable(),
  }),
});

const locationSchema = z
  .object({
    id: z.number(),
    name: z.string().nullable(),
    locality: z.string().nullable(),
    coordinates: z.object({
      latitude: z.number().nullable(),
      longitude: z.number().nullable(),
    }),
    sensors: z.array(sensorSchema),
  })
  .passthrough();

const locationsResponseSchema = z.object({
  results: z.array(locationSchema),
});

const latestMeasurementSchema = z.object({
  value: z.number(),
  sensorsId: z.number(),
  coordinates: z.object({
    latitude: z.number().nullable(),
    longitude: z.number().nullable(),
  }),
});

const latestResponseSchema = z.object({
  results: z.array(latestMeasurementSchema),
});

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const envDefault =
      process.env.DEFAULT_CITY ||
      process.env.NEXT_PUBLIC_DEFAULT_CITY ||
      "San Francisco";

    const city = searchParams.get("city") || envDefault;
    console.log("Fetching stations for city:", city);

    // For US cities, add ISO filter to ensure we only get US stations
    const isUSCity = city.toLowerCase().includes("san francisco") || 
                     city.toLowerCase().includes("san jose") ||
                     city.toLowerCase().includes("los angeles") ||
                     city.toLowerCase().includes("new york") ||
                     city.toLowerCase().includes("chicago") ||
                     city.toLowerCase().includes("boston") ||
                     city.toLowerCase().includes("seattle") ||
                     city.toLowerCase().includes("portland") ||
                     city.toLowerCase().includes("miami") ||
                     city.toLowerCase().includes("houston") ||
                     city.toLowerCase().includes("phoenix") ||
                     city.toLowerCase().includes("philadelphia") ||
                     city.toLowerCase().includes("dallas") ||
                     city.toLowerCase().includes("austin") ||
                     city.toLowerCase().includes("denver") ||
                     city.toLowerCase().includes("atlanta") ||
                     city.toLowerCase().includes("detroit") ||
                     city.toLowerCase().includes("minneapolis") ||
                     city.toLowerCase().includes("washington");

    // 1) locations in this city with PM2.5 (parameter id 2)
    let locationsUrl = `${OPENAQ_BASE}/locations?locality=${encodeURIComponent(city)}&parameters_id=2&limit=50`;
    
    // Add ISO country code filter for US cities to prevent global results
    if (isUSCity) {
      locationsUrl += `&iso=US`;
    }

    const locRes = await fetch(locationsUrl, {
      headers: openAqHeaders(),
      cache: "no-store",
    });

    if (!locRes.ok) {
      const text = await locRes.text();
      console.error("OpenAQ /v3/locations failed", locRes.status, text);
      return NextResponse.json(
        {
          error: "OpenAQ locations endpoint failed",
          upstreamStatus: locRes.status,
          upstreamBody: text,
        },
        { status: 500 }
      );
    }

    const locJson = await locRes.json();
    const locParsed = locationsResponseSchema.parse(locJson);

    const stationPromises = locParsed.results.map(async (loc) => {
      const { id, name, locality, coordinates, sensors } = loc;

      if (coordinates.latitude == null || coordinates.longitude == null) {
        return null;
      }

      const pm25Sensor = sensors.find(
        (s) => s.parameter.id === 2 || s.parameter.name === "pm25"
      );
      if (!pm25Sensor) return null;

      const latestUrl = `${OPENAQ_BASE}/locations/${id}/latest`;

      const latestRes = await fetch(latestUrl, {
        headers: openAqHeaders(),
        cache: "no-store",
      });

      if (!latestRes.ok) {
        const text = await latestRes.text();
        console.error(
          `OpenAQ /v3/locations/${id}/latest failed`,
          latestRes.status,
          text
        );
        return null;
      }

      const latestJson = await latestRes.json();
      const latestParsed = latestResponseSchema.parse(latestJson);

      const pm25Latest = latestParsed.results.find(
        (m) => m.sensorsId === pm25Sensor.id
      );

      if (!pm25Latest) return null;

      const pm25 = pm25Latest.value;

      const pollutants: Pollutants = { pm25 };

      const aqi = pm25ToAqi(pm25);

      const station: Station = {
        id: String(id),
        name: name ?? locality ?? `Location ${id}`,
        lat: coordinates.latitude!,
        lon: coordinates.longitude!,
        aqi: aqi.value,
        band: aqi.band as Station["band"],
        pollutants,
        anomaly: undefined,
      };

      return station;
    });

    const stationsArr = await Promise.all(stationPromises);

    const stations: Station[] = stationsArr.filter(
      (s): s is Station => s !== null
    );

    console.log("Returning station count:", stations.length);

    return NextResponse.json(stations);
  } catch (err) {
    console.error("Error in /api/openaq/stations", err);
    return NextResponse.json(
      { error: "Failed to fetch stations" },
      { status: 500 }
    );
  }
}
