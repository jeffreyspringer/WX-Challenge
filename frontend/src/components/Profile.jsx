import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export default function Profile({ session, onProfileUpdate }) {
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState('');
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    async function getProfile() {
      setLoading(true);
      const { user } = session;

      const { data } = await supabase
        .from('profiles')
        .select(`username, avatar_url`)
        .eq('id', user.id)
        .single();

      if (data) {
        setUsername(data.username);
        setAvatarUrl(data.avatar_url);
      }
      setLoading(false);
    }
    getProfile();
  }, [session]);

  // 📸 HANDLE IMAGE UPLOAD
  const uploadAvatar = async (event) => {
    try {
      setUploading(true);

      if (!event.target.files || event.target.files.length === 0) {
        throw new Error('You must select an image to upload.');
      }

      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      // 1. Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // 2. Get Public URL
      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
      
      // 3. Update Profile instantly
      setAvatarUrl(data.publicUrl); // Show preview
      
    } catch (error) {
      alert(error.message);
    } finally {
      setUploading(false);
    }
  };

  const updateProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    
    const updates = {
      id: session.user.id,
      username,
      avatar_url: avatarUrl,
      updated_at: new Date(),
    };

    const { error } = await supabase.from('profiles').upsert(updates);

    if (error) {
      if (error.code === '23505') setMessage('❌ Username already taken!');
      else setMessage('❌ Error updating profile');
    } else {
      setMessage('✅ Profile updated!');
      // Tell App.js we are done so it unlocks the dashboard
      if (onProfileUpdate) onProfileUpdate(); 
    }
    setLoading(false);
  };

  return (
    <div className="max-w-md mx-auto bg-slate-900 border border-slate-800 p-8 rounded-xl shadow-2xl mt-10">
      <h2 className="text-2xl font-bold text-white mb-6 border-b border-slate-700 pb-2">Pilot Profile</h2>
      
      <div className="flex flex-col items-center mb-6">
        <div className="relative group cursor-pointer">
          <div className="w-24 h-24 bg-slate-700 rounded-full flex items-center justify-center overflow-hidden border-2 border-emerald-500 shadow-lg">
             {avatarUrl ? (
               <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
             ) : (
               <span className="text-4xl">✈️</span>
             )}
          </div>
          
          {/* OVERLAY ON HOVER */}
          <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
             <span className="text-xs font-bold text-white">CHANGE</span>
          </div>

          {/* HIDDEN FILE INPUT */}
          <input
            type="file"
            accept="image/*"
            onChange={uploadAvatar}
            disabled={uploading}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
        </div>
        <p className="text-slate-500 text-xs mt-2 uppercase font-bold tracking-widest">
          {uploading ? 'Uploading...' : 'Click to Update'}
        </p>
      </div>

      <form onSubmit={updateProfile} className="space-y-4">
        <div>
          <label className="block text-slate-400 text-xs uppercase font-bold mb-1">Unique Username</label>
          <input
            type="text"
            required
            value={username || ''}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded p-3 text-white focus:border-emerald-500 outline-none"
            placeholder="Callsign (e.g. Maverick)"
            minLength={3}
          />
        </div>

        <button
          className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded transition-colors disabled:opacity-50"
          disabled={loading || uploading}
        >
          {loading ? 'Saving...' : 'Save Profile'}
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
