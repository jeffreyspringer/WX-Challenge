import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import CountdownClock from './components/CountdownClock';
import PredictionForm from './components/PredictionForm';
import Leaderboard from './components/Leaderboard';
import Profile from './components/Profile';
import UserSearch from './components/UserSearch';
import CurrentWeather from './components/CurrentWeather'; 

function App() {
  const [session, setSession] = useState(null);
  const [view, setView] = useState('dashboard'); 
  const [targetProfileId, setTargetProfileId] = useState(null); 
  const [username, setUsername] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) checkProfile(session.user.id);
      else setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) checkProfile(session.user.id);
      else setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkProfile = async (userId) => {
    const { data } = await supabase.from('profiles').select('username').eq('id', userId).single();
    if (data && data.username && data.username.length > 0) {
      setUsername(data.username);
    } else {
      setUsername(null);
      setView('profile'); 
    }
    setLoading(false);
  };

  const goToProfile = (userId) => { 
    setTargetProfileId(userId); 
    setView('profile'); 
  };
  
  const goHome = () => { 
    setTargetProfileId(null); 
    setView('dashboard'); 
  };

  if (loading) return <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">Loading...</div>;

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

  const isOnboarding = !username;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8">
      {/* HEADER */}
      <header className="max-w-[1600px] mx-auto mb-8 flex flex-col gap-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="cursor-pointer" onClick={goHome}>
            <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">TWCo WxChallenge</h1>
          </div>
          
          <div className="w-full md:w-96">
            <UserSearch onSelectUser={goToProfile} />
          </div>

          <div className="flex items-center gap-2 bg-slate-900 p-1 rounded-lg border border-slate-800">
             {!isOnboarding && (
               <>
                 <button onClick={goHome} className={`px-4 py-1.5 rounded-md text-sm font-bold ${view === 'dashboard' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}>Dashboard</button>
                 <button onClick={() => goToProfile(session.user.id)} className={`px-4 py-1.5 rounded-md text-sm font-bold ${view === 'profile' && targetProfileId === session.user.id ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}>My Profile</button>
                 <div className="w-px h-4 bg-slate-700 mx-1"></div>
               </>
             )}
             <button onClick={() => supabase.auth.signOut()} className="px-3 text-xs text-red-400 hover:text-red-300 font-mono">EXIT</button>
          </div>
        </div>
        
        <div className="flex justify-center border-b border-slate-900 pb-8">
           <CountdownClock />
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="max-w-[1600px] mx-auto">
        {isOnboarding ? (
           <div className="max-w-xl mx-auto">
             <div className="bg-yellow-500/10 border border-yellow-500/50 text-yellow-200 p-4 rounded mb-4 text-center">⚠️ <strong>Action Required:</strong> Create a username to enter.</div>
             <Profile session={session} viewedId={session.user.id} />
           </div>
        ) : (
          view === 'dashboard' ? (
            // --- 3 COLUMN GRID LAYOUT ---
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
              
              {/* LEFT: CURRENT WEATHER */}
              <div className="lg:col-span-1 h-full">
                <CurrentWeather />
              </div>

              {/* CENTER: PREDICTION FORM */}
              <div className="lg:col-span-1">
                {/* 🛑 FIX 1: Pass 'session' not 'userId' */}
                <PredictionForm session={session} />
              </div>

              {/* RIGHT: LEADERBOARD */}
              <div className="lg:col-span-1">
                <Leaderboard />
              </div>

            </div>
          ) : (
            // 🛑 FIX 2: Pass 'viewedId' instead of 'targetUserId'
            <Profile session={session} viewedId={targetProfileId} />
          )
        )}
      </main>
    </div>
  );
}

export default App;
