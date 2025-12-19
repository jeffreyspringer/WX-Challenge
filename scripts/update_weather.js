const { createClient } = require('@supabase/supabase-js');

// 1. Config
const STATIONS = ['KATL', 'KORD', 'KDFW'];
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing API Credentials');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// 2. Fetch from NOAA (Aviation Weather Center)
async function getMetarData() {
  const ids = STATIONS.join(',');
  const url = `https://aviationweather.gov/api/data/metar?ids=${ids}&format=json`;
  
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error('NOAA API Failed');
    return await response.json();
  } catch (error) {
    console.error('Fetch Error:', error);
    return [];
  }
}

async function updateStation(stationData) {
  const stationId = stationData.icaoId;
  const tempC = stationData.temp; // NOAA gives Celsius
  const precip = stationData.precip24Hr || 0; // Sometimes missing, default to 0
  const windSpd = stationData.wspd || 0;
  const windDir = stationData.wdir || 0;

  const today = new Date().toISOString().split('T')[0];

  console.log(`📡 Processing ${stationId}: ${tempC}°C`);

  // 3. Get EXISTING row for today (to check High/Low)
  const { data: existing } = await supabase
    .from('actual_weather')
    .select('*')
    .eq('station_id', stationId)
    .eq('date', today)
    .single();

  let newHigh = tempC;
  let newLow = tempC;

  if (existing) {
    // Logic: Keep the highest high and the lowest low
    newHigh = Math.max(existing.temp, tempC); 
    // If min_temp is null (first run), use current, otherwise compare
    newLow = (existing.min_temp === null) ? tempC : Math.min(existing.min_temp, tempC);
  }

  // 4. Update Database
  const { error } = await supabase.from('actual_weather').upsert({
    station_id: stationId,
    date: today,
    current_temp: tempC,     // Right now
    temp: newHigh,           // Daily High
    min_temp: newLow,        // Daily Low
    wind_speed: windSpd,
    wind_dir: windDir,
    precip: precip,          // Note: METAR precip is usually "last hour" or "24hr", basic logic for now
    updated_at: new Date().toISOString()
  }, { onConflict: 'station_id, date' });

  if (error) console.error(`❌ Error updating ${stationId}:`, error.message);
  else console.log(`✅ ${stationId} updated! High: ${newHigh}, Low: ${newLow}`);
}

async function run() {
  console.log('--- STARTING WEATHER UPDATE ---');
  const metars = await getMetarData();
  
  for (const metar of metars) {
    // Only update if it's one of our stations
    if (STATIONS.includes(metar.icaoId)) {
      await updateStation(metar);
    }
  }
  console.log('--- COMPLETE ---');
}

run();
