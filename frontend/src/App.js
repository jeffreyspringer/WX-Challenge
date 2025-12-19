import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import CountdownClock from './components/CountdownClock';
import PredictionForm from './components/PredictionForm';
import Leaderboard from './components/Leaderboard';
import Profile from './components/Profile';

function App() {
  const [session, setSession] = useState(null);
  const [view, setView] = useState('dashboard');
  const [username, setUsername] = useState(null); // Track if they have a name
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

  // Check if user has a valid username
  const checkProfile = async (userId) => {
    const { data } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', userId)
      .single();
    
    // If no username (or it's the default email prefix), force profile view
    if (data && data.username && data.username.length > 0) {
      setUsername(data.username);
    } else {
      setUsername(null);
      setView('profile'); // FORCE THEM TO PROFILE
    }
    setLoading(false);
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

  // IF NO USERNAME, HIDE NAVIGATION
  const isOnboarding = !username; 

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8">
      <header className="max-w-6xl mx-auto mb-10 flex flex-col md:flex-row justify-between items-center gap-6">
        <div>
          <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">
            TWCo WxChallenge
          </h1>
          <p className="text-slate-400">KATL • KORD • KDFW Weather Competition</p>
        </div>
        
        <div className="flex flex-col md:items-end gap-3">
           <CountdownClock />
           
           {!isOnboarding && ( // HIDE NAV IF ONBOARDING
             <div className="flex items-center gap-2 bg-slate-900 p-1 rounded-lg border border-slate-800">
                <button onClick={() => setView('dashboard')} className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${view === 'dashboard' ? 'bg-slate-700 text-white shadow' : 'text-slate-400 hover:text-white'}`}>Dashboard</button>
                <button onClick={() => setView('profile')} className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${view === 'profile' ? 'bg-slate-700 text-white shadow' : 'text-slate-400 hover:text-white'}`}>My Profile</button>
                <div className="w-px h-4 bg-slate-700 mx-1"></div>
                <button onClick={() => supabase.auth.signOut()} className="px-3 text-xs text-red-400 hover:text-red-300 font-mono tracking-wide">EXIT</button>
             </div>
           )}
        </div>
      </header>

      <main className="max-w-6xl mx-auto">
        {isOnboarding ? (
           // FORCE PROFILE VIEW
           <div className="max-w-xl mx-auto">
             <div className="bg-yellow-500/10 border border-yellow-500/50 text-yellow-200 p-4 rounded mb-4 text-center">
                <strong>Action Required:</strong> You must create a unique username to enter.
             </div>
             <Profile session={session} onProfileUpdate={() => checkProfile(session.user.id)} />
           </div>
        ) : (
          view === 'dashboard' ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-1"><PredictionForm userId={session.user.id} /></div>
              <div className="lg:col-span-2"><Leaderboard /></div>
            </div>
          ) : (
            <Profile session={session} />
          )
        )}
      </main>
    </div>
  );
}

export default App;
