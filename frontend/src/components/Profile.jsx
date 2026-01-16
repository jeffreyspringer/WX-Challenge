import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const BADGE_RULES = [
  { id: 'rookie', name: 'The Rookie', icon: '🐣', desc: 'Made your first prediction', check: h => h.length >= 1 },
  { id: 'regular', name: 'The Regular', icon: '📅', desc: 'Made 5+ predictions', check: h => h.length >= 5 },
  { id: 'veteran', name: 'The Veteran', icon: '👴', desc: 'Made 20+ predictions', check: h => h.length >= 20 },
  { id: 'sharpshooter', name: 'Sharpshooter', icon: '🎯', desc: 'Error under 2.0', check: h => h.some(i => i.rawError < 2.0) },
  { id: 'rainman', name: 'Rain Man', icon: '☔', desc: 'Perfect precip guess', check: h => h.some(i => i.precipError === 0) }
];

export default function Profile({ session }) {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState({ 
    username: '', 
    avatar_url: '', 
    banner_url: '' 
  });
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ ...profile });
  const [stats, setStats] = useState({ total: 0, avgError: 0 });
  const [history, setHistory] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [earnedBadges, setEarnedBadges] = useState([]);

  // Default Images (if none provided)
  const DEFAULT_BANNER = "https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?q=80&w=2000&auto=format&fit=crop";
  const DEFAULT_AVATAR = "https://cdn-icons-png.flaticon.com/512/1144/1144760.png";

  useEffect(() => {
    if (session) fetchProfileData();
  }, [session]);

  const fetchProfileData = async () => {
    try {
      const user = session.user;
      let { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      
      if (!profileData) {
        profileData = { username: user.email.split('@')[0], avatar_url: '', banner_url: '' };
      }

      const p = { 
        username: profileData.username, 
        avatar_url: profileData.avatar_url || '', 
        banner_url: profileData.banner_url || '' 
      };
      setProfile(p);
      setEditForm(p);

      const { data: preds } = await supabase.from('predictions').select(`*, actual_weather ( temp, wind_speed, precip )`).eq('user_id', user.id).order('prediction_date', { ascending: false });

      if (preds && preds.length > 0) {
        let totalError = 0;
        let completedCount = 0;
        const formattedHistory = preds.map(p => {
          let dailyError = null;
          let precipError = null;
          if (p.actual_weather) {
            dailyError = Math.abs(p.p_high - p.actual_weather.temp) + Math.abs(p.p_wind_speed - p.actual_weather.wind_speed);
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
            rawError: dailyError, precipError: precipError
          };
        });
        setHistory(formattedHistory);
        setChartData(formattedHistory.filter(h => h.rawError !== null).map(h => ({ date: h.date.slice(5), error: h.rawError })).reverse());
        setEarnedBadges(BADGE_RULES.filter(b => b.check(formattedHistory)));
        setStats({ total: preds.length, avgError: completedCount > 0 ? (totalError / completedCount).toFixed(1) : 0 });
      }
    } catch (error) { console.error('Error:', error); } finally { setLoading(false); }
  };

  const handleSaveProfile = async () => {
    try {
      const { error } = await supabase.from('profiles').upsert({
        id: session.user.id,
        username: editForm.username,
        avatar_url: editForm.avatar_url,
        banner_url: editForm.banner_url,
        updated_at: new Date()
      });
      if (error) throw error;
      setProfile(editForm);
      setIsEditing(false);
    } catch (error) { alert('Error saving profile!'); }
  };

  if (loading) return <div className="text-white p-10 text-center">Loading Profile...</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-10 relative">
      {/* ✏️ EDIT MODAL */}
      {isEditing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-white font-bold text-xl mb-4">Edit Profile</h2>
            
            <div className="mb-4">
              <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Display Name</label>
              <input value={editForm.username} onChange={e => setEditForm({...editForm, username: e.target.value})} className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white" />
            </div>

            <div className="mb-4">
              <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Avatar Image URL</label>
              <input 
                placeholder="https://..."
                value={editForm.avatar_url} 
                onChange={e => setEditForm({...editForm, avatar_url: e.target.value})} 
                className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white font-mono text-xs" 
              />
              <p className="text-[10px] text-slate-500 mt-1">Paste a link to an image (jpg/png) from the web.</p>
            </div>

            <div className="mb-6">
              <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Banner Image URL</label>
              <input 
                placeholder="https://..."
                value={editForm.banner_url} 
                onChange={e => setEditForm({...editForm, banner_url: e.target.value})} 
                className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white font-mono text-xs" 
              />
            </div>

            <div className="flex gap-2">
              <button onClick={handleSaveProfile} className="flex-1 bg-emerald-500 text-white py-2 rounded font-bold">Save</button>
              <button onClick={() => setIsEditing(false)} className="px-4 py-2 text-slate-400 font-bold">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* 👤 SOCIAL HEADER */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden relative group">
        {/* Banner Image */}
        <div 
          className="h-32 bg-cover bg-center bg-slate-800"
          style={{ backgroundImage: `url(${profile.banner_url || DEFAULT_BANNER})` }}
        >
           <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors"></div>
        </div>
        
        <div className="px-6 pb-6">
          <div className="flex justify-between items-end -mt-12 mb-4">
            <div className="flex items-end gap-4">
              {/* Avatar Image */}
              <div className="w-24 h-24 rounded-full bg-slate-950 border-4 border-slate-900 overflow-hidden shadow-xl">
                <img 
                  src={profile.avatar_url || DEFAULT_AVATAR} 
                  alt="avatar" 
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="mb-1">
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-black text-white capitalize">{profile.username}</h1>
                  <button onClick={() => setIsEditing(true)} className="text-xs bg-slate-800 text-slate-300 border border-slate-700 px-3 py-1 rounded-full font-bold hover:bg-slate-700 transition-all">Edit Profile</button>
                </div>
                <p className="text-slate-500 text-sm">Joined 2025</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* STATS & CHARTS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl text-center">
          <h3 className="text-slate-500 text-xs font-bold uppercase tracking-widest">Total Forecasts</h3>
          <p className="text-4xl font-black text-white mt-2">{stats.total}</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl text-center">
          <h3 className="text-slate-500 text-xs font-bold uppercase tracking-widest">Avg. Error</h3>
          <p className="text-4xl font-black text-emerald-400 mt-2">{stats.avgError}</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl text-center">
          <h3 className="text-slate-500 text-xs font-bold uppercase tracking-widest">Badges</h3>
          <p className="text-4xl font-black text-yellow-400 mt-2">{earnedBadges.length} <span className="text-lg text-slate-600">/ 5</span></p>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden p-6">
        <h2 className="text-white font-bold mb-4">Trophy Case</h2>
        {earnedBadges.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {earnedBadges.map(badge => (
              <div key={badge.id} className="bg-slate-950 border border-slate-800 p-4 rounded-lg flex flex-col items-center text-center">
                <div className="text-4xl mb-2">{badge.icon}</div>
                <div className="font-bold text-white text-sm">{badge.name}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-slate-500 text-sm italic text-center py-4">No badges yet.</div>
        )}
      </div>

      {chartData.length > 1 && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
           <h2 className="text-white font-bold mb-4">Accuracy Trend</h2>
           <div className="h-64 w-full">
             <ResponsiveContainer width="100%" height="100%">
               <LineChart data={chartData}>
                 <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                 <XAxis dataKey="date" stroke="#94a3b8" />
                 <YAxis stroke="#94a3b8" />
                 <Tooltip contentStyle={{ backgroundColor: '#0f172a' }} />
                 <Line type="monotone" dataKey="error" stroke="#34d399" strokeWidth={3} dot={{ fill: '#34d399' }} />
               </LineChart>
             </ResponsiveContainer>
           </div>
        </div>
      )}

    </div>
  );
}
