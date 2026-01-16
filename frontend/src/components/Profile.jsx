import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

export default function Profile({ session }) {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, avgError: 0, bestStation: '--' });
  const [history, setHistory] = useState([]);

  useEffect(() => {
    if (session) fetchProfileData();
  }, [session]);

  const fetchProfileData = async () => {
    try {
      const user = session.user;
      
      // 1. Get all past predictions for this user
      const { data: preds, error } = await supabase
        .from('predictions')
        .select(`
          *,
          actual_weather ( temp, wind_speed, precip )
        `)
        .eq('user_id', user.id)
        .order('prediction_date', { ascending: false });

      if (error) throw error;

      // 2. Calculate Stats
      if (preds && preds.length > 0) {
        let totalError = 0;
        let completedCount = 0;
        
        // Simple history mapping
        const formattedHistory = preds.map(p => {
          // Calculate error only if we have actual weather data
          let dailyError = null;
          if (p.actual_weather) {
            dailyError = Math.abs(p.p_high - p.actual_weather.temp) + 
                         Math.abs(p.p_wind_speed - p.actual_weather.wind_speed);
            totalError += dailyError;
            completedCount++;
          }

          return {
            date: p.prediction_date,
            station: p.station_id,
            prediction: `${p.p_high}°F / ${p.p_wind_speed}kt`,
            actual: p.actual_weather ? `${p.actual_weather.temp}°F` : 'Pending...',
            error: dailyError !== null ? dailyError : '--'
          };
        });

        setHistory(formattedHistory);
        setStats({
          total: preds.length,
          avgError: completedCount > 0 ? (totalError / completedCount).toFixed(1) : 0,
          bestStation: 'TBD' // Placeholder for future logic
        });
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="text-white p-10 text-center">Loading Profile...</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      
      {/* 🏆 HEADER STATS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl text-center">
          <h3 className="text-slate-500 text-xs font-bold uppercase tracking-widest">Total Forecasts</h3>
          <p className="text-4xl font-black text-white mt-2">{stats.total}</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl text-center">
          <h3 className="text-slate-500 text-xs font-bold uppercase tracking-widest">Avg. Error</h3>
          <p className="text-4xl font-black text-emerald-400 mt-2">{stats.avgError}</p>
          <span className="text-xs text-slate-500">Lower is better</span>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl text-center opacity-50">
          <h3 className="text-slate-500 text-xs font-bold uppercase tracking-widest">Badges</h3>
          <p className="text-xl font-bold text-slate-400 mt-4">Coming Soon</p>
        </div>
      </div>

      {/* 📜 HISTORY LIST */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-slate-800">
          <h2 className="text-white font-bold">Prediction History</h2>
        </div>
        <table className="w-full text-left text-sm text-slate-400">
          <thead className="bg-slate-950 text-slate-200 uppercase font-bold text-xs">
            <tr>
              <th className="p-4">Date</th>
              <th className="p-4">Station</th>
              <th className="p-4">Your Pick</th>
              <th className="p-4">Actual</th>
              <th className="p-4 text-right">Error Pts</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {history.map((row, i) => (
              <tr key={i} className="hover:bg-slate-800/50">
                <td className="p-4">{row.date}</td>
                <td className="p-4 font-bold text-blue-400">{row.station}</td>
                <td className="p-4">{row.prediction}</td>
                <td className="p-4">{row.actual}</td>
                <td className="p-4 text-right font-mono text-emerald-400">{row.error}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </div>
  );
}
