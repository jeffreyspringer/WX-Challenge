import React, { useState } from 'react';
import { supabase } from '../supabaseClient';

const STATIONS = [
  { id: 'KATL', name: 'Atlanta (KATL)' },
  { id: 'KORD', name: 'Chicago (KORD)' },
  { id: 'KDFW', name: 'Dallas (KDFW)' }
];

export default function PredictionForm({ userId }) {
  const [station, setStation] = useState('KATL');
  const [formData, setFormData] = useState({
    highTemp: '',
    windSpeed: '',
    windDir: '',
    precip: '0.00'
  });
  
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  // 🕒 CALCULATE TARGET DATE (Tomorrow)
  const getTargetDate = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const submitPrediction = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    // 1. Basic Validation
    if (!formData.highTemp || !formData.windSpeed || !formData.windDir) {
      setMessage({ type: 'error', text: '⚠️ Please fill out all fields.' });
      setLoading(false);
      return;
    }

    // 2. Range Validation
    const dir = parseInt(formData.windDir);
    if (dir < 0 || dir > 360) {
      setMessage({ type: 'error', text: '⚠️ Wind Direction must be 0-360°.' });
      setLoading(false);
      return;
    }

    try {
      const targetDate = getTargetDate();

      // 3. Upsert (Insert or Update if exists)
      const { error } = await supabase.from('predictions').upsert({
        user_id: userId,
        station_id: station,
        prediction_date: targetDate, // Always for tomorrow
        p_high: parseInt(formData.highTemp),
        p_wind_speed: parseInt(formData.windSpeed),
        p_wind_dir: parseInt(formData.windDir),
        p_precip: parseFloat(formData.precip),
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id, station_id, prediction_date' });

      if (error) throw error;

      setMessage({ type: 'success', text: `✅ Forecast for ${station} Locked In!` });
      
    } catch (error) {
      console.error(error);
      setMessage({ type: 'error', text: '❌ Submission failed. Try again.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
      {/* HEADER */}
      <div className="bg-slate-950 p-4 border-b border-slate-800 flex justify-between items-center">
        <div>
          {/* CHANGED HERE */}
          <h2 className="text-white font-bold text-lg">Predictions</h2>
          <p className="text-slate-400 text-xs uppercase tracking-wider font-mono">
            Target: {getTargetDate()}
          </p>
        </div>
        <div className="text-2xl">📝</div> {/* Changed icon to memo/pencil */}
      </div>

      {/* FORM */}
      <form onSubmit={submitPrediction} className="p-6 space-y-6">
        
        {/* STATION SELECTOR */}
        <div>
          <label className="block text-slate-400 text-xs font-bold uppercase mb-2">Select Station</label>
          <div className="grid grid-cols-3 gap-2">
            {STATIONS.map((s) => (
              <button
                type="button"
                key={s.id}
                onClick={() => { setStation(s.id); setMessage(null); }}
                className={`py-2 text-sm font-bold rounded transition-colors ${
                  station === s.id 
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50' 
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                }`}
              >
                {s.id}
              </button>
            ))}
          </div>
        </div>

        {/* INPUT GRID */}
        <div className="grid grid-cols-2 gap-4">
          
          {/* MAX TEMP */}
          <div className="col-span-1">
            <label className="block text-slate-400 text-xs font-bold uppercase mb-1">Max Temp (°F)</label>
            <input
              type="number"
              name="highTemp"
              value={formData.highTemp}
              onChange={handleChange}
              placeholder="72"
              className="w-full bg-slate-950 border border-slate-700 rounded p-3 text-white font-mono text-lg focus:border-blue-500 outline-none transition-colors"
            />
          </div>

          {/* PRECIP */}
          <div className="col-span-1">
            <label className="block text-slate-400 text-xs font-bold uppercase mb-1">Precip (in)</label>
            <input
              type="number"
              name="precip"
              step="0.01"
              value={formData.precip}
              onChange={handleChange}
              className="w-full bg-slate-950 border border-slate-700 rounded p-3 text-white font-mono text-lg focus:border-blue-500 outline-none transition-colors"
            />
          </div>

          {/* WIND SPEED */}
          <div className="col-span-1">
            <label className="block text-slate-400 text-xs font-bold uppercase mb-1">Wind Spd (kt)</label>
            <input
              type="number"
              name="windSpeed"
              value={formData.windSpeed}
              onChange={handleChange}
              placeholder="12"
              className="w-full bg-slate-950 border border-slate-700 rounded p-3 text-white font-mono text-lg focus:border-blue-500 outline-none transition-colors"
            />
          </div>

          {/* WIND DIR */}
          <div className="col-span-1">
            <label className="block text-slate-400 text-xs font-bold uppercase mb-1">Wind Dir (0-360)</label>
            <input
              type="number"
              name="windDir"
              min="0"
              max="360"
              value={formData.windDir}
              onChange={handleChange}
              placeholder="270"
              className="w-full bg-slate-950 border border-slate-700 rounded p-3 text-white font-mono text-lg focus:border-blue-500 outline-none transition-colors"
            />
          </div>

        </div>

        {/* SUBMIT BUTTON */}
        <button
          disabled={loading}
          className={`w-full py-4 rounded font-black uppercase tracking-widest transition-all transform active:scale-95 ${
            loading 
              ? 'bg-slate-700 text-slate-500 cursor-not-allowed' 
              : 'bg-blue-600 hover:bg-blue-500 text-white shadow-xl shadow-blue-900/20'
          }`}
        >
          {loading ? 'Submitting...' : 'Lock It In'}
        </button>

        {/* FEEDBACK MESSAGE */}
        {message && (
          <div className={`p-3 rounded text-center text-sm font-bold ${
            message.type === 'success' 
              ? 'bg-emerald-900/30 text-emerald-400 border border-emerald-900' 
              : 'bg-red-900/30 text-red-400 border border-red-900'
          }`}>
            {message.text}
          </div>
        )}

      </form>
    </div>
  );
}
