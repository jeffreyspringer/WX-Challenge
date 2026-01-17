import React, { useEffect, useState } from 'react';

// NWS API Endpoints (Grid Points)
const STATIONS = [
  { id: 'KATL', name: 'Atlanta', url: 'https://api.weather.gov/gridpoints/FFC/52,88/forecast' },
  { id: 'KORD', name: 'Chicago', url: 'https://api.weather.gov/gridpoints/LOT/73,72/forecast' },
  { id: 'KDFW', name: 'Dallas', url: 'https://api.weather.gov/gridpoints/FWD/88,103/forecast' }
];

export default function CurrentWeather() {
  const [weather, setWeather] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLiveWeather();
    const interval = setInterval(fetchLiveWeather, 600000); // Refresh every 10m
    return () => clearInterval(interval);
  }, []);

  const fetchLiveWeather = async () => {
    try {
      const results = {};
      
      // Fetch all stations in parallel
      await Promise.all(STATIONS.map(async (station) => {
        try {
          const res = await fetch(station.url);
          const data = await res.json();
          const periods = data.properties.periods;
          
          // Find "Today" (Daytime) and "Tonight"
          // NWS returns an array. Index 0 is usually the current period.
          const current = periods[0]; 
          const isDaytime = current.isDaytime;
          
          results[station.id] = {
            temp: current.temperature,
            wind: current.windSpeed,
            icon: current.icon,
            shortForecast: current.shortForecast,
            isDaytime: isDaytime
          };
        } catch (err) {
          console.error(`Failed to load ${station.id}`, err);
          results[station.id] = null;
        }
      }));

      setWeather(results);
    } catch (error) {
      console.error('Weather error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl h-full flex flex-col">
      <div className="bg-slate-950 p-4 border-b border-slate-800 flex justify-between items-center">
        <h2 className="text-white font-bold text-lg">Live Conditions (NWS)</h2>
        <span className="text-2xl animate-pulse">📡</span>
      </div>

      <div className="p-4 space-y-4 flex-1 overflow-y-auto">
        {loading ? (
          <div className="text-center text-slate-500 italic py-10">Fetching live satellite data...</div>
        ) : (
          STATIONS.map(s => {
            const data = weather[s.id];
            return (
              <div key={s.id} className="bg-slate-950/50 border border-slate-800 rounded-lg p-4 transition-all hover:border-slate-700 relative overflow-hidden">
                
                {/* TOP ROW: Name & Status */}
                <div className="flex justify-between items-center mb-3 relative z-10">
                  <span className="font-black text-blue-400 text-xl tracking-widest">{s.id}</span>
                  {data ? (
                    <span className="text-[10px] uppercase font-bold bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/20">
                      Live Feed
                    </span>
                  ) : (
                    <span className="text-[10px] uppercase font-bold bg-red-500/10 text-red-400 px-2 py-0.5 rounded border border-red-500/20">
                      Offline
                    </span>
                  )}
                </div>

                {data ? (
                  <div className="relative z-10 flex justify-between items-center">
                    <div>
                      <div className="text-5xl font-black text-white mb-1">
                        {data.temp}°F
                      </div>
                      <div className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-2">
                         {data.wind}
                      </div>
                      <div className="text-sm text-emerald-400 font-medium">
                        {data.shortForecast}
                      </div>
                    </div>
                    
                    {/* Weather Icon */}
                    <div className="w-16 h-16 rounded-full bg-slate-800 border-2 border-slate-700 overflow-hidden shadow-lg">
                      <img src={data.icon} alt="wx" className="w-full h-full object-cover" />
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4 relative z-10">
                    <p className="text-slate-600 text-xs italic">Signal Lost</p>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
