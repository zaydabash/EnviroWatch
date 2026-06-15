// app/api/openaq/stations/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { pm25ToAqi } from "@/lib/aqi";
import type { Station, Pollutants } from "@/types";

export const dynamic = "force-dynamic";

const OPENAQ_BASE = "https://api.openaq.org/v3";
const GEOCODING_BASE = "https://geocoding-api.open-meteo.com/v1/search";
const SEARCH_RADIUS_METERS = 25000; // OpenAQ v3 max radius

function openAqHeaders() {
  const key = process.env.OPENAQ_API_KEY;
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

const geocodingResponseSchema = z.object({
  results: z
    .array(
      z.object({
        latitude: z.number(),
        longitude: z.number(),
        name: z.string(),
      }),
    )
    .optional(),
});

async function geocodeCity(
  city: string,
): Promise<{ lat: number; lon: number; name: string } | null> {
  const url = `${GEOCODING_BASE}?name=${encodeURIComponent(city)}&count=1&language=en&format=json`;

  const res = await fetch(url, {
    headers: { "User-Agent": "EnviroWatch/1.0 (portfolio app)" },
    next: { revalidate: 3600 },
  });

  if (!res.ok) return null;

  const json = await res.json();
  const parsed = geocodingResponseSchema.parse(json);
  const match = parsed.results?.[0];

  if (!match) return null;

  return { lat: match.latitude, lon: match.longitude, name: match.name };
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const envDefault =
      process.env.DEFAULT_CITY ||
      process.env.NEXT_PUBLIC_DEFAULT_CITY ||
      "San Francisco";

    const city = searchParams.get("city") || envDefault;

    const geocoded = await geocodeCity(city);
    if (!geocoded) {
      return NextResponse.json(
        { error: `Could not find a location for "${city}"` },
        { status: 404 },
      );
    }

    const locationsUrl = `${OPENAQ_BASE}/locations?coordinates=${geocoded.lat},${geocoded.lon}&radius=${SEARCH_RADIUS_METERS}&parameters_id=2&limit=50`;

    const locRes = await fetch(locationsUrl, {
      headers: openAqHeaders(),
      next: { revalidate: 60 },
    });

    if (!locRes.ok) {
      const text = await locRes.text();
      console.error("OpenAQ /v3/locations failed", locRes.status, text);
      if (locRes.status === 429) {
        return NextResponse.json(
          { error: "OpenAQ rate limit exceeded, please try again shortly", upstreamStatus: 429 },
          { status: 429 },
        );
      }
      return NextResponse.json(
        {
          error: "OpenAQ locations endpoint failed",
          upstreamStatus: locRes.status,
          upstreamBody: text,
        },
        { status: 502 }
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
        next: { revalidate: 60 },
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

    return NextResponse.json({
      stations,
      center: { lat: geocoded.lat, lon: geocoded.lon },
    });
  } catch (err) {
    console.error("Error in /api/openaq/stations", err);
    return NextResponse.json(
      { error: "Failed to fetch stations" },
      { status: 500 }
    );
  }
}
