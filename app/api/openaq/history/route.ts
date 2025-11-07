// app/api/openaq/history/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { subDays } from "date-fns";
import type { SeriesPoint } from "@/types";

export const dynamic = "force-dynamic";

const OPENAQ_BASE = "https://api.openaq.org/v3";

function openAqHeaders() {
  const key = process.env.OPENAQ_API_KEY;
  return {
    "User-Agent": "EnviroWatch/1.0 (portfolio app)",
    Accept: "application/json",
    ...(key ? { "X-API-Key": key } : {}),
  };
}

// schema for location with sensors
const locationSchema = z.object({
  results: z.array(
    z.object({
      id: z.number(),
      sensors: z.array(
        z.object({
          id: z.number(),
          parameter: z.object({
            id: z.number(),
            name: z.string(),
          }),
        }),
      ),
    }),
  ),
});

// schema for measurements
const measurementSchema = z.object({
  value: z.number(),
  datetimeFrom: z.object({ utc: z.string() }),
});

const measurementsResponseSchema = z.object({
  results: z.array(measurementSchema),
});

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const stationId = searchParams.get("stationId");
    const parameter = searchParams.get("parameter") || "pm25";

    if (!stationId) {
      return NextResponse.json(
        { error: "stationId required" },
        { status: 400 },
      );
    }

    const locId = Number(stationId);
    if (isNaN(locId)) {
      return NextResponse.json(
        { error: "stationId must be numeric" },
        { status: 400 },
      );
    }

    console.log(`[History] Fetching history for location ID: ${locId}`);

    // 1️⃣ Get the station's sensors to find its PM2.5 sensor
    const locRes = await fetch(`${OPENAQ_BASE}/locations/${locId}`, {
      headers: openAqHeaders(),
      cache: "no-store",
    });

    if (!locRes.ok) {
      const txt = await locRes.text();
      // 404 means location doesn't exist - this is normal for some stations
      if (locRes.status === 404) {
        console.log(`[History] Location ${locId} not found (404)`);
        return NextResponse.json(
          { error: "Location not found", upstreamStatus: 404 },
          { status: 404 },
        );
      }
      console.error("OpenAQ /v3/locations/{id} failed", locRes.status, txt);
      return NextResponse.json(
        { error: "Location lookup failed", upstreamStatus: locRes.status },
        { status: 500 },
      );
    }

    const locJson = await locRes.json();
    const parsedLoc = locationSchema.parse(locJson);
    const sensors = parsedLoc.results[0]?.sensors ?? [];

    console.log(`[History] Found ${sensors.length} sensors for location ${locId}`);

    const sensor = sensors.find(
      (s) => s.parameter.id === 2 || s.parameter.name.toLowerCase() === "pm25",
    );
    if (!sensor) {
      console.log(`[History] No PM2.5 sensor found for location ${locId}`);
      return NextResponse.json(
        { error: "No PM2.5 sensor for this station" },
        { status: 404 },
      );
    }

    console.log(`[History] Found PM2.5 sensor ID: ${sensor.id} for location ${locId}`);

    // 2️⃣ Fetch its last 7 days of measurements
    const now = new Date();
    const from = subDays(now, 7).toISOString();

    const measUrl = `${OPENAQ_BASE}/sensors/${sensor.id}/measurements?datetime_from=${encodeURIComponent(
      from,
    )}&limit=1000`;

    console.log(`[History] Fetching measurements from: ${measUrl}`);

    const measRes = await fetch(measUrl, {
      headers: openAqHeaders(),
      cache: "no-store",
    });

    if (!measRes.ok) {
      const txt = await measRes.text();
      console.error(
        `OpenAQ /v3/sensors/${sensor.id}/measurements failed`,
        measRes.status,
        txt,
      );
      return NextResponse.json(
        {
          error: "Measurements fetch failed",
          upstreamStatus: measRes.status,
          upstreamBody: txt,
        },
        { status: 500 },
      );
    }

    const measJson = await measRes.json();
    const parsedMeas = measurementsResponseSchema.parse(measJson);

    console.log(`[History] Found ${parsedMeas.results.length} measurement points`);

    const series: SeriesPoint[] = parsedMeas.results
      .map((r) => ({
        time: r.datetimeFrom.utc,
        value: r.value,
      }))
      .sort(
        (a, b) => new Date(a.time).getTime() - new Date(b.time).getTime(),
      );

    return NextResponse.json(series);
  } catch (err) {
    console.error("Error in /api/openaq/history", err);
    return NextResponse.json(
      { error: "Failed to fetch history" },
      { status: 500 },
    );
  }
}
