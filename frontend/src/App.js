import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import CountdownClock from './components/CountdownClock';
import PredictionForm from './components/PredictionForm';
import Leaderboard from './components/Leaderboard';
import Profile from './components/Profile';
import UserSearch from './components/UserSearch'; // NEW IMPORT

function App() {
  const [session, setSession] = useState(null);
  const [view, setView] = useState('dashboard'); // 'dashboard', 'profile'
  const [targetProfileId, setTargetProfileId] = useState(null); // Who are we looking at?

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setSession(session));
    return () => subscription.unsubscribe();
  }, []);

  // 🔍 NAVIGATION HELPER
  const goToProfile = (userId) => {
    setTargetProfileId(userId);
    setView('profile');
  };

  const goHome = () => {
    setTargetProfileId(null);
    setView('dashboard');
  };

  if (!session) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 p-8 rounded-xl shadow-2xl">
          <h1 className="text-3xl font-black text-center text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400 mb-6">TWCo WxChallenge</h1>
          <Auth supabaseClient={supabase} appearance={{ theme: ThemeSupa, variables: { default: { colors: { brand: '#10b981', brandAccent: '#059669' } } } }} theme="dark" providers={[]} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8">
      {/* HEADER */}
      <header className="max-w-6xl mx-auto mb-8 flex flex-col gap-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="cursor-pointer" onClick={goHome}>
            <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">TWCo WxChallenge</h1>
          </div>
          
          {/* SEARCH BAR (CENTER) */}
          <div className="w-full md:w-96">
            <UserSearch onSelectUser={goToProfile} />
          </div>

          {/* NAV BUTTONS */}
          <div className="flex items-center gap-2 bg-slate-900 p-1 rounded-lg border border-slate-800">
             <button onClick={goHome} className={`px-4 py-1.5 rounded-md text-sm font-bold ${view === 'dashboard' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}>Dashboard</button>
             <button onClick={() => goToProfile(session.user.id)} className={`px-4 py-1.5 rounded-md text-sm font-bold ${view === 'profile' && targetProfileId === session.user.id ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}>My Profile</button>
             <div className="w-px h-4 bg-slate-700 mx-1"></div>
             <button onClick={() => supabase.auth.signOut()} className="px-3 text-xs text-red-400 hover:text-red-300 font-mono">EXIT</button>
          </div>
        </div>
        
        {/* SUB HEADER: COUNTDOWN */}
        <div className="flex justify-center border-b border-slate-900 pb-8">
           <CountdownClock />
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="max-w-6xl mx-auto">
        {view === 'dashboard' ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1"><PredictionForm userId={session.user.id} /></div>
            <div className="lg:col-span-2"><Leaderboard /></div>
          </div>
        ) : (
          <Profile 
            session={session} 
            targetUserId={targetProfileId} 
            onBack={goHome} 
          />
        )}
      </main>
    </div>
  );
}

export default App;
