import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import CountdownClock from './components/CountdownClock';
import PredictionForm from './components/PredictionForm';
import Leaderboard from './components/Leaderboard';

function App() {
  const [session, setSession] = useState(null);

  useEffect(() => {
    // 1. Check active session on load
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    // 2. Listen for login/logout events
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // 🛑 IF NOT LOGGED IN: SHOW LOGIN SCREEN
  if (!session) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 p-8 rounded-xl shadow-2xl">
          <h1 className="text-3xl font-black text-center text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400 mb-6">
            TWCo WxChallenge
          </h1>
          <Auth 
            supabaseClient={supabase} 
            appearance={{ theme: ThemeSupa, variables: { default: { colors: { brand: '#10b981', brandAccent: '#059669' } } } }}
            theme="dark"
            providers={[]} // We can add 'google' later if you want
          />
        </div>
      </div>
    );
  }

  // ✅ IF LOGGED IN: SHOW DASHBOARD
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8">
      <header className="max-w-6xl mx-auto mb-10 flex flex-col md:flex-row justify-between items-center gap-6">
        <div>
          <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">
            TWCo WxChallenge
          </h1>
          <p className="text-slate-400">KATL • KORD • KDFW Weather Competition</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <CountdownClock />
          <button 
            onClick={() => supabase.auth.signOut()} 
            className="text-xs text-slate-500 hover:text-white underline"
          >
            Sign Out
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          {/* We now pass the REAL User ID to the form! */}
          <PredictionForm userId={session.user.id} />
        </div>
        <div className="lg:col-span-2">
          <Leaderboard />
        </div>
      </main>

      <footer className="mt-20 text-center text-slate-600 text-sm border-t border-slate-900 pt-8">
        8 PM EST Submission Deadline • Real-time METAR Data • Monthly Hall of Fame
      </footer>
    </div>
  );
}

export default App;
