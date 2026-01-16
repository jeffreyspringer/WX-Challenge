import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// 🎨 PRESETS FOR CUSTOMIZATION
const AVATARS = ['🧙‍♂️', '🌪️', '⛈️', '🌤️', '👽', '🤖', '🦊', '⚡'];
const BANNERS = [
  { name: 'Midnight', class: 'from-blue-900 via-slate-800 to-slate-900' },
  { name: 'Sunset', class: 'from-orange-500 via-red-500 to-pink-500' },
  { name: 'Ocean', class: 'from-cyan-500 via-blue-500 to-indigo-500' },
  { name: 'Forest', class: 'from-emerald-500 via-green-500 to-teal-500' },
  { name: 'Storm', class: 'from-slate-700 via-slate-600 to-slate-800' },
];

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
  
  // 👤 USER DATA
  const [profile, setProfile] = useState({
    username: '',
    avatar: '🧙‍♂️',
    banner: 'from-blue-900 via-slate-800 to-slate-900'
  });
  
  // ✏️ EDIT MODE STATE
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ ...profile });

  // 📊 STATS DATA
  const [stats, setStats] = useState({ total: 0, avgError: 0 });
  const [history, setHistory] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [earnedBadges, setEarnedBadges] = useState([]);
  const [socials, setSocials] = useState({ followers: 0, following: 0 });

  useEffect(() => {
    if (session) fetchProfileData();
  }, [session]);

  const fetchProfileData = async () => {
    try {
      const user = session.user;

      // 1. Fetch Custom Profile Data (Avatar/Banner)
      let { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      // If no profile exists yet, use defaults and we will upsert later
      if (!profileData) {
        profileData = {
          username: user.email.split('@')[0],
          avatar_emoji: '🧙‍♂️',
          banner_color: 'from-blue-900 via-slate-800 to-slate-900'
        };
      }

      setProfile({
        username: profileData.username,
        avatar: profileData.avatar_emoji,
        banner: profileData.banner_color
      });
      setEditForm({
        username: profileData.username,
        avatar: profileData.avatar_emoji,
        banner: profileData.banner_color
      });

      // 2. Fetch Predictions
      const { data: preds, error } = await supabase
        .from('predictions')
        .select(`*, actual_weather ( temp, wind_speed, precip )`)
        .eq('user_id', user.id)
        .order('prediction_date', { ascending: false });

      if (error) throw error;

      // 3. Process Stats & History
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

  const handleSaveProfile = async () => {
    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: session.user.id,
          username: editForm.username,
          avatar_emoji: editForm.avatar,
          banner_color: editForm.banner,
          updated_at: new Date()
        });

      if (error) throw error;

      setProfile(editForm);
      setIsEditing(false);
    } catch (error) {
      alert('Error saving profile!');
      console.error(error);
    }
  };

  if (loading) return <div className="text-white p-10 text-center">Loading Profile...</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-10 relative">
      
      {/* ✏️ EDIT MODAL */}
      {isEditing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-white font-bold text-xl mb-4">Edit Profile</h2>
            
            {/* Username */}
            <div className="mb-4">
              <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Display Name</label>
              <input 
                value={editForm.username}
                onChange={e => setEditForm({...editForm, username: e.target.value})}
                className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white"
              />
            </div>

            {/* Avatar Picker */}
            <div className="mb-4">
              <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Choose Avatar</label>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {AVATARS.map(emoji => (
                  <button 
                    key={emoji}
                    onClick={() => setEditForm({...editForm, avatar: emoji})}
                    className={`text-2xl p-2 rounded hover:bg-slate-800 border ${editForm.avatar === emoji ? 'border-blue-500 bg-slate-800' : 'border-transparent'}`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            {/* Banner Picker */}
            <div className="mb-6">
              <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Choose Theme</label>
              <div className="grid grid-cols-5 gap-2">
                {BANNERS.map(b => (
                  <button 
                    key={b.name}
                    onClick={() => setEditForm({...editForm, banner: b.class})}
                    className={`h-8 rounded-md bg-gradient-to-r ${b.class} border-2 ${editForm.banner === b.class ? 'border-white' : 'border-transparent'}`}
                    title={b.name}
                  />
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <button onClick={handleSaveProfile} className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white py-2 rounded font-bold">Save Changes</button>
              <button onClick={() => setIsEditing(false)} className="px-4 py-2 text-slate-400 hover:text-white font-bold">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* 👤 SOCIAL HEADER */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden relative">
        {/* Dynamic Banner */}
        <div className={`h-32 bg-gradient-to-r ${profile.banner}`}></div>
        
        <div className="px-6 pb-6">
          <div className="flex justify-between items-end -mt-12 mb-4">
            {/* Avatar & Name */}
            <div className="flex items-end gap-4">
              <div className="w-24 h-24 rounded-full bg-slate-950 border-4 border-slate-900 flex items-center justify-center text-4xl shadow-xl">
                {profile.avatar}
              </div>
              <div className="mb-1">
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-black text-white capitalize">{profile.username}</h1>
                  {/* ✏️ EDIT BUTTON */}
                  <button 
                    onClick={() => setIsEditing(true)}
                    className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 px-3 py-1 rounded-full font-bold transition-all"
                  >
                    Edit Profile
                  </button>
                </div>
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
