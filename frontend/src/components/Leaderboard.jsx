import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

const calcWindPoints = (p, o) => {
  const diff = Math.abs(p - o) % 360;
  return diff > 180 ? 360 - diff : diff;
};

export default function Leaderboard() {
  const [scores, setScores] = useState([]);

  useEffect(() => {
    // Realtime listener for live METAR updates
    const sub = supabase.channel('live-weather')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'actual_weather' }, 
      payload => {
        // Recalculate scores logic here
        console.log("Weather updated!", payload.new);
      }).subscribe();

    return () => supabase.removeChannel(sub);
  }, []);

  return (
    <div className="bg-slate-900 text-white p-6 rounded-xl shadow-2xl">
      <h2 className="text-2xl font-bold mb-4">Live Leaderboard</h2>
      {/* Table Mapping Here */}
    </div>
  );
}
