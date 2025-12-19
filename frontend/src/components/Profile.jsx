import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export default function Profile({ session, targetUserId, onBack }) {
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState({ totalPreds: 0, totalScore: 0, wins: 0 });
  const [counts, setCounts] = useState({ followers: 0, following: 0 });
  const [isFollowing, setIsFollowing] = useState(false);
  
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  
  // EDIT STATE
  const [username, setUsername] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState('');

  // Who are we looking at? (Target or Self)
  const viewId = targetUserId || session.user.id;
  const isMe = viewId === session.user.id;

  useEffect(() => {
    fetchProfileData();
  }, [viewId]);

  const fetchProfileData = async () => {
    setLoading(true);
    try {
      // 1. Get Profile Info
      const { data: user } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', viewId)
        .single();
      
      setProfile(user);
      setUsername(user.username);
      setAvatarUrl(user.avatar_url);

      // 2. Get Stats (Predictions)
      const { data: preds } = await supabase
        .from('predictions')
        .select('*')
        .eq('user_id', viewId);

      // Simple Stats Math
      const totalPreds = preds?.length || 0;
      // You can add complex scoring logic here later
      setStats({ totalPreds, totalScore: 0, wins: 0 });

      // 3. Get Follow Counts
      const { count: followers } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', viewId);

      const { count: following } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('follower_id', viewId);

      setCounts({ followers: followers || 0, following: following || 0 });

      // 4. Am I following them?
      if (!isMe) {
        const { data: followCheck } = await supabase
          .from('follows')
          .select('*')
          .eq('follower_id', session.user.id)
          .eq('following_id', viewId)
          .single();
        setIsFollowing(!!followCheck);
      }

    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  // 🤝 FOLLOW / UNFOLLOW LOGIC
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

  // 📸 UPLOAD LOGIC (Same as before)
  const uploadAvatar = async (event) => {
    try {
      setUploading(true);
      const file = event.target.files[0];
      const filePath = `${Math.random()}.${file.name.split('.').pop()}`;
      await supabase.storage.from('avatars').upload(filePath, file);
      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
      setAvatarUrl(data.publicUrl);
    } catch (e) { alert(e.message); } finally { setUploading(false); }
  };

  const saveProfile = async () => {
    const { error } = await supabase.from('profiles').upsert({
      id: session.user.id,
      username,
      avatar_url: avatarUrl,
      updated_at: new Date().toISOString()
    });
    if (error) setMsg(`❌ ${error.message}`);
    else { setMsg('✅ Saved!'); setEditMode(false); fetchProfileData(); }
  };

  if (loading) return <div className="text-center text-white p-10">Loading Pilot Data...</div>;

  return (
    <div className="max-w-2xl mx-auto bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl mt-6 relative">
      
      {/* Back Button (Only if viewing someone else) */}
      {!isMe && (
        <button onClick={onBack} className="absolute top-4 left-4 text-slate-400 hover:text-white flex items-center gap-1 text-sm font-bold">
          ← BACK
        </button>
      )}

      {/* Header Banner */}
      <div className="h-32 bg-gradient-to-r from-blue-900 to-slate-900"></div>

      {/* Main Content */}
      <div className="px-8 pb-8">
        
        {/* Avatar & Action Button Row */}
        <div className="flex justify-between items-end -mt-12 mb-6">
          <div className="relative">
             <div className="w-24 h-24 rounded-full border-4 border-slate-900 bg-slate-800 overflow-hidden">
               {avatarUrl ? <img src={avatarUrl} alt="av" className="w-full h-full object-cover" /> : <div className="p-6 text-4xl">✈️</div>}
             </div>
             {isMe && editMode && (
               <input type="file" onChange={uploadAvatar} disabled={uploading} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
             )}
          </div>

          {/* Action Button */}
          <div>
            {isMe ? (
              editMode ? (
                <div className="flex gap-2">
                  <button onClick={() => setEditMode(false)} className="px-4 py-2 rounded bg-slate-700 text-white text-sm font-bold">Cancel</button>
                  <button onClick={saveProfile} className="px-4 py-2 rounded bg-emerald-600 text-white text-sm font-bold">Save Changes</button>
                </div>
              ) : (
                <button onClick={() => setEditMode(true)} className="px-4 py-2 rounded bg-slate-800 hover:bg-slate-700 text-white text-sm font-bold border border-slate-700">Edit Profile</button>
              )
            ) : (
              <button 
                onClick={toggleFollow}
                className={`px-6 py-2 rounded-full font-bold shadow-lg transition-all ${isFollowing ? 'bg-slate-700 text-slate-300' : 'bg-emerald-500 hover:bg-emerald-400 text-white'}`}
              >
                {isFollowing ? 'Following' : 'Follow +'}
              </button>
            )}
          </div>
        </div>

        {/* Name & Handle */}
        <div className="mb-6">
          {isMe && editMode ? (
            <input value={username} onChange={e => setUsername(e.target.value)} className="bg-slate-950 text-white text-2xl font-bold p-2 rounded border border-slate-700 w-full" />
          ) : (
            <h1 className="text-3xl font-black text-white">{profile?.username}</h1>
          )}
          <p className="text-slate-500 text-sm font-mono uppercase tracking-widest">Pilot ID: {viewId.slice(0,8)}</p>
          {msg && <p className="mt-2 text-sm font-bold">{msg}</p>}
        </div>

        {/* Social Counts */}
        <div className="flex gap-6 mb-8 text-sm">
          <div className="text-slate-300"><strong className="text-white text-lg">{counts.following}</strong> Following</div>
          <div className="text-slate-300"><strong className="text-white text-lg">{counts.followers}</strong> Followers</div>
        </div>

        {/* STATS GRID */}
        <div className="grid grid-cols-3 gap-4 border-t border-slate-800 pt-6">
          <div className="bg-slate-950 p-4 rounded-lg text-center">
            <div className="text-slate-500 text-xs font-bold uppercase mb-1">Predictions</div>
            <div className="text-2xl font-mono text-white">{stats.totalPreds}</div>
          </div>
          <div className="bg-slate-950 p-4 rounded-lg text-center">
            <div className="text-slate-500 text-xs font-bold uppercase mb-1">Wins</div>
            <div className="text-2xl font-mono text-emerald-400">{stats.wins}</div>
          </div>
          <div className="bg-slate-950 p-4 rounded-lg text-center">
            <div className="text-slate-500 text-xs font-bold uppercase mb-1">Rank</div>
            <div className="text-2xl font-mono text-blue-400">#--</div>
          </div>
        </div>

      </div>
    </div>
  );
}
