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

// 🆕 UPDATED: Now accepts 'viewedId' prop to know WHICH profile to show
export default function Profile({ session, viewedId }) {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState({ 
    id: '',
    username: '', 
    avatar_url: '', 
    banner_url: '' 
  });
  
  const [stats, setStats] = useState({ total: 0, avgError: 0 });
  const [history, setHistory] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [earnedBadges, setEarnedBadges] = useState([]);
  const [socials, setSocials] = useState({ followers: 0, following: 0 });
  const [isFollowing, setIsFollowing] = useState(false);

  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({});

  const [followModal, setFollowModal] = useState(null); 
  const [followList, setFollowList] = useState([]);

  const DEFAULT_BANNER = "https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?q=80&w=2000&auto=format&fit=crop";
  const DEFAULT_AVATAR = "https://cdn-icons-png.flaticon.com/512/1144/1144760.png";

  useEffect(() => {
    if (session) fetchProfileData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, viewedId]); // 👈 RE-RUN IF VIEWED ID CHANGES

  const fetchProfileData = async () => {
    try {
      const currentUser = session.user;
      
      // 🆕 DECISION: Show 'viewedId' (Kevin) or 'currentUser' (You)
      const targetUserId = viewedId || currentUser.id; 

      // 1. Fetch Profile
      let { data: profileData } = await supabase.from('profiles').select('*').eq('id', targetUserId).single();
      
      if (!profileData) {
        // Fallback for new users
        profileData = { id: targetUserId, username: 'Unknown User', avatar_url: '', banner_url: '' };
        if (targetUserId === currentUser.id) {
           profileData.username = currentUser.email.split('@')[0];
        }
      }

      const p = { 
        id: profileData.id, // Important: Use the fetched ID, not session ID
        username: profileData.username, 
        avatar_url: profileData.avatar_url || '', 
        banner_url: profileData.banner_url || '' 
      };
      setProfile(p);
      setEditForm(p);

      // 2. Fetch History
      const { data: preds } = await supabase.from('predictions').select(`*, actual_weather ( temp, wind_speed, precip )`).eq('user_id', targetUserId).order('prediction_date', { ascending: false });

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
      } else {
        // Clear old data if user has no predictions
        setHistory([]);
        setChartData([]);
        setEarnedBadges([]);
        setStats({ total: 0, avgError: 0 });
      }

      // 3. Fetch Social Counts
      const { count: followersCount } = await supabase.from('relationships').select('*', { count: 'exact', head: true }).eq('following_id', targetUserId);
      const { count: followingCount } = await supabase.from('relationships').select('*', { count: 'exact', head: true }).eq('follower_id', targetUserId);
      setSocials({ followers: followersCount || 0, following: followingCount || 0 });

      // 4. Am I following this person?
      if (currentUser.id !== targetUserId) {
        const { data: rel } = await supabase.from('relationships').select('*').match({ follower_id: currentUser.id, following_id: targetUserId }).single();
        setIsFollowing(!!rel);
      }

    } catch (error) { console.error('Error:', error); } finally { setLoading(false); }
  };

  const openFollowList = async (type) => {
    setFollowModal(type);
    setFollowList([]); 
    
    try {
      let data;
      if (type === 'followers') {
        const { data: rels } = await supabase.from('relationships').select('follower_id').eq('following_id', profile.id);
        const ids = rels.map(r => r.follower_id);
        if (ids.length > 0) {
          const { data: users } = await supabase.from('profiles').select('*').in('id', ids);
          data = users;
        }
      } else {
        const { data: rels } = await supabase.from('relationships').select('following_id').eq('follower_id', profile.id);
        const ids = rels.map(r => r.following_id);
        if (ids.length > 0) {
          const { data: users } = await supabase.from('profiles').select('*').in('id', ids);
          data = users;
        }
      }
      setFollowList(data || []);
    } catch (error) { console.error("Error fetching list:", error); }
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

  const toggleFollow = async () => {
    if (isFollowing) {
      await supabase.from('relationships').delete().match({ follower_id: session.user.id, following_id: profile.id });
      setSocials(prev => ({ ...prev, followers: prev.followers - 1 }));
    } else {
      await supabase.from('relationships').insert({ follower_id: session.user.id, following_id: profile.id });
      setSocials(prev => ({ ...prev, followers: prev.followers + 1 }));
    }
    setIsFollowing(!isFollowing);
  };

  if (loading) return <div className="text-white p-10 text-center">Loading Profile...</div>;
  const isOwnProfile = session.user.id === profile.id;

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-10 relative">
      
      {isEditing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-white font-bold text-xl mb-4">Edit Profile</h2>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Display Name</label>
                <input value={editForm.username} onChange={e => setEditForm({...editForm, username: e.target.value})} className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Avatar URL</label>
                <input value={editForm.avatar_url} onChange={e => setEditForm({...editForm, avatar_url: e.target.value})} className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white font-mono text-xs" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Banner URL</label>
                <input value={editForm.banner_url} onChange={e => setEditForm({...editForm, banner_url: e.target.value})} className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white font-mono text-xs" />
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button onClick={handleSaveProfile} className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white py-2 rounded font-bold">Save Changes</button>
              <button onClick={() => setIsEditing(false)} className="px-4 py-2 text-slate-400 font-bold hover:text-white">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {followModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
            <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-950">
              <h2 className="text-white font-bold text-lg capitalize">{followModal}</h2>
              <button onClick={() => setFollowModal(null)} className="text-slate-500 hover:text-white font-bold">✕</button>
            </div>
            
            <div className="p-4 overflow-y-auto flex-1 space-y-2">
              {followList.length === 0 ? (
                <p className="text-slate-500 text-center italic py-4">No one here yet.</p>
              ) : (
                followList.map(user => (
                  <div key={user.id} className="flex items-center gap-3 p-2 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer">
                    <img src={user.avatar_url || DEFAULT_AVATAR} alt="av" className="w-10 h-10 rounded-full object-cover bg-slate-950 border border-slate-700"/>
                    <div>
                      <p className="text-white font-bold text-sm">{user.username}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden relative group">
        <div className="h-48 bg-cover bg-center bg-slate-800" style={{ backgroundImage: `url(${profile.banner_url || DEFAULT_BANNER})` }}>
           <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent"></div>
        </div>
        
        <div className="px-6 pb-6 relative">
          <div className="flex flex-col md:flex-row justify-between items-end -mt-16 mb-4">
            
            <div className="flex items-end gap-4">
              <div className="w-32 h-32 rounded-full bg-slate-950 border-4 border-slate-900 overflow-hidden shadow-2xl relative z-10">
                <img src={profile.avatar_url || DEFAULT_AVATAR} alt="avatar" className="w-full h-full object-cover"/>
              </div>
              <div className="mb-2 z-10">
                <h1 className="text-3xl font-black text-white capitalize drop-shadow-lg">{profile.username}</h1>
                <p className="text-slate-400 text-sm font-medium">Joined 2025</p>
              </div>
            </div>

            <div className="flex flex-col items-end gap-4 mt-4 md:mt-0 z-10">
              
              <div className="flex gap-6 text-sm bg-slate-950/50 backdrop-blur-sm p-3 rounded-lg border border-slate-800">
                <button onClick={() => openFollowList('followers')} className="text-center group hover:bg-slate-800/50 p-1 rounded transition-colors">
                  <span className="block font-bold text-white text-lg group-hover:text-blue-400 transition-colors">{socials.followers}</span>
                  <span className="text-slate-500 uppercase text-[10px] font-bold tracking-wider">Followers</span>
                </button>
                <div className="w-px bg-slate-800"></div>
                <button onClick={() => openFollowList('following')} className="text-center group hover:bg-slate-800/50 p-1 rounded transition-colors">
                  <span className="block font-bold text-white text-lg group-hover:text-blue-400 transition-colors">{socials.following}</span>
                  <span className="text-slate-500 uppercase text-[10px] font-bold tracking-wider">Following</span>
                </button>
              </div>

              {isOwnProfile ? (
                <button onClick={() => setIsEditing(true)} className="bg-slate-800 hover:bg-slate-700 text-white border border-slate-600 px-6 py-2 rounded-lg font-bold transition-all shadow-lg">Edit Profile</button>
              ) : (
                <button onClick={toggleFollow} className={`px-8 py-2 rounded-lg font-bold transition-all shadow-lg ${isFollowing ? 'bg-slate-800 text-slate-300 border border-slate-600' : 'bg-blue-600 hover:bg-blue-500 text-white'}`}>{isFollowing ? 'Unfollow' : 'Follow'}</button>
              )}
            </div>

          </div>
        </div>
      </div>

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
          <div className="grid grid-cols-2
