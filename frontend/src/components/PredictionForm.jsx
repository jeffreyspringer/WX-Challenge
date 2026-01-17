import React, { useState } from 'react'; // 👈 REMOVED 'useEffect' to fix the build error
import { supabase } from '../supabaseClient';

const STATIONS = ['KATL', 'KORD', 'KDFW'];

export default function PredictionForm({ session }) {
  // 1. EXTRACT USER ID FROM SESSION
  const userId = session?.user?.id;

  const [station, setStation] = useState('KATL');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  
  // 2. DRAFTS STATE: Keeps track of all 3 stations separately
  const [drafts, setDrafts] = useState({
    KATL: { high: '', precip: '', windSpeed: '', windDir: '' },
    KORD: { high: '', precip: '', windSpeed: '', windDir: '' },
    KDFW: { high: '', precip: '', windSpeed: '', windDir: '' }
  });

  // Helper to update just the current station's data
  const updateDraft = (field, value) => {
    setDrafts(prev => ({
      ...prev,
      [station]: { ...prev[station], [field]: value }
    }));
  };

  const currentDraft = drafts[station];

  // NWS Forecast Data (Mock data for the "Use This" button)
  const NWS_DATA = {
    KATL: { high: 72, wind: 8, precip: 0 },
    KORD: { high: 21, wind: 15, precip: 0.03 },
    KDFW: { high: 85, wind: 12, precip: 0 }
  };

  const fillFromNWS = () => {
    const nws = NWS_DATA[station];
    setDrafts(prev => ({
      ...prev,
      [station]: { 
        high: nws.high, 
        windSpeed: nws.wind, 
        precip: nws.precip, 
        windDir: prev[station].windDir || '' // Keep existing direction if set
      }
    }));
  };

  const handleSubmit = async () => {
    setMessage(null);

    // 3. VALIDATION: Check strictly for empty strings (allow "0")
    if (currentDraft.high === '' || currentDraft.precip === '' || currentDraft.windSpeed === '' || currentDraft.windDir === '') {
      setMessage({ type: 'error', text: `Please fill out all fields for ${station}` });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.from('predictions').upsert({
        user_id: userId, // Uses the ID from the session prop
        station_id: station,
        prediction_date: new Date(),
        p_high: parseFloat(currentDraft.high),
        p_precip: parseFloat(currentDraft.precip),
        p_wind_speed: parseInt(currentDraft.windSpeed),
        p_wind_dir: parseInt(currentDraft.windDir)
      });

      if (error) throw error;

      setMessage({ type: 'success', text: `Locked in ${station}! 🔒` });
      
    } catch (error) {
      console.error('Error submitting:', error);
      setMessage({ type: 'error', text: 'Failed to submit. Try again.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-2xl h-full flex flex-col">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-2xl font-black text-white">Make Prediction</h2>
          <p className="text-emerald-400 font-mono text-sm font-bold uppercase tracking-widest">Target: {new Date().toISOString().split('T')[0]}</p>
        </div>
        <div className="text-3xl">📝</div>
      </div>

      {/* NWS BOX */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 mb-6 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-xl">
             {station === 'KORD' ? '❄️' : '🌤️'}
          </div>
          <div>
            <div className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">NWS Forecast</div>
            <div className="text-white font-bold">High <span className="text-emerald-400">{NWS_DATA[station].high}°F</span> • Wind {NWS_DATA[station].wind} mph</div>
            <div className="text-slate-500 text-xs italic">Slight Chance {station === 'KORD' ? 'Snow Showers' : 'Rain'}</div>
          </div>
        </div>
        <button onClick={fillFromNWS} className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-3 py-1.5 rounded transition-colors uppercase">Use This</button>
      </div>

      {/* TABS */}
      <div className="flex bg-slate-950 p-1 rounded-lg mb-6 border border-slate-800">
        {STATIONS.map(s => (
          <button 
            key={s} 
            onClick={() => { setStation(s); setMessage(null); }}
            className={`flex-1 py-2 rounded-md text-sm font-black transition-all ${station === s ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* FORM */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Max Temp (°F)</label>
          <input 
            type="number" 
            value={currentDraft.high} 
            onChange={(e) => updateDraft('high', e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white font-mono font-bold focus:border-blue-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Precip (in)</label>
          <input 
            type="number" 
            step="0.01"
            value={currentDraft.precip} 
            onChange={(e) => updateDraft('precip', e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white font-mono font-bold focus:border-blue-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Wind Spd (kt)</label>
          <input 
            type="number" 
            value={currentDraft.windSpeed} 
            onChange={(e) => updateDraft('windSpeed', e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white font-mono font-bold focus:border-blue-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Wind Dir (0-360)</label>
          <input 
            type="number" 
            value={currentDraft.windDir} 
            onChange={(e) => updateDraft('windDir', e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white font-mono font-bold focus:border-blue-500 focus:outline-none"
          />
        </div>
      </div>

      <button 
        onClick={handleSubmit} 
        disabled={loading}
        className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-4 rounded-lg text-lg uppercase tracking-wider shadow-lg shadow-blue-900/20 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Submitting...' : `Lock It In (${station})`}
      </button>

      {message && (
        <div className={`mt-4 text-center text-sm font-bold ${message.type === 'error' ? 'text-red-400' : 'text-emerald-400'}`}>
          {message.type === 'error' ? '⚠️ ' : '✅ '} {message.text}
        </div>
      )}
    </div>
  );
}
