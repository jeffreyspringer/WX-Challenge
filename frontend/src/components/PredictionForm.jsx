import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

// 🗺️ NWS API ENDPOINTS (Pre-calculated for stability)
const STATION_URLS = {
  KATL: 'https://api.weather.gov/gridpoints/FFC/52,86/forecast', // Atlanta
  KORD: 'https://api.weather.gov/gridpoints/LOT/73,72/forecast', // Chicago
  KDFW: 'https://api.weather.gov/gridpoints/FWD/88,103/forecast'  // Dallas
};

export default function PredictionForm({ session }) {
  const [station, setStation] = useState('KATL');
  const [formData, setFormData] = useState({
    maxTemp: '',
    windSpeed: '',
    windDir: '',
    precip: ''
  });
  const [nwsForecast, setNwsForecast] = useState(null); // 🧠 The Intel
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null); // 'success', 'error', 'closed'

  // 🕒 CALCULATE TARGET DATE (Tomorrow - Local Time)
  const getTargetDate = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const targetDate = getTargetDate();

  // 📡 FETCH NWS INTEL
  useEffect(() => {
    async function fetchIntel() {
      setNwsForecast(null);
      try {
        const response = await fetch(STATION_URLS[station]);
        const data = await response.json();
        
        // Find "Tomorrow's" period (usually index 2 or 3 in the generic list)
        // Simple logic: Find the first period that isDaytime AND has a high temp
        const periods = data.properties.periods;
        const tomorrow = periods.find(p => p.isDaytime && p.number >= 2);

        if (tomorrow) {
          setNwsForecast({
            temp: tomorrow.temperature,
            wind: tomorrow.windSpeed, // Comes like "10 mph"
            shortForecast: tomorrow.shortForecast,
            icon: tomorrow.icon
          });
        }
      } catch (err) {
        console.log("Could not fetch NWS Intel (Common if API is busy)");
      }
    }
    fetchIntel();
  }, [station]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus(null);

    // 1. Validation
    if (!formData.maxTemp || !formData.windSpeed || !formData.windDir || !formData.precip) {
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
        p_high: parseFloat(formData.maxTemp),
        p_wind_speed: parseFloat(formData.windSpeed),
        p_wind_dir: parseInt(formData.windDir),
        p_precip: parseFloat(formData.precip),
        submitted_at: new Date().toISOString()
      };

      // 2. Upsert (Insert or Update if exists)
      const { error } = await supabase
        .from('predictions')
        .upsert(payload, { onConflict: 'user_id, station_id, prediction_date' });

      if (error) throw error;

      setStatus('success');
      // Reset form (optional)
      setFormData({ maxTemp: '', windSpeed: '', windDir: '', precip: '' });

    } catch (error) {
      console.error('Error submitting:', error);
      setStatus('error');
    } finally {
      setLoading(false);
    }
  };

  // 🖱️ Helper to Fill Form with NWS Data
  const applyIntel = () => {
    if (!nwsForecast) return;
    // Extract number from "10 mph" string
    const windNum = parseInt(nwsForecast.wind.split(' ')[0]) || 0; 
    
    setFormData({
      ...formData,
      maxTemp: nwsForecast.temp,
      windSpeed: windNum,
      precip: '0.00' // NWS doesn't give easy precip numbers in this API, assume 0 for baseline
    });
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl p-6">
      
      {/* HEADER */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-xl font-bold text-white">Make Prediction</h2>
          <p className="text-slate-500 text-xs font-mono mt-1">
            TARGET: <span className="text-emerald-400">{targetDate}</span>
          </p>
        </div>
        <div className="text-2xl">📝</div>
      </div>

      {/* 🧠 INTEL CARD (New!) */}
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
          <button 
            onClick={applyIntel}
            type="button"
            className="text-[10px] bg-blue-600 hover:bg-blue-500 text-white px-2 py-1 rounded font-bold transition-colors"
          >
            USE THIS
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        
        {/* STATION SELECTOR */}
        <div className="grid grid-cols-3 gap-2 bg-slate-950 p-1 rounded-lg">
          {['KATL', 'KORD', 'KDFW'].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStation(s)}
              className={`py-2 text-sm font-bold rounded transition-all ${
                station === s 
                  ? 'bg-blue-600 text-white shadow-lg' 
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        {/* INPUTS GRID */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-[10px] uppercase font-bold text-slate-500 mb-1 block">Max Temp (°F)</label>
            <input
              type="number"
              step="0.1"
              value={formData.maxTemp}
              onChange={e => setFormData({...formData, maxTemp: e.target.value})}
              className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white font-mono focus:border-blue-500 outline-none transition-colors"
              placeholder="72.0"
            />
          </div>
          <div>
            <label className="text-[10px] uppercase font-bold text-slate-500 mb-1 block">Precip (in)</label>
            <input
              type="number"
              step="0.01"
              value={formData.precip}
              onChange={e => setFormData({...formData, precip: e.target.value})}
              className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white font-mono focus:border-blue-500 outline-none transition-colors"
              placeholder="0.00"
            />
          </div>
          <div>
            <label className="text-[10px] uppercase font-bold text-slate-500 mb-1 block">Wind Spd (kt)</label>
            <input
              type="number"
              value={formData.windSpeed}
              onChange={e => setFormData({...formData, windSpeed: e.target.value})}
              className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white font-mono focus:border-blue-500 outline-none transition-colors"
              placeholder="12"
            />
          </div>
          <div>
            <label className="text-[10px] uppercase font-bold text-slate-500 mb-1 block">Wind Dir (0-360)</label>
            <input
              type="number"
              value={formData.windDir}
              onChange={e => setFormData({...formData, windDir: e.target.value})}
              className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white font-mono focus:border-blue-500 outline-none transition-colors"
              placeholder="270"
            />
          </div>
        </div>

        {/* SUBMIT BUTTON */}
        <button
          type="submit"
          disabled={loading}
          className={`w-full py-3 rounded font-black tracking-widest uppercase transition-all ${
            status === 'success' 
              ? 'bg-emerald-500 text-white' 
              : 'bg-blue-600 hover:bg-blue-500 text-white'
          }`}
        >
          {loading ? 'Saving...' : status === 'success' ? 'Locked In! 🔒' : 'Lock It In'}
        </button>

        {status === 'error' && (
          <p className="text-center text-red-400 text-xs font-bold">⚠️ Please fill out all fields</p>
        )}

      </form>
    </div>
  );
}
