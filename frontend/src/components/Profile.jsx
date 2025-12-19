import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

// 🧮 SCORING HELPER (Same as Leaderboard)
const calculateScore = (prediction, actual) => {
  if (!prediction || !actual) return null; // Null means "Pending"
  
  let score = 0;
  score += Math.abs(prediction.p_high - actual.temp); 
  score += Math.abs(prediction.p_wind_speed - actual.wind_speed);
  
  const windDiff = Math.abs(prediction.p_wind_dir - actual.wind_dir) % 360;
  const circularDiff = windDiff > 180 ? 360 - windDiff : windDiff;
  score += circularDiff;

  score += Math.abs(prediction.p_precip - actual.precip) * 100;
  return Math.round(score);
};

export default function Profile({ session, targetUserId, onBack, onNavigate }) {
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState({ totalPreds: 0, wins: 0 });
  const [counts, setCounts] = useState({ followers: 0, following: 0 });
  const [isFollowing, setIsFollowing] = useState(false);
  
  // HISTORY & FILTERING
  const [predictions, setPredictions] = useState([]); // All predictions
  const [history, setHistory] = useState([]); // Merged with scores
  const [filter, setFilter] = useState('ALL'); // 'ALL', 'KATL', 'KORD', 'KDFW'

  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  
  // EDIT STATE
  const [username, setUsername] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [bannerUrl, setBannerUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [msg, setMsg] = useState('');

  // MODAL STATE
  const [showModal, setShowModal] = useState(null); 
  const [modalList, setModalList] = useState([]);
  const [loadingList, setLoadingList] = useState(false);

  const viewId = targetUserId || session.user.id;
  const isMe = viewId === session.user.id;

  useEffect(() => {
    fetchProfileData();
  }, [viewId]);

  const fetchProfileData = async () => {
    setLoading(true);
    try {
      // 1. Get Profile
      const { data: user } = await supabase.from('profiles').select('*').eq('id', viewId).single();
      setProfile(user);
      setUsername(user.username || '');
      setAvatarUrl(user.avatar_url || '');
      setBannerUrl(user.banner_url || '');

      // 2. Get Predictions
      const { data: preds } = await supabase
        .from('predictions')
        .select('*')
        .eq('user_id', viewId)
        .order('prediction_date', { ascending: false }); // Newest first

      setPredictions(preds || []);

      // 3. Get Actual Weather (to grade the predictions)
      const dates = [...new Set(preds.map(p => p.prediction_date))];
      const { data: actuals } = await supabase
        .from('actual_weather')
        .select('*')
        .in('date', dates);

      // 4. Merge & Grade
      const weatherMap = {};
      if (actuals) actuals.forEach(w => weatherMap[`${w.date}_${w.station_id}`] = w);

      const gradedHistory = preds.map(p => {
        const actual = weatherMap[`${p.prediction_date}_${p.station_id}`];
        const score = calculateScore(p, actual);
        return { ...p, score, actual }; // Attach score to prediction
      });

      setHistory(gradedHistory);

      // Simple Stats
      const totalPreds = preds?.length || 0;
      const wins = gradedHistory.filter(h => h.score !== null && h.score < 20).length; // "Win" is score < 20
      setStats({ totalPreds, wins });

      // 5. Get Counts
      const { count: followers } = await supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', viewId);
      const { count: following } = await supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', viewId);
      setCounts({ followers: followers || 0, following: following || 0 });

      // 6. Check Follow
      if (!isMe) {
        const { data: followCheck } = await supabase.from('follows').select('*').eq('follower_id', session.user.id).eq('following_id', viewId).single();
        setIsFollowing(!!followCheck);
      }
    } catch (error) { console.error(error); } finally { setLoading(false); }
  };

  // --- EXISTING UPLOAD/SAVE FUNCTIONS (Shortened for brevity - paste your existing ones here if changed) ---
  const toggleFollow = async () => {
     if (isFollowing) {
       await supabase.from('follows').delete().eq('follower_id', session.user.id).eq('following_id', viewId);
       setCounts(prev => ({ ...prev, followers: prev.followers - 1 }));
     } else {
       await supabase.from('follows').insert({ follower_id: session.user.id, following_id: viewId });
       setCounts(prev => ({ ...prev, followers: prev.followers + 1 }));
     }
     setIsFollowing(!isFollowing);
  };
  const openFollowList = async (type) => {
    setShowModal(type); setLoadingList(true); setModalList([]);
    try {
      const field = type === 'followers' ? 'follower_id' : 'following_id';
      const searchField = type === 'followers' ? 'following_id' : 'follower_id';
      const { data: follows } = await supabase.from('follows').select(field).eq(searchField, viewId);
      const ids = follows.map(f => f[field]);
      if (ids.length > 0) {
        const { data: profiles } = await supabase.from('profiles').select('*').in('id', ids);
        setModalList(profiles || []);
      }
    } catch (e) { console.error(e); } finally { setLoadingList(false); }
  };
  const uploadAvatar = async (e) => {
    try { setUploading(true); const file = e.target.files[0]; const path = `${Math.random()}.${file.name.split('.').pop()}`; await supabase.storage.from('avatars').upload(path, file); const { data } = supabase.storage.from('avatars').getPublicUrl(path); setAvatarUrl(data.publicUrl); } catch(err){alert(err.message)} finally{setUploading(false)}
  };
  const uploadBanner = async (e) => {
    try { setUploadingBanner(true); const file = e.target.files[0]; const path = `${Math.random()}.${file.name.split('.').pop()}`; await supabase.storage.from('banners').upload(path, file); const { data } = supabase.storage.from('banners').getPublicUrl(path); setBannerUrl(data.publicUrl); } catch(err){alert(err.message)} finally{setUploadingBanner(false)}
  };
  const saveProfile = async () => {
    const { error } = await supabase.from('profiles').upsert({ id: session.user.id, username, avatar_url: avatarUrl, banner_url: bannerUrl, updated_at: new Date().toISOString() });
    if (error) setMsg(`❌ ${error.message}`); else { setMsg('✅ Saved!'); setEditMode(false); fetchProfileData(); }
  };

  if (loading) return <div className="text-center text-white p-10">Loading...</div>;

  // FILTER LOGIC
  const visibleHistory = history.filter(h => filter === 'ALL' || h.station_id === filter);

  return (
    <div className="max-w-2xl mx-auto mt-6 pb-20">
      
      {/* --- PROFILE CARD (Keep exactly as is) --- */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl relative mb-8">
        {!isMe && ( <button onClick={onBack} className="absolute top-4 left-4 z-20 text-white hover:text-slate-200 flex items-center gap-1 text-sm font-bold drop-shadow-lg">← BACK</button> )}
        
        {/* Banner */}
        <div className="relative h-32 bg-gradient-to-r from-blue-900 to-slate-900 group overflow-hidden">
           {bannerUrl && <img src={bannerUrl} alt="banner" className="w-full h-full object-cover opacity-80" />}
           {isMe && editMode && (
              <label className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity z-10">
                <span className="text-white font-bold text-sm border border-white px-3 py-1 rounded backdrop-blur-sm">🖼️ Change Banner</span>
                <input type="file" accept="image/*" onChange={uploadBanner} disabled={uploadingBanner} className="hidden" />
              </label>
           )}
           {uploadingBanner && <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-white font-bold z-20">Uploading...</div>}
        </div>

        <div className="px-8 pb-8">
          <div className="flex justify-between items-end -mt-12 mb-6 relative z-10">
            <div className="relative group">
               <div className="w-24 h-24 rounded-full border-4 border-slate-900 bg-slate-800 overflow-hidden relative z-10">
                 {avatarUrl ? <img src={avatarUrl} alt="av" className="w-full h-full object-cover" /> : <div className="p-6 text-4xl">👤</div>}
               </div>
               {isMe && editMode && (
                 <label className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity z-20 border-4 border-transparent">
                   <span className="text-white text-xs font-bold">CHANGE</span>
                   <input type="file" accept="image/*" onChange={uploadAvatar} disabled={uploading} className="hidden" />
                 </label>
               )}
               {uploading && <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/60 rounded-full text-white text-xs font-bold border-4 border-slate-900">...</div>}
            </div>
            <div>
              {isMe ? (
                editMode ? (
                  <div className="flex gap-2">
                    <button onClick={() => { setEditMode(false); setMsg(''); fetchProfileData(); }} className="px-4 py-2 rounded bg-slate-700 text-white text-sm font-bold">Cancel</button>
                    <button onClick={saveProfile} className="px-4 py-2 rounded bg-emerald-600 text-white text-sm font-bold">Save</button>
                  </div>
                ) : (
                  <button onClick={() => setEditMode(true)} className="px-4 py-2 rounded bg-slate-800 hover:bg-slate-700 text-white text-sm font-bold border border-slate-700">Edit Profile</button>
                )
              ) : (
                <button onClick={toggleFollow} className={`px-6 py-2 rounded-full font-bold shadow-lg transition-all ${isFollowing ? 'bg-slate-700 text-slate-300' : 'bg-emerald-500 hover:bg-emerald-400 text-white'}`}>
                  {isFollowing ? 'Following' : 'Follow +'}
                </button>
              )}
            </div>
          </div>

          <div className="mb-6">
            {isMe && editMode ? (
              <input value={username} onChange={e => setUsername(e.target.value)} className="bg-slate-950 text-white text-2xl font-bold p-2 rounded border border-slate-700 w-full" placeholder="Username" />
            ) : (
              <h1 className="text-3xl font-black text-white">{profile?.username || 'Unknown User'}</h1>
            )}
            <p className="text-slate-500 text-sm font-mono uppercase tracking-widest">User ID: {viewId.slice(0,8)}</p>
            {msg && <p className={`mt-2 text-sm font-bold ${msg.includes('✅') ? 'text-emerald-400' : 'text-red-400'}`}>{msg}</p>}
          </div>

          <div className="flex gap-6 mb-8 text-sm">
            <button onClick={() => openFollowList('following')} className="text-slate-300 hover:text-white transition-colors text-left group">
              <strong className="text-white text-lg group-hover:text-emerald-400">{counts.following}</strong> Following
            </button>
            <button onClick={() => openFollowList('followers')} className="text-slate-300 hover:text-white transition-colors text-left group">
              <strong className="text-white text-lg group-hover:text-emerald-400">{counts.followers}</strong> Followers
            </button>
          </div>

          <div className="grid grid-cols-3 gap-4 border-t border-slate-800 pt-6">
            <div className="bg-slate-950 p-4 rounded-lg text-center"><div className="text-slate-500 text-xs font-bold uppercase mb-1">Predictions</div><div className="text-2xl font-mono text-white">{stats.totalPreds}</div></div>
            <div className="bg-slate-950 p-4 rounded-lg text-center"><div className="text-slate-500 text-xs font-bold uppercase mb-1">Wins</div><div className="text-2xl font-mono text-emerald-400">{stats.wins}</div></div>
            <div className="bg-slate-950 p-4 rounded-lg text-center"><div className="text-slate-500 text-xs font-bold uppercase mb-1">Rank</div><div className="text-2xl font-mono text-blue-400">#--</div></div>
          </div>
        </div>
      </div>

      {/* --- 📜 NEW: PREDICTION LOGBOOK --- */}
      <div className="flex items-center justify-between mb-4 px-2">
        <h3 className="text-xl font-bold text-white">Logbook</h3>
        
        {/* FILTER BUTTONS */}
        <div className="flex bg-slate-900 rounded-lg p-1 border border-slate-800">
           {['ALL', 'KATL', 'KORD', 'KDFW'].map(loc => (
             <button
               key={loc}
               onClick={() => setFilter(loc)}
               className={`px-3 py-1 text-xs font-bold rounded transition-colors ${filter === loc ? 'bg-slate-700 text-white shadow' : 'text-slate-500 hover:text-slate-300'}`}
             >
               {loc}
             </button>
           ))}
        </div>
      </div>

      <div className="space-y-3">
        {visibleHistory.length === 0 ? (
          <div className="text-center p-8 text-slate-500 italic bg-slate-900/50 rounded-xl border border-slate-800">
            No flight logs found for this filter.
          </div>
        ) : (
          visibleHistory.map((item) => {
            // DETERMINE COLOR:
            // Grey = Pending (No score yet)
            // Green = Good (Score < 20)
            // Red = Bad (Score >= 20)
            let borderColor = 'border-slate-700';
            let bgGradient = 'from-slate-800 to-slate-900';
            let statusIcon = '⏳';
            
            if (item.score !== null) {
               if (item.score < 20) {
                 borderColor = 'border-emerald-500/50';
                 bgGradient = 'from-emerald-900/20 to-slate-900';
                 statusIcon = '✅';
               } else {
                 borderColor = 'border-red-500/50';
                 bgGradient = 'from-red-900/20 to-slate-900';
                 statusIcon = '❌';
               }
            }

            return (
              <div key={item.id} className={`relative flex items-center justify-between p-4 rounded-lg border ${borderColor} bg-gradient-to-r ${bgGradient} shadow-sm transition-all hover:scale-[1.01]`}>
                
                {/* LEFT: DATE & STATION */}
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs text-slate-400">{item.prediction_date}</span>
                    <span className="font-black text-white text-lg tracking-wide">{item.station_id}</span>
                  </div>
                  <div className="text-xs text-slate-400 font-mono">
                    H:{item.p_high}° • W:{item.p_wind_speed}kt • {item.p_wind_dir}°
                  </div>
                </div>

                {/* RIGHT: SCORE */}
                <div className="text-right">
                   {item.score !== null ? (
                     <>
                       <div className="text-2xl font-black text-white">{item.score}</div>
                       <div className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">Error Pts</div>
                     </>
                   ) : (
                     <div className="flex flex-col items-end">
                       <span className="text-sm font-bold text-slate-500">PENDING</span>
                       <span className="text-xs text-slate-600">Awaiting Weather</span>
                     </div>
                   )}
                </div>

                {/* STATUS ICON OVERLAY */}
                <div className="absolute -top-2 -right-2 bg-slate-900 rounded-full p-1 border border-slate-800 shadow-sm text-xs">
                  {statusIcon}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* --- FOLLOW LIST MODAL (Keep as is) --- */}
      {showModal && (
        <div className="absolute inset-0 z-50 bg-slate-950/95 backdrop-blur-sm p-6 flex flex-col h-full fixed top-0 left-0 w-full">
          <div className="flex justify-between items-center mb-6 max-w-2xl mx-auto w-full">
            <h3 className="text-xl font-bold text-white capitalize">{showModal}</h3>
            <button onClick={() => setShowModal(null)} className="text-slate-400 hover:text-white text-2xl font-bold">×</button>
          </div>
          <div className="flex-1 overflow-y-auto space-y-2 max-w-2xl mx-auto w-full">
            {loadingList ? <div className="text-center text-slate-500">Loading...</div> : modalList.map(u => (
                <div key={u.id} onClick={() => { setShowModal(null); onNavigate(u.id); }} className="flex items-center gap-3 p-3 bg-slate-900 rounded-lg border border-slate-800 hover:border-emerald-500 cursor-pointer">
                  <div className="w-10 h-10 rounded-full bg-slate-800 overflow-hidden">{u.avatar_url ? <img src={u.avatar_url} className="w-full h-full object-cover"/> : '👤'}</div>
                  <span className="font-bold text-white">{u.username}</span>
                </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
