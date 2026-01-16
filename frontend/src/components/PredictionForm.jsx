import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

// 🗺️ NWS API ENDPOINTS
const STATION_URLS = {
  KATL: 'https://api.weather.gov/gridpoints/FFC/52,86/forecast',
  KORD: 'https://api.weather.gov/gridpoints/LOT/73,72/forecast',
  KDFW: 'https://api.weather.gov/gridpoints/FWD/88,103/forecast'
};

const INITIAL_FORM_STATE = { maxTemp: '', windSpeed: '', windDir: '', precip: '' };

export default function PredictionForm({ session }) {
  const [station, setStation] = useState('KATL');
  
  // 🗂️ SEPARATE DRAFTS FOR EACH STATION
  const [drafts, setDrafts] = useState({
    KATL: { ...INITIAL_FORM_STATE },
    KORD: { ...INITIAL_FORM_STATE },
    KDFW: { ...INITIAL_FORM_STATE }
  });

  const [nwsForecast, setNwsForecast] = useState(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null); 

  // Helper to get the form data for the CURRENT active station
  const currentForm = drafts[station];

  // Helper to update specific fields for the CURRENT station
  const updateDraft = (field, value) => {
    setDrafts(prev => ({
      ...prev,
      [station]: {
        ...prev[station],
        [field]: value
      }
    }));
  };

  const getTargetDate = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const targetDate = getTargetDate();

  // 📡 Fetch NWS Data when station changes
  useEffect(() => {
    async function fetchIntel() {
      setNwsForecast(null);
      try {
        const response = await fetch(STATION_URLS[station]);
        const data = await response.json();
        const periods = data.properties.periods;
        const tomorrow = periods.find(p => p.isDaytime && p.number >= 2);

        if (tomorrow) {
          setNwsForecast({
            temp: tomorrow.temperature,
            wind: tomorrow.windSpeed,
            shortForecast: tomorrow.shortForecast,
            icon: tomorrow.icon
          });
        }
      } catch (err) {
        console.log("Could not fetch NWS Intel");
      }
    }
    fetchIntel();
  }, [station]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus(null);

    // Validation using currentForm
    if (currentForm.maxTemp === '' || currentForm.windSpeed === '' || currentForm.windDir === '' || currentForm.precip === '') {
      setStatus('error');
      setLoading(false);
      return;
    }

    try {
      const { user } = session;
      
      const payload = {
        user_id: user.id,
        station_id: station,
        prediction_date: targetDate,
        p_high: parseFloat(currentForm.maxTemp),
        p_wind_speed: parseFloat(currentForm.windSpeed),
        p_wind_dir: parseInt(currentForm.windDir),
        p_precip: parseFloat(currentForm.precip),
        submitted_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('predictions')
        .upsert(payload, { onConflict: 'user_id, station_id, prediction_date' });

      if (error) throw error;

      setStatus('success');
      // Optional: Clear only this station's draft after success? 
      // For now, let's keep it so they can see what they submitted.
      
    } catch (error) {
      console.error('Error submitting:', error);
      setStatus('error');
    } finally {
      setLoading(false);
    }
  };

  const applyIntel = () => {
    if (!nwsForecast) return;
    const windNum = parseInt(nwsForecast.wind.split(' ')[0]) || 0; 
    
    // Update the WHOLE object for this station
    setDrafts(prev => ({
      ...prev,
      [station]: {
        maxTemp: nwsForecast.temp,
        windSpeed: windNum,
        precip: '0.00',
        windDir: prev[station].windDir // Keep existing wind dir if they typed it
      }
    }));
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl p-6">
      
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-xl font-bold text-white">Make Prediction</h2>
          <p className="text-slate-500 text-xs font-mono mt-1">
            TARGET: <span className="text-emerald-400">{targetDate}</span>
          </p>
        </div>
        <div className="text-2xl">📝</div>
      </div>

      {nwsForecast && (
        <div className="bg-blue-950/30 border border-blue-900/50 rounded-lg p-3 mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={nwsForecast.icon} alt="wx" className="w-10 h-10 rounded-full" />
            <div>
              <p className="text-[10px] uppercase text-blue-300 font-bold tracking-wider">NWS Forecast</p>
              <p className="text-white text-sm font-medium">
                High <span className="font-bold text-emerald-400">{nwsForecast.temp}°F</span> • Wind <span className="font-bold text-slate-300">{nwsForecast.wind}</span>
              </p>
              <p className="text-[10px] text-slate-400 italic">{nwsForecast.shortForecast}</p>
            </div>
          </div>
          <button onClick={applyIntel} type="button" className="text-[10px] bg-blue-600 hover:bg-blue-500 text-white px-2 py-1 rounded font-bold transition-colors">
            USE THIS
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        
        {/* STATION TABS */}
        <div className="grid grid-cols-3 gap-2 bg-slate-950 p-1 rounded-lg">
          {['KATL', 'KORD', 'KDFW'].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => {
                setStation(s);
                setStatus(null); // Clear success/error message when switching tabs
              }}
              className={`py-2 text-sm font-bold rounded transition-all ${
                station === s ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-[10px] uppercase font-bold text-slate-500 mb-1 block">Max Temp (°F)</label>
            <input 
              type="number" step="0.1" 
              value={currentForm.maxTemp} 
              onChange={e => updateDraft('maxTemp', e.target.value)} 
              className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white font-mono focus:border-blue-500 outline-none transition-colors" 
              placeholder="72.0" 
            />
          </div>
          <div>
            <label className="text-[10px] uppercase font-bold text-slate-500 mb-1 block">Precip (in)</label>
            <input 
              type="number" step="0.01" 
              value={currentForm.precip} 
              onChange={e => updateDraft('precip', e.target.value)} 
              className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white font-mono focus:border-blue-500 outline-none transition-colors" 
              placeholder="0.00" 
            />
          </div>
          <div>
            <label className="text-[10px] uppercase font-bold text-slate-500 mb-1 block">Wind Spd (kt)</label>
            <input 
              type="number" 
              value={currentForm.windSpeed} 
              onChange={e => updateDraft('windSpeed', e.target.value)} 
              className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white font-mono focus:border-blue-500 outline-none transition-colors" 
              placeholder="12" 
            />
          </div>
          <div>
            <label className="text-[10px] uppercase font-bold text-slate-500 mb-1 block">Wind Dir (0-360)</label>
            <input 
              type="number" 
              value={currentForm.windDir} 
              onChange={e => updateDraft('windDir', e.target.value)} 
              className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white font-mono focus:border-blue-500 outline-none transition-colors" 
              placeholder="270" 
            />
          </div>
        </div>

        <button type="submit" disabled={loading} className={`w-full py-3 rounded font-black tracking-widest uppercase transition-all ${status === 'success' ? 'bg-emerald-500 text-white' : 'bg-blue-600 hover:bg-blue-500 text-white'}`}>
          {loading ? 'Saving...' : status === 'success' ? `Locked In (${station})! 🔒` : `Lock It In (${station})`}
        </button>

        {status === 'error' && (
          <p className="text-center text-red-400 text-xs font-bold animate-pulse">⚠️ Please fill out all fields for {station}</p>
        )}

      </form>
    </div>
  );
}
