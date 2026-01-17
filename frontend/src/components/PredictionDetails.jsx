import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

export default function PredictionDetails({ prediction, onClose, session }) {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    fetchComments();
    
    // Subscribe to live comments for this specific prediction
    const sub = supabase.channel(`comments-${prediction.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'comments', filter: `prediction_id=eq.${prediction.id}` }, 
      (payload) => {
         fetchSingleComment(payload.new.id);
      })
      .subscribe();

    return () => supabase.removeChannel(sub);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prediction]);

  const fetchComments = async () => {
    const { data } = await supabase
      .from('comments')
      .select('*, profiles(username, avatar_url)')
      .eq('prediction_id', prediction.id)
      .order('created_at', { ascending: true });
    setComments(data || []);
  };

  const fetchSingleComment = async (id) => {
    const { data } = await supabase.from('comments').select('*, profiles(username, avatar_url)').eq('id', id).single();
    if (data) setComments(prev => [...prev, data]);
  };

  const postComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    setSending(true);

    const { error } = await supabase.from('comments').insert({
      user_id: session.user.id,
      prediction_id: prediction.id,
      text: newComment
    });

    if (!error) setNewComment('');
    setSending(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* HEADER */}
        <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-950 rounded-t-xl">
          <div>
            <h2 className="text-white font-bold text-lg">{prediction.station_id} Forecast</h2>
            <p className="text-slate-500 text-xs">{prediction.date}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-2xl font-bold">&times;</button>
        </div>

        {/* SCORECARD */}
        <div className="p-4 grid grid-cols-4 gap-2 bg-slate-900 border-b border-slate-800 text-center">
            <div>
              <div className="text-[10px] text-slate-500 uppercase font-bold">High</div>
              <div className="text-white font-mono font-bold text-lg">{prediction.prediction.split(' / ')[0]}</div>
            </div>
            <div>
              <div className="text-[10px] text-slate-500 uppercase font-bold">Wind</div>
              <div className="text-white font-mono font-bold text-lg">{prediction.prediction.split(' / ')[1]}</div>
            </div>
            <div className="col-span-2 border-l border-slate-800">
              <div className="text-[10px] text-slate-500 uppercase font-bold">Error Score</div>
              <div className="text-emerald-400 font-mono font-black text-2xl">{prediction.error}</div>
            </div>
        </div>

        {/* CHAT AREA */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-950/50">
          {comments.length === 0 ? (
            <p className="text-slate-600 text-center italic text-sm mt-4">No comments yet. Start the trash talk! 🗑️</p>
          ) : (
            comments.map(c => (
              <div key={c.id} className="flex gap-3">
                <img src={c.profiles?.avatar_url || "https://cdn-icons-png.flaticon.com/512/1144/1144760.png"} alt="av" className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700"/>
                <div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-white font-bold text-xs">{c.profiles?.username || 'Unknown'}</span>
                    <span className="text-slate-600 text-[10px]">{new Date(c.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                  </div>
                  <p className="text-slate-300 text-sm bg-slate-800/80 px-3 py-1.5 rounded-lg rounded-tl-none mt-1 inline-block border border-slate-700">
                    {c.text}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* INPUT */}
        <form onSubmit={postComment} className="p-3 bg-slate-900 border-t border-slate-800 flex gap-2">
          <input 
            value={newComment}
            onChange={e => setNewComment(e.target.value)}
            placeholder="Say something..." 
            className="flex-1 bg-slate-950 border border-slate-700 rounded-full px-4 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
          />
          <button disabled={sending} type="submit" className="bg-blue-600 hover:bg-blue-500 text-white rounded-full w-10 h-10 flex items-center justify-center font-bold transition-colors">
            ➤
          </button>
        </form>

      </div>
    </div>
  );
}
