import React, { useState } from 'react';
import { supabase } from '../supabaseClient';

export default function UserSearch({ onSelectUser }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);

  const handleSearch = async (e) => {
    const value = e.target.value;
    setQuery(value);

    if (value.length < 2) {
      setResults([]);
      return;
    }

    setSearching(true);
    const { data } = await supabase
      .from('profiles')
      .select('id, username, avatar_url')
      .ilike('username', `%${value}%`) // Case-insensitive search
      .limit(5);

    setResults(data || []);
    setSearching(false);
  };

  return (
    <div className="relative w-full max-w-md">
      <div className="relative">
        <input
          type="text"
          placeholder="🔍 Find a pilot..."
          value={query}
          onChange={handleSearch}
          className="w-full bg-slate-900 border border-slate-700 text-slate-100 rounded-full py-2 px-4 pl-10 focus:outline-none focus:border-emerald-500 transition-colors"
        />
      </div>

      {/* DROPDOWN RESULTS */}
      {results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl z-50 overflow-hidden">
          {results.map((user) => (
            <div
              key={user.id}
              onClick={() => {
                onSelectUser(user.id);
                setQuery('');
                setResults([]);
              }}
              className="flex items-center gap-3 p-3 hover:bg-slate-800 cursor-pointer transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-slate-700 overflow-hidden">
                {user.avatar_url ? (
                  <img src={user.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs">✈️</div>
                )}
              </div>
              <span className="font-bold text-slate-200">{user.username}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
