import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

// ✈️ UPDATED: Now includes Timezones!
const STATIONS = [
  { id: 'KATL', name: 'Atlanta', timezone: 'America/New_York' },
  { id: 'KORD', name: 'Chicago', timezone: 'America/Chicago' },
  { id: 'KDFW', name: 'Dallas', timezone: 'America/Chicago' }
];

export default function CurrentWeather() {
  const [weather, setWeather] = useState({});

  useEffect(() => {
    fetchWeather();
    const interval = setInterval(fetchWeather, 300000); // Refresh every 5m
    return () => clearInterval(interval);
  }, []);

  const fetchWeather = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const { data } = await supabase
        .from('actual_weather')
        .select('*')
        .eq('date', today);

      if (data) {
        const map = {};
        data.forEach(w => map[w.station_id] = w);
        setWeather(map);
      }
    } catch (error) {
      console.error('Weather error:', error);
    }
  };

  const toFahrenheit = (celsius) => {
    if (celsius === null || celsius === undefined) return '--';
    const f = (celsius * 9/5) + 32;
    return f.toFixed(1);
  };

  const formatWind = (val) => {
    if (val === null || val === undefined) return '--';
    return Number(val).toFixed(1);
  };

  // 🕒 TIME HELPER: Now respects the specific Station Timezone
  const formatTime = (isoString, timeZone) => {
    if (!isoString) return '--:--';
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return '--:--';
    
    // Force the browser to format for the specific airport timezone
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      timeZone: timeZone 
    });
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl h-full flex flex-col">
      <div className="bg-slate-950 p-4 border-b border-slate-800 flex justify-between items-center">
        <h2 className="text-white font-bold text-lg">Current Conditions</h2>
        <span className="text-2xl animate-pulse">📡</span>
      </div>

      <div className="p-4 space-y-4 flex-1 overflow-y-auto">
        {STATIONS.map(s => {
          const data = weather[s.id];
          return (
            <div key={s.id} className="bg-slate-950/50 border border-slate-800 rounded-lg p-4 transition-all hover:border-slate-700">
              
              {/* TOP ROW: Name & Time */}
              <div className="flex justify-between items-center mb-3">
                <span className="font-black text-blue-400 text-xl tracking-widest">{s.id}</span>
                {data ? (
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-500 font-mono font-bold">
                      {formatTime(data.updated_at, s.timezone)}
                    </span>
                    <span className="text-[10px] uppercase font-bold bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/20">
                      Live
                    </span>
                  </div>
                ) : (
                  <span className="text-[10px] uppercase font-bold bg-slate-800 text-slate-500 px-2 py-0.5 rounded">
                    Offline
                  </span>
                )}
              </div>

              {data ? (
                <>
                  <div className="flex items-end gap-2 mb-4">
                    <div className="text-5xl font-black text-white">
                      {toFahrenheit(data.current_temp)}°F
                    </div>
                    <div className="text-sm text-slate-500 font-bold mb-2 uppercase tracking-wider">
                      Now
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-2 text-center bg-slate-900/80 rounded-lg p-2 border border-slate-800">
                    <div className="flex flex-col">
                      <span className="text-[10px] text-slate-500 uppercase font-bold">High</span>
                      <span className="text-emerald-400 font-mono font-bold">
                        {toFahrenheit(data.temp)}°F
                      </span>
                    </div>
                    <div className="flex flex-col border-l border-slate-800">
                      <span className="text-[10px] text-slate-500 uppercase font-bold">Low</span>
                      <span className="text-blue-400 font-mono font-bold">
                        {toFahrenheit(data.min_temp)}°F
                      </span>
                    </div>
                    <div className="flex flex-col border-l border-slate-800">
                      <span className="text-[10px] text-slate-500 uppercase font-bold">Wind</span>
                      <span className="text-white font-mono font-bold">{formatWind(data.wind_speed)}kt</span>
                    </div>
                    <div className="flex flex-col border-l border-slate-800">
                      <span className="text-[10px] text-slate-500 uppercase font-bold">Rain</span>
                      <span className="text-white font-mono font-bold">{data.precip}"</span>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-4">
                  <p className="text-slate-600 text-xs italic">Waiting for daily report...</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
