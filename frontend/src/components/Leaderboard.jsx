import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

// 🧮 SCORING MATH HELPER
const calculateScore = (prediction, actual) => {
  if (!prediction || !actual) return 0;
  
  let score = 0;
  score += Math.abs(prediction.p_high - actual.temp); 
  score += Math.abs(prediction.p_wind_speed - actual.wind_speed);
  
  const windDiff = Math.abs(prediction.p_wind_dir - actual.wind_dir) % 360;
  const circularDiff = windDiff > 180 ? 360 - windDiff : windDiff;
  score += circularDiff;

  score += Math.abs(prediction.p_precip - actual.precip) * 100;
  return Math.round(score);
};

export default function Leaderboard() {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL'); // 'ALL', 'KATL', 'KORD', 'KDFW'

  const fetchData = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];

      // 1. Get Live Weather
      const { data: weatherData } = await supabase
        .from('actual_weather')
        .select('*')
        .eq('date', today);
      
      const weatherMap = {};
      if (weatherData) weatherData.forEach(w => weatherMap[w.station_id] = w);

      // 2. Get Predictions for TODAY
      const { data: preds } = await supabase
        .from('predictions')
        .select('*')
        .eq('prediction_date', today);

      if (!preds || preds.length === 0) {
        setLeaderboard([]);
        setLoading(false);
        return;
      }

      // 3. Get Profiles
      const userIds = [...new Set(preds.map(p => p.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .in('id', userIds);

      const profileMap = {};
      if (profiles) profiles.forEach(p => profileMap[p.id] = p);

      // 4. Calculate Scores (Based on Filter)
      const userScores = {};
      
      preds.forEach(p => {
        // 🛑 FILTER LOGIC: Skip if prediction doesn't match selected station
        if (filter !== 'ALL' && p.station_id !== filter) return;

        const stationWeather = weatherMap[p.station_id];
        
        // Only grade if we have weather data (or show 0/pending)
        if (stationWeather) {
          const points = calculateScore(p, stationWeather);
          
          if (!userScores[p.user_id]) {
            const profile = profileMap[p.user_id] || {};
            userScores[p.user_id] = {
              id: p.user_id,
              username: profile.username || 'Unknown User',
              avatar: profile.avatar_url, // Allow null to show placeholder later
              totalScore: 0,
              stationsCompleted: 0
            };
          }
          userScores[p.user_id].totalScore += points;
          userScores[p.user_id].stationsCompleted += 1;
        }
      });

      // Convert to array and sort (Low Score Wins)
      const sorted = Object.values(userScores).sort((a, b) => a.totalScore - b.totalScore);
      setLeaderboard(sorted);

    } catch (error) {
      console.error("Error loading leaderboard:", error);
    } finally {
      setLoading(false);
    }
  };

  // Re-run whenever the filter changes
  useEffect(() => {
    fetchData();
    
    // Real-time subscription
    const subscription = supabase
      .channel('live-weather-updates')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'actual_weather' }, 
      () => fetchData())
      .subscribe();
      
    return () => supabase.removeChannel(subscription);
  }, [filter]); // Dependency on 'filter' ensures re-render on click

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl mt-8">
      {/* HEADER WITH TABS */}
      <div className="p-4 bg-slate-950 border-b border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4">
        
        <div className="flex items-center gap-2">
           <h2 className="font-bold text-lg text-slate-100">Live Standings</h2>
           <span className="flex h-3 w-3 relative">
             <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
             <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
           </span>
        </div>

        {/* FILTER TABS */}
        <div className="flex bg-slate-900 rounded-lg p-1 border border-slate-800">
           <button
             onClick={() => setFilter('ALL')}
             className={`px-3 py-1 text-xs font-bold rounded transition-all ${filter === 'ALL' ? 'bg-slate-700 text-white shadow' : 'text-slate-500 hover:text-slate-300'}`}
           >
             Combined
           </button>
           <div className="w-px h-4 bg-slate-800 mx-1 self-center"></div>
           {['KATL', 'KORD', 'KDFW'].map(station => (
             <button
               key={station}
               onClick={() => setFilter(station)}
               className={`px-3 py-1 text-xs font-bold rounded transition-all ${filter === station ? 'bg-blue-900/50 text-blue-200 border border-blue-800' : 'text-slate-500 hover:text-slate-300'}`}
             >
               {station}
             </button>
           ))}
        </div>

      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-400">
          <thead className="bg-slate-950 text-slate-200 uppercase font-bold text-xs">
            <tr>
              <th className="p-4">Rank</th>
              <th className="p-4">User</th>
              <th className="p-4 text-center">
                {filter === 'ALL' ? 'Stations' : 'Status'}
              </th>
              <th className="p-4 text-right">Total Error</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {loading ? (
              <tr><td colSpan="4" className="p-8 text-center">Loading Data...</td></tr>
            ) : leaderboard.length === 0 ? (
              <tr>
                <td colSpan="4" className="p-8 text-center text-slate-500 italic">
                  No data found for <strong>{filter === 'ALL' ? 'Any Station' : filter}</strong> Today.
                </td>
              </tr>
            ) : (
              leaderboard.map((player, index) => (
                <tr key={player.id} className="hover:bg-slate-800/50 transition-colors">
                  <td className="p-4 font-mono text-slate-500">
                    {index === 0 ? '🏆' : `#${index + 1}`}
                  </td>
                  <td className="p-4 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-700 overflow-hidden">
                       {player.avatar ? <img src={player.avatar} alt="av" className="w-full h-full object-cover"/> : <div className="w-full h-full flex items-center justify-center text-xs">👤</div>}
                    </div>
                    <span className={`font-medium ${index === 0 ? 'text-yellow-400 font-bold' : 'text-slate-200'}`}>
                      {player.username}
                    </span>
                  </td>
                  <td className="p-4 text-center font-mono text-xs text-slate-500">
                    {filter === 'ALL' ? `${player.stationsCompleted}/3` : 'Active'}
                  </td>
                  <td className="p-4 text-right font-bold text-emerald-400 font-mono text-lg">
                    {player.totalScore}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
