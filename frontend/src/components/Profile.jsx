import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export default function Profile({ session, targetUserId, onBack, onNavigate }) {
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState({ totalPreds: 0, totalScore: 0, wins: 0 });
  const [counts, setCounts] = useState({ followers: 0, following: 0 });
  const [isFollowing, setIsFollowing] = useState(false);
  
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  
  // EDIT STATE
  const [username, setUsername] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [bannerUrl, setBannerUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [msg, setMsg] = useState('');

  // POPUP MODAL STATE
  const [showModal, setShowModal] = useState(null); // 'followers' or 'following' or null
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

      // 2. Get Stats
      const { data: preds } = await supabase.from('predictions').select('*').eq('user_id', viewId);
      setStats({ totalPreds: preds?.length || 0, totalScore: 0, wins: 0 });

      // 3. Get Counts
      const { count: followers } = await supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', viewId);
      const { count: following } = await supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', viewId);
      setCounts({ followers: followers || 0, following: following || 0 });

      // 4. Check Follow Status
      if (!isMe) {
        const { data: followCheck } = await supabase.from('follows').select('*').eq('follower_id', session.user.id).eq('following_id', viewId).single();
        setIsFollowing(!!followCheck);
      }
    } catch (error) { console.error(error); } finally { setLoading(false); }
  };

  // 🕵️ FETCH USER LIST FOR MODAL
  const openFollowList = async (type) => {
    setShowModal(type);
    setLoadingList(true);
    setModalList([]);

    try {
      let data;
      if (type === 'followers') {
        // Get people who follow THIS user
        // Step 1: Get the IDs
        const { data: follows } = await supabase.from('follows').select('follower_id').eq('following_id', viewId);
        const ids = follows.map(f => f.follower_id);
        // Step 2: Get the Profiles
        if (ids.length > 0) {
          const { data: profiles } = await supabase.from('profiles').select('*').in('id', ids);
          data = profiles;
        }
      } else {
        // Get people THIS user follows
        const { data: follows } = await supabase.from('follows').select('following_id').eq('follower_id', viewId);
        const ids = follows.map(f => f.following_id);
        if (ids.length > 0) {
          const { data: profiles } = await supabase.from('profiles').select('*').in('id', ids);
          data = profiles;
        }
      }
      setModalList(data || []);
    } catch (error) { console.error(error); } finally { setLoadingList(false); }
  };

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

  const uploadAvatar = async (event) => { /* ... Keep existing uploadAvatar code ... */
    try {
      setUploading(true);
      const file = event.target.files[0];
      const filePath = `${Math.random()}.${file.name.split('.').pop()}`;
      await supabase.storage.from('avatars').upload(filePath, file);
      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
      setAvatarUrl(data.publicUrl);
    } catch (e) { alert(e.message); } finally { setUploading(false); }
  };

  const uploadBanner = async (event) => { /* ... Keep existing uploadBanner code ... */
    try {
      setUploadingBanner(true);
      const file = event.target.files[0];
      const filePath = `${Math.random()}.${file.name.split('.').pop()}`;
      const { error } = await supabase.storage.from('banners').upload(filePath, file);
      if (error) throw error;
      const { data } = supabase.storage.from('banners').getPublicUrl(filePath);
      setBannerUrl(data.publicUrl);
    } catch (e) { alert('Banner upload failed: ' + e.message); } finally { setUploadingBanner(false); }
  };

  const saveProfile = async () => { /* ... Keep existing saveProfile code ... */
    const { error } = await supabase.from('profiles').upsert({
      id: session.user.id, username, avatar_url: avatarUrl, banner_url: bannerUrl, updated_at: new Date().toISOString()
    });
    if (error) setMsg(`❌ ${error.message}`);
    else { setMsg('✅ Saved!'); setEditMode(false); fetchProfileData(); }
  };

  if (loading) return <div className="text-center text-white p-10">Loading...</div>;

  return (
    <div className="max-w-2xl mx-auto bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl mt-6 relative">
      {!isMe && (
        <button onClick={onBack} className="absolute top-4 left-4 z-20 text-white hover:text-slate-200 flex items-center gap-1 text-sm font-bold drop-shadow-lg">← BACK</button>
      )}

      {/* BANNER */}
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
          {/* AVATAR */}
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

        {/* CLICKABLE FOLLOW COUNTS */}
        <div className="flex gap-6 mb-8 text-sm">
          <button onClick={() => openFollowList('following')} className="text-slate-300 hover:text-white transition-colors text-left group">
            <strong className="text-white text-lg group-hover:text-emerald-400">{counts.following}</strong> Following
          </button>
          <button onClick={() => openFollowList('followers')} className="text-slate-300 hover:text-white transition-colors text-left group">
            <strong className="text-white text-lg group-hover:text-emerald-400">{counts.followers}</strong> Followers
          </button>
        </div>

        {/* STATS */}
        <div className="grid grid-cols-3 gap-4 border-t border-slate-800 pt-6">
          <div className="bg-slate-950 p-4 rounded-lg text-center"><div className="text-slate-500 text-xs font-bold uppercase mb-1">Predictions</div><div className="text-2xl font-mono text-white">{stats.totalPreds}</div></div>
          <div className="bg-slate-950 p-4 rounded-lg text-center"><div className="text-slate-500 text-xs font-bold uppercase mb-1">Wins</div><div className="text-2xl font-mono text-emerald-400">{stats.wins}</div></div>
          <div className="bg-slate-950 p-4 rounded-lg text-center"><div className="text-slate-500 text-xs font-bold uppercase mb-1">Rank</div><div className="text-2xl font-mono text-blue-400">#--</div></div>
        </div>
      </div>

      {/* --- FOLLOW LIST MODAL --- */}
      {showModal && (
        <div className="absolute inset-0 z-50 bg-slate-950/95 backdrop-blur-sm p-6 flex flex-col animate-fade-in">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-white capitalize">{showModal}</h3>
            <button onClick={() => setShowModal(null)} className="text-slate-400 hover:text-white text-2xl font-bold">×</button>
          </div>
          
          <div className="flex-1 overflow-y-auto space-y-2">
            {loadingList ? (
              <div className="text-slate-500 text-center py-4">Loading list...</div>
            ) : modalList.length === 0 ? (
              <div className="text-slate-500 text-center py-4 italic">No users found.</div>
            ) : (
              modalList.map(u => (
                <div 
                  key={u.id} 
                  onClick={() => { setShowModal(null); onNavigate(u.id); }}
                  className="flex items-center gap-3 p-3 bg-slate-900 rounded-lg border border-slate-800 hover:border-emerald-500 cursor-pointer transition-all"
                >
                  <div className="w-10 h-10 rounded-full bg-slate-800 overflow-hidden">
                    {u.avatar_url ? <img src={u.avatar_url} alt="av" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center">👤</div>}
                  </div>
                  <span className="font-bold text-white">{u.username}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
