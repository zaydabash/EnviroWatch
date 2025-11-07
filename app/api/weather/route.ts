// app/api/weather/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";

export const dynamic = "force-dynamic";

const weatherSchema = z.object({
  current_weather: z.object({
    temperature: z.number(),
    windspeed: z.number(),
  }),
});

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const lat = searchParams.get("lat");
    const lon = searchParams.get("lon");

    if (!lat || !lon) {
      return NextResponse.json(
        { error: "lat and lon are required" },
        { status: 400 },
      );
    }

    const url = `https://api.open-meteo.com/v1/forecast?latitude=${encodeURIComponent(
      lat,
    )}&longitude=${encodeURIComponent(
      lon,
    )}&current_weather=true`;

    const res = await fetch(url, {
      headers: {
        "User-Agent": "EnviroWatch/1.0 (portfolio app)",
        Accept: "application/json",
      },
      cache: "no-store",
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("Open-Meteo failed", res.status, text);
      return NextResponse.json(
        { error: "Open-Meteo endpoint failed" },
        { status: 500 },
      );
    }

    const json = await res.json();
    const parsed = weatherSchema.parse(json);

    return NextResponse.json({
      tempC: parsed.current_weather.temperature,
      windKph: parsed.current_weather.windspeed,
    });
  } catch (err) {
    console.error("Error in /api/weather", err);
    return NextResponse.json(
      { error: "Failed to fetch weather" },
      { status: 500 },
    );
  }
}
