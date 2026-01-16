import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

const calculateScore = (prediction, actual) => {
  if (!prediction || !actual) return 0;
  let score = 0;
  score += Math.abs(prediction.p_high - actual.temp); 
  score += Math.abs(prediction.p_wind_speed - actual.wind_speed);
  const windDiff = Math.abs(prediction.p_wind_dir - actual.wind_dir) % 360;
  score += windDiff > 180 ? 360 - windDiff : windDiff;
  score += Math.abs(prediction.p_precip - actual.precip) * 100;
  return Math.round(score);
};

export default function Leaderboard() {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');

  // Default image if user hasn't set one
  const DEFAULT_AVATAR = "https://cdn-icons-png.flaticon.com/512/1144/1144760.png";

  const fetchData = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];

      const { data: weatherData } = await supabase.from('actual_weather').select('*').eq('date', today);
      const weatherMap = {};
      if (weatherData) weatherData.forEach(w => weatherMap[w.station_id] = w);

      const { data: preds } = await supabase.from('predictions').select('*').eq('prediction_date', today);

      if (!preds || preds.length === 0) {
        setLeaderboard([]);
        setLoading(false);
        return;
      }

      const userIds = [...new Set(preds.map(p => p.user_id))];
      // Fetch avatar_url now!
      const { data: profiles } = await supabase.from('profiles').select('id, username, avatar_url').in('id', userIds);

      const profileMap = {};
      if (profiles) profiles.forEach(p => profileMap[p.id] = p);

      const userScores = {};
      
      preds.forEach(p => {
        if (filter !== 'ALL' && p.station_id !== filter) return;
        const stationWeather = weatherMap[p.station_id];
        if (stationWeather) {
          const points = calculateScore(p, stationWeather);
          if (!userScores[p.user_id]) {
            const profile = profileMap[p.user_id] || {};
            userScores[p.user_id] = {
              id: p.user_id,
              username: profile.username || 'Unknown User',
              avatar: profile.avatar_url || DEFAULT_AVATAR, // Use URL or default
              totalScore: 0,
              stationsCompleted: 0
            };
          }
          userScores[p.user_id].totalScore += points;
          userScores[p.user_id].stationsCompleted += 1;
        }
      });

      setLeaderboard(Object.values(userScores).sort((a, b) => a.totalScore - b.totalScore));
    } catch (error) { console.error("Error loading leaderboard:", error); } finally { setLoading(false); }
  };

  useEffect(() => {
    fetchData();
    const sub = supabase.channel('live').on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'actual_weather' }, () => fetchData()).subscribe();
    return () => supabase.removeChannel(sub);
  }, [filter]);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl h-full flex flex-col">
      <div className="p-4 bg-slate-950 border-b border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4">
        <h2 className="font-bold text-lg text-slate-100 flex items-center gap-2">
          Live Standings
          <span className="flex h-3 w-3 relative"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span></span>
        </h2>
        <div className="flex bg-slate-900 rounded-lg p-1 border border-slate-800">
           <button onClick={() => setFilter('ALL')} className={`px-3 py-1 text-xs font-bold rounded ${filter === 'ALL' ? 'bg-slate-700 text-white' : 'text-slate-500 hover:text-slate-300'}`}>Combined</button>
           <div className="w-px h-4 bg-slate-800 mx-1 self-center"></div>
           {['KATL', 'KORD', 'KDFW'].map(s => (
             <button key={s} onClick={() => setFilter(s)} className={`px-3 py-1 text-xs font-bold rounded ${filter === s ? 'bg-blue-900/50 text-blue-200 border border-blue-800' : 'text-slate-500 hover:text-slate-300'}`}>{s}</button>
           ))}
        </div>
      </div>
      
      <div className="flex-1 overflow-auto">
        <table className="w-full text-left text-sm text-slate-400">
          <thead className="bg-slate-950 text-slate-200 uppercase font-bold text-xs sticky top-0 z-10">
            <tr><th className="p-4">Rank</th><th className="p-4">User</th><th className="p-4 text-center">Stats</th><th className="p-4 text-right">Score</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {loading ? ( <tr><td colSpan="4" className="p-8 text-center">Loading...</td></tr> ) : leaderboard.length === 0 ? ( <tr><td colSpan="4" className="p-8 text-center text-slate-500 italic">No data today.</td></tr> ) : (
              leaderboard.map((player, index) => (
                <tr key={player.id} className="hover:bg-slate-800/50 transition-colors">
                  <td className="p-4 font-mono text-slate-500">{index === 0 ? '🏆' : `#${index + 1}`}</td>
                  <td className="p-4 flex items-center gap-3">
                    <img src={player.avatar} alt="av" className="w-8 h-8 rounded-full object-cover border border-slate-700 bg-slate-800"/>
                    <span className={`font-medium ${index === 0 ? 'text-yellow-400 font-bold' : 'text-slate-200'}`}>{player.username}</span>
                  </td>
                  <td className="p-4 text-center font-mono text-xs text-slate-500">{filter === 'ALL' ? `${player.stationsCompleted}/3` : 'Active'}</td>
                  <td className="p-4 text-right font-bold text-emerald-400 font-mono text-lg">{player.totalScore}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
