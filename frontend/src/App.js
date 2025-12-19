import React from 'react';
import CountdownClock from './components/CountdownClock';
import PredictionForm from './components/PredictionForm';
import Leaderboard from './components/Leaderboard';

function App() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8">
      <header className="max-w-6xl mx-auto mb-10 flex flex-col md:flex-row justify-between items-center gap-6">
        <div>
          <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">
            SKYLINE ORACLE
          </h1>
          <p className="text-slate-400">KATL • KORD • KDFW Weather Challenge</p>
        </div>
        <CountdownClock />
      </header>

      <main className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <PredictionForm />
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
