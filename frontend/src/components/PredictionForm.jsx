import React, { useState } from 'react';
import { supabase } from '../supabaseClient';

const PredictionForm = ({ userId }) => {
  const [formData, setFormData] = useState({
    station: 'KATL',
    high: '',
    low: '',
    precip: '',
    windSpeed: '',
    windDir: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Check if it's past 8 PM EST
    const now = new Date();
    const estOffset = -5; // Adjustment for EST
    const estTime = new Date(now.getTime() + (estOffset * 3600000));
    
    if (estTime.getHours() >= 20) {
      alert("Predictions are locked for today! Come back tomorrow.");
      return;
    }

    const { error } = await supabase.from('predictions').insert([{
      user_id: userId,
      station_id: formData.station,
      prediction_date: new Date(new Date().setDate(new Date().getDate() + 1)).toISOString().split('T')[0],
      p_high: formData.high,
      p_low: formData.low,
      p_precip: formData.precip,
      p_wind_speed: formData.windSpeed,
      p_wind_dir: formData.windDir
    }]);

    if (error) alert(error.message);
    else alert("Prediction Locked In!");
  };

  return (
    <form onSubmit={handleSubmit} className="p-6 bg-slate-800 rounded-lg shadow-lg space-y-4 text-white">
      <h3 className="text-xl font-bold">Submit Tomorrow's Forecast</h3>
      <select 
        className="w-full bg-slate-700 p-2 rounded"
        onChange={(e) => setFormData({...formData, station: e.target.value})}
      >
        <option value="KATL">KATL (Atlanta)</option>
        <option value="KORD">KORD (Chicago)</option>
        <option value="KDFW">KDFW (Dallas)</option>
      </select>
      <div className="grid grid-cols-2 gap-4">
        <input type="number" placeholder="High Temp" className="bg-slate-700 p-2 rounded" onChange={(e) => setFormData({...formData, high: e.target.value})} />
        <input type="number" placeholder="Low Temp" className="bg-slate-700 p-2 rounded" onChange={(e) => setFormData({...formData, low: e.target.value})} />
      </div>
      <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 py-3 rounded font-bold">Lock It In</button>
    </form>
  );
};

export default PredictionForm;
