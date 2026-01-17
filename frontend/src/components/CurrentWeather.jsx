import React, { useEffect, useState } from 'react';

// NWS Forecast Endpoints (Visuals)
const STATIONS = [
  { id: 'KATL', name: 'Atlanta', gridUrl: 'https://api.weather.gov/gridpoints/FFC/52,88/forecast', metarUrl: 'https://api.weather.gov/stations/KATL/observations' },
  { id: 'KORD', name: 'Chicago', gridUrl: 'https://api.weather.gov/gridpoints/LOT/73,72/forecast', metarUrl: 'https://api.weather.gov/stations/KORD/observations' },
  { id: 'KDFW', name: 'Dallas', gridUrl: 'https://api.weather.gov/gridpoints/FWD/88,103/forecast', metarUrl: 'https://api.weather.gov/stations/KDFW/observations' }
];

export default function CurrentWeather() {
  const [weather, setWeather] = useState({});
  const [loading, setLoading] = useState(true);
  
  // Modal State
  const [selectedStation, setSelectedStation] = useState(null);
  const [metars, setMetars] = useState([]);
  const [metarLoading, setMetarLoading] = useState(false);

  useEffect(() => {
    fetchLiveWeather();
    const interval = setInterval(fetchLiveWeather, 600000); // Refresh every 10m
    return () => clearInterval(interval);
  }, []);

  const fetchLiveWeather = async () => {
    try {
      const results = {};
      
      await Promise.all(STATIONS.map(async (station) => {
        try {
          const res = await fetch(station.gridUrl);
          const data = await res.json();
          const periods = data.properties.periods;
          
          // Logic: "Today" is usually index 0, "Tonight" is index 1
          const current = periods[0];
          const next = periods[1];

          // Determine High/Low based on time of day
          // If it is daytime, P0 is High, P1 is Low.
          // If it is night, P0 is Low, P1 is Tomorrow's High.
          const isDay = current.isDaytime;
          const high = isDay ? current.temperature : next.temperature;
          const low = isDay ? next.temperature : current.temperature;
          
          results[station.id] = {
            temp: current.temperature,
            wind: current.windSpeed,
            icon: current.icon,
            shortForecast: current.shortForecast,
            high: high,
            low: low,
            isDay: isDay
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

  const handleStationClick = async (station) => {
    setSelectedStation(station);
    setMetarLoading(true);
    setMetars([]);
    
    try {
      const res = await fetch(station.metarUrl);
      const data = await res.json();
      // Get last 12 observations
      setMetars(data.features.slice(0, 12)); 
    } catch (error) {
      console.error("METAR fetch error", error);
    } finally {
      setMetarLoading(false);
    }
  };

  return (
    <>
      {/* 1. DASHBOARD CARD LIST */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl h-full flex flex-col">
        <div className="bg-slate-950 p-4 border-b border-slate-800 flex justify-between items-center">
          <h2 className="text-white font-bold text-lg">Live Conditions</h2>
          <span className="text-2xl animate-pulse">📡</span>
        </div>

        <div className="p-4 space-y-4 flex-1 overflow-y-auto">
          {loading ? (
            <div className="text-center text-slate-500 italic py-10">Fetching live NWS data...</div>
          ) : (
            STATIONS.map(s => {
              const data = weather[s.id];
              return (
                <div 
                  key={s.id} 
                  onClick={() => handleStationClick(s)}
                  className="bg-slate-950/50 border border-slate-800 rounded-lg p-4 transition-all hover:bg-slate-800 hover:border-blue-500 hover:scale-[1.02] hover:shadow-lg cursor-pointer relative overflow-hidden group"
                >
                  {/* TOP ROW: Name & Status */}
                  <div className="flex justify-between items-center mb-2 relative z-10">
                    <span className="font-black text-blue-400 text-xl tracking-widest">{s.id}</span>
                    <span className="text-[10px] uppercase font-bold text-slate-500 group-hover:text-white transition-colors">
                      Tap for METARs 👆
                    </span>
                  </div>

                  {data ? (
                    <div className="relative z-10 flex justify-between items-center">
                      <div>
                        <div className="flex items-baseline gap-2">
                          <div className="text-5xl font-black text-white">{data.temp}°</div>
                          <div className="flex flex-col text-[10px] font-bold uppercase text-slate-400">
                             <span className="text-red-400">H: {data.high}°</span>
                             <span className="text-blue-400">L: {data.low}°</span>
                          </div>
                        </div>
                        <div className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-1">
                           {data.wind}
                        </div>
                        <div className="text-sm text-emerald-400 font-medium mt-1">
                          {data.shortForecast}
                        </div>
                      </div>
                      
                      <div className="w-16 h-16 rounded-full bg-slate-800 border-2 border-slate-700 overflow-hidden shadow-lg group-hover:border-blue-400 transition-colors">
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

      {/* 2. METAR POPUP MODAL */}
      {selectedStation && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[85vh]">
            
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-950 rounded-t-xl">
              <div>
                <h2 className="text-white font-bold text-lg">{selectedStation.name} ({selectedStation.id})</h2>
                <p className="text-slate-500 text-xs uppercase font-bold tracking-wider">Raw Observations</p>
              </div>
              <button 
                onClick={() => setSelectedStation(null)} 
                className="text-slate-400 hover:text-white text-2xl font-bold px-2"
              >
                &times;
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-4 overflow-y-auto font-mono text-xs md:text-sm bg-black/50 text-emerald-400 space-y-2">
              {metarLoading ? (
                <div className="text-center py-10 text-white animate-pulse">Downloading Observations...</div>
              ) : metars.length > 0 ? (
                metars.map((m, i) => (
                  <div key={i} className="border-b border-slate-800 pb-2 mb-2 last:border-0">
                    <div className="flex gap-2 text-slate-500 mb-1 text-[10px]">
                      <span>{new Date(m.properties.timestamp).toLocaleDateString()}</span>
                      <span>{new Date(m.properties.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <p className="break-all leading-relaxed">
                      {m.properties.rawMessage}
                    </p>
                  </div>
                ))
              ) : (
                <div className="text-center py-10 text-slate-500">No recent reports found.</div>
              )}
            </div>

            <div className="p-3 bg-slate-950 border-t border-slate-800 text-center">
              <button 
                onClick={() => setSelectedStation(null)}
                className="bg-slate-800 hover:bg-slate-700 text-white px-6 py-2 rounded-lg font-bold text-sm transition-colors"
              >
                Close Report
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  );
}
