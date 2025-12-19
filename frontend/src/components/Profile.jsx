import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export default function Profile({ session }) {
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState('');
  const [website, setWebsite] = useState('');
  const [avatar_url, setAvatarUrl] = useState('');
  const [message, setMessage] = useState('');

  // Fetch Profile Data
  useEffect(() => {
    async function getProfile() {
      setLoading(true);
      const { user } = session;

      const { data, error } = await supabase
        .from('profiles')
        .select(`username, website, avatar_url`)
        .eq('id', user.id)
        .single();

      if (data) {
        setUsername(data.username || '');
        setWebsite(data.website || '');
        setAvatarUrl(data.avatar_url || '');
      }
      setLoading(false);
    }
    getProfile();
  }, [session]);

  // Update Profile Data
  const updateProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    const { user } = session;

    const updates = {
      id: user.id,
      username,
      website,
      avatar_url,
      updated_at: new Date(),
    };

    const { error } = await supabase.from('profiles').upsert(updates);

    if (error) {
      if (error.code === '23505') setMessage('❌ Username already taken!');
      else setMessage('❌ Error updating profile');
    } else {
      setMessage('✅ Profile updated successfully!');
    }
    setLoading(false);
  };

  return (
    <div className="max-w-md mx-auto bg-slate-900 border border-slate-800 p-8 rounded-xl shadow-2xl mt-10">
      <h2 className="text-2xl font-bold text-white mb-6 border-b border-slate-700 pb-2">Pilot Profile</h2>
      
      <div className="flex flex-col items-center mb-6">
        <div className="w-24 h-24 bg-slate-700 rounded-full flex items-center justify-center text-4xl mb-4 overflow-hidden border-2 border-emerald-500">
           {avatar_url ? <img src={avatar_url} alt="Avatar" /> : "✈️"}
        </div>
        <p className="text-slate-400 text-sm">{session.user.email}</p>
      </div>

      <form onSubmit={updateProfile} className="space-y-4">
        <div>
          <label className="block text-slate-400 text-xs uppercase font-bold mb-1">Unique Username</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded p-3 text-white focus:border-emerald-500 outline-none"
            placeholder="Callsign (e.g. Maverick)"
            minLength={3}
          />
        </div>
        
        <div>
          <label className="block text-slate-400 text-xs uppercase font-bold mb-1">Avatar URL (Image Link)</label>
          <input
            type="text"
            value={avatar_url}
            onChange={(e) => setAvatarUrl(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded p-3 text-white focus:border-emerald-500 outline-none"
            placeholder="https://example.com/me.jpg"
          />
        </div>

        <button
          className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded transition-colors disabled:opacity-50"
          disabled={loading}
        >
          {loading ? 'Saving...' : 'Update Profile'}
        </button>
      </form>
      
      {message && (
        <div className={`mt-4 p-3 rounded text-center text-sm font-bold ${message.includes('❌') ? 'bg-red-900/50 text-red-200' : 'bg-emerald-900/50 text-emerald-200'}`}>
          {message}
        </div>
      )}
    </div>
  );
}
