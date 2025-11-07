# EnviroWatch Feature Guide

## Copy Link Button

The **Copy Link** button in the Details Panel creates a shareable URL that includes:
- Current city
- Selected station ID
- AQI threshold filter (if set)
- Radius setting (if changed from default 3km)
- Anomalies filter (if enabled)

**How it works:**
1. Click a station on the map to select it
2. Click the "Copy link" button in the details panel
3. The URL is copied to your clipboard
4. Share the URL - when opened, it will restore the exact view (city, filters, selected station)

**Example URL:**
```
https://envirowatch-three.vercel.app?city=San%20Francisco&select=12345&aqi_gt=100&radius=5&anomalies=1
```

## Chat Commands

All commands work in the chat panel on the left. Try these:

### Available Commands:

1. **`set city <name>`**
   - Changes the city and refreshes data
   - Example: `set city San Jose`
   - Example: `set city Los Angeles`

2. **`filter aqi > <number>`**
   - Filters stations by AQI threshold
   - Example: `filter aqi > 100` (shows only stations with AQI > 100)

3. **`radius <km>`**
   - Changes the map radius circle
   - Example: `radius 5` (sets radius to 5km)
   - Example: `radius 10` (sets radius to 10km)

4. **`show anomalies`**
   - Filters to show only stations with anomaly score >= 75

5. **`hide anomalies`**
   - Removes the anomaly filter, shows all stations

6. **`select <id>` or `select "<name>"`**
   - Selects a station by ID or name
   - Example: `select 12345`
   - Example: `select "Downtown"`

### Testing Chat Commands:

1. Type `set city San Jose` → Should switch city and refresh
2. Type `filter aqi > 50` → Should filter map markers
3. Type `radius 5` → Should update the blue circle radius
4. Type `show anomalies` → Should filter to anomalous stations
5. Type `hide anomalies` → Should show all stations again

## History Data Issue

**Why history might not show:**

Many OpenAQ stations don't have historical data available. This is normal and expected. The history endpoint will:
- Return 404 if the location doesn't exist in OpenAQ v3
- Return 404 if the location has no PM2.5 sensor
- Return empty array if the sensor has no measurements in the last 7 days

**To debug history issues:**

1. Check your terminal logs when you click a station - you'll see:
   - `[History] Fetching history for location ID: X`
   - `[History] Found X sensors for location Y`
   - `[History] Found PM2.5 sensor ID: Z`
   - `[History] Found X measurement points`

2. If you see "Location not found (404)" - that station doesn't exist in OpenAQ v3's database

3. If you see "No PM2.5 sensor found" - that location doesn't have a PM2.5 sensor

4. If you see "Found 0 measurement points" - the sensor exists but has no data in the last 7 days

**Note:** OpenAQ v3 is relatively new and many stations from v2 may not have migrated or may not have historical data available. This is a limitation of the data source, not your app.

