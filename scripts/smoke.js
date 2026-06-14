#!/usr/bin/env node

// Simple smoke checks for API routes. Requires OPENAQ_API_KEY set.

const base = process.env.SMOKE_BASE_URL || "http://localhost:3000";

async function check(path) {
  const url = `${base}${path}`;
  const res = await fetch(url, { headers: { "User-Agent": "EnviroWatch/Smoke" } });
  const ok = res.ok;
  const text = await res.text();
  return { url, status: res.status, ok, body: text.slice(0, 300) };
}

async function main() {
  if (!process.env.OPENAQ_API_KEY) {
    console.error("OPENAQ_API_KEY is required for smoke tests.");
    process.exit(1);
  }

  const checks = [
    "/api/openaq/stations?city=San%20Francisco",
    "/api/weather?lat=37.7749&lon=-122.4194",
  ];

  let failed = 0;
  for (const path of checks) {
    try {
      const result = await check(path);
      if (!result.ok) {
        failed++;
        console.error(`❌ ${result.url} -> ${result.status}\n${result.body}`);
      } else {
        console.log(`✅ ${result.url} -> ${result.status}`);
      }
    } catch (err) {
      failed++;
      console.error(`❌ ${path} -> ${err.message}`);
    }
  }

  if (failed > 0) {
    process.exit(1);
  }
}

main();

