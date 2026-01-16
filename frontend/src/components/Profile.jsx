import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// 🏅 BADGE DEFINITIONS
const BADGE_RULES = [
  { id: 'rookie', name: 'The Rookie', icon: '🐣', desc: 'Made your first prediction', check: h => h.length >= 1 },
  { id: 'regular', name: 'The Regular', icon: '📅', desc: 'Made 5+ predictions', check: h => h.length >= 5 },
  { id: 'veteran', name: 'The Veteran', icon: '👴', desc: 'Made 20+ predictions', check: h => h.length >= 20 },
  { id: 'sharpshooter', name: 'Sharpshooter', icon: '🎯', desc: 'Error under 2.0', check: h => h.some(i => i.rawError < 2.0) },
  { id: 'rainman', name: 'Rain Man', icon: '☔', desc: 'Perfect precip guess', check: h => h.some(i => i.precipError === 0) }
];

export default function Profile({ session }) {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, avgError: 0 });
  const [history, setHistory] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [earnedBadges, setEarnedBadges] = useState([]);
  
  // 👤 SOCIAL STATE (New!)
  const [socials, setSocials] = useState({ followers: 0, following: 0 });

  useEffect(() => {
    if (session) fetchProfileData();
  }, [session]);

  const fetchProfileData = async () => {
    try {
      const user = session.user;
      
      // 1. Fetch Predictions
      const { data: preds, error } = await supabase
        .from('predictions')
        .select(`*, actual_weather ( temp, wind_speed, precip )`)
        .eq('user_id', user.id)
        .order('prediction_date', { ascending: false });

      if (error) throw error;

      // 2. Process Stats & History
      if (preds && preds.length > 0) {
        let totalError = 0;
        let completedCount = 0;
        
        const formattedHistory = preds.map(p => {
          let dailyError = null;
          let precipError = null;

          if (p.actual_weather) {
            const tempErr = Math.abs(p.p_high - p.actual_weather.temp);
            const windErr = Math.abs(p.p_wind_speed - p.actual_weather.wind_speed);
            dailyError = tempErr + windErr;
            precipError = Math.abs((p.p_precip || 0) - (p.actual_weather.precip || 0));
            
            totalError += dailyError;
            completedCount++;
          }

          return {
            date: p.prediction_date,
            station: p.station_id,
            prediction: `${p.p_high}°F / ${p.p_wind_speed}kt`,
            actual: p.actual_weather ? `${p.actual_weather.temp}°F` : 'Pending...',
            error: dailyError !== null ? dailyError.toFixed(1) : '--',
            rawError: dailyError, 
            precipError: precipError
          };
        });

        setHistory(formattedHistory);
        
        const graphPoints = formattedHistory
          .filter(h => h.rawError !== null)
          .map(h => ({ date: h.date.slice(5), error: h.rawError }))
          .reverse();
        
        setChartData(graphPoints);
        setEarnedBadges(BADGE_RULES.filter(b => b.check(formattedHistory)));
        setStats({
          total: preds.length,
          avgError: completedCount > 0 ? (totalError / completedCount).toFixed(1) : 0
        });
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="text-white p-10 text-center">Loading Profile...</div>;

  // 🎨 HELPER: Get username from email (user@gmail.com -> user)
  const username = session?.user?.email ? session.user.email.split('@')[0] : 'WeatherWizard';

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-10">
      
      {/* 👤 SOCIAL HEADER (Restored!) */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden relative">
        {/* Banner */}
        <div className="h-32 bg-gradient-to-r from-blue-900 via-slate-800 to-slate-900"></div>
        
        <div className="px-6 pb-6">
          <div className="flex justify-between items-end -mt-12 mb-4">
            {/* Avatar & Name */}
            <div className="flex items-end gap-4">
              <div className="w-24 h-24 rounded-full bg-slate-950 border-4 border-slate-900 flex items-center justify-center text-4xl shadow-xl">
                🧙‍♂️
              </div>
              <div className="mb-1">
                <h1 className="text-2xl font-black text-white capitalize">{username}</h1>
                <p className="text-slate-500 text-sm">Joined 2025</p>
              </div>
            </div>
            
            {/* Follow Counts */}
            <div className="flex gap-6 text-sm mb-2">
              <div className="text-center">
                <span className="block font-bold text-white text-lg">{socials.followers}</span>
                <span className="text-slate-500 uppercase text-[10px] font-bold">Followers</span>
              </div>
              <div className="text-center">
                <span className="block font-bold text-white text-lg">{socials.following}</span>
                <span className="text-slate-500 uppercase text-[10px] font-bold">Following</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 📊 STATS GRID */}
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
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl text-center">
          <h3 className="text-slate-500 text-xs font-bold uppercase tracking-widest">Badges Earned</h3>
          <p className="text-4xl font-black text-yellow-400 mt-2">{earnedBadges.length} <span className="text-lg text-slate-600">/ {BADGE_RULES.length}</span></p>
        </div>
      </div>

      {/* 🏆 TROPHY CASE */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden p-6">
        <h2 className="text-white font-bold mb-4">Trophy Case</h2>
        {earnedBadges.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {earnedBadges.map(badge => (
              <div key={badge.id} className="bg-slate-950 border border-slate-800 p-4 rounded-lg flex flex-col items-center text-center transition-transform hover:scale-105">
                <div className="text-4xl mb-2">{badge.icon}</div>
                <div className="font-bold text-white text-sm">{badge.name}</div>
                <div className="text-xs text-slate-500 mt-1">{badge.desc}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-slate-500 text-sm italic text-center py-4">
            No badges yet. Start predicting to earn them!
          </div>
        )}
      </div>

      {/* 📈 CHART */}
      {chartData.length > 1 && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
           <h2 className="text-white font-bold mb-4">Accuracy Trend <span className="text-xs text-slate-500 font-normal">(Points of Error)</span></h2>
           <div className="h-64 w-full">
             <ResponsiveContainer width="100%" height="100%">
               <LineChart data={chartData}>
                 <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                 <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} tickMargin={10} />
                 <YAxis stroke="#94a3b8" fontSize={12} />
                 <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b' }}
                    itemStyle={{ color: '#34d399' }}
                 />
                 <Line 
                    type="monotone" 
                    dataKey="error" 
                    stroke="#34d399" 
                    strokeWidth={3}
                    dot={{ fill: '#34d399' }} 
                    activeDot={{ r: 8 }} 
                  />
               </LineChart>
             </ResponsiveContainer>
           </div>
        </div>
      )}

      {/* 📜 HISTORY TABLE */}
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
