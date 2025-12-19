import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

const STATIONS = ['KATL', 'KORD', 'KDFW'];

export default function CurrentWeather() {
  const [weather, setWeather] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWeather();
    // Refresh every 5 minutes automatically
    const interval = setInterval(fetchWeather, 300000);
    return () => clearInterval(interval);
  }, []);

  const fetchWeather = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Fetch latest weather for today
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
      console.error('Weather fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl h-full">
      <div className="bg-slate-950 p-4 border-b border-slate-800 flex justify-between items-center">
        <h2 className="text-white font-bold text-lg">Current Conditions</h2>
        <span className="text-2xl">📡</span>
      </div>

      <div className="p-4 space-y-4">
        {STATIONS.map(station => {
          const data = weather[station];
          return (
            <div key={station} className="bg-slate-950/50 border border-slate-800 rounded-lg p-3">
              <div className="flex justify-between items-center mb-2">
                <span className="font-black text-blue-400 text-lg tracking-wider">{station}</span>
                {data ? (
                  <span className="text-xs bg-emerald-900/30 text-emerald-400 border border-emerald-900 px-2 py-0.5 rounded font-mono">LIVE</span>
                ) : (
                  <span className="text-xs bg-slate-800 text-slate-500 px-2 py-0.5 rounded font-mono">OFFLINE</span>
                )}
              </div>

              {data ? (
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-slate-900 rounded p-2">
                    <div className="text-xs text-slate-500 uppercase font-bold">Temp</div>
                    <div className="text-white font-mono text-lg">{data.temp}°</div>
                  </div>
                  <div className="bg-slate-900 rounded p-2">
                    <div className="text-xs text-slate-500 uppercase font-bold">Wind</div>
                    <div className="text-white font-mono text-lg">{data.wind_speed}<span className="text-xs">kt</span></div>
                  </div>
                  <div className="bg-slate-900 rounded p-2">
                    <div className="text-xs text-slate-500 uppercase font-bold">Precip</div>
                    <div className="text-white font-mono text-lg">{data.precip}"</div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-3 text-slate-600 text-xs italic">
                  Awaiting report...
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
