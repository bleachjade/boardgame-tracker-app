import { useState, useEffect } from "react";
import Image from "next/image";
import { collection, query, where, onSnapshot, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Info, X, Loader2, Layers, History, Calendar, Trophy } from "lucide-react";

export function GameDetailsModal({ game, onClose }: { game: any; onClose: () => void }) {
  const [liveData, setLiveData] = useState<any>(game);
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<any[]>([]);

  // 1. Fetch live BGG details
  useEffect(() => {
    async function fetchFullDetails() {
      try {
        const res = await fetch(`/api/bgg?ids=${game.bggId}`);
        const data = await res.json();
        if (data && data.length > 0) setLiveData({ ...game, ...data[0] });
      } catch (err) {
        console.error("Failed to load live game details", err);
      } finally {
        setLoading(false);
      }
    }
    fetchFullDetails();
  }, [game]);

  // 2. Fetch Match History from Firestore
  useEffect(() => {
    const q = query(collection(db, "gamePlays"), where("bggId", "==", game.bggId), orderBy("playedAt", "desc"));
    const unsub = onSnapshot(q, (snap) => setHistory(snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))));
    return () => unsub();
  }, [game.bggId]);

  const timeDisplay = liveData.minPlayTime !== liveData.maxPlayTime ? `${liveData.minPlayTime}–${liveData.maxPlayTime}` : liveData.playTime;

  // Format the name for the BGG URL slug (e.g. "Twilight Imperium" -> "twilight-imperium")
  const slugifiedName = liveData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');

  const createMarkup = (html: string) => {
    if (!html) return { __html: "No description provided." };
    const clean = html
      .replace(/&#10;/g, '<br/>')
      .replace(/&mdash;/g, '—')
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, '&')
      .replace(/&rsquo;/g, "'");
    return { __html: clean };
  };

  return (
    <div className="fixed inset-0 bg-slate-900/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in zoom-in duration-300">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="p-4 border-b flex justify-between items-center bg-slate-50 shrink-0">
          <h2 className="font-black text-slate-900 text-xl flex items-center gap-2"><Info className="text-indigo-600" /> Game Details</h2>
          <button onClick={onClose}><X size={24} className="text-slate-500 hover:text-slate-900" /></button>
        </div>
        
        <div className="p-6 overflow-y-auto flex-1 space-y-8">
          
          {/* Top Section: Image & Title */}
          <div className="flex flex-col md:flex-row gap-6">
            <div className="w-full md:w-56 h-56 md:h-auto rounded-xl overflow-hidden shadow-md shrink-0 relative bg-slate-100 border border-slate-200">
              {liveData.image ? <Image src={liveData.image} alt={liveData.name} fill className="object-cover" unoptimized /> : <div className="w-full h-full flex items-center justify-center text-slate-400 font-bold">No Image</div>}
            </div>
            
            <div className="flex-1 flex flex-col justify-center space-y-4">
              <div>
                <h3 className="text-3xl font-black text-slate-900 mb-1 leading-tight">{liveData.name} <span className="text-slate-400 font-medium text-2xl">({liveData.year || 'N/A'})</span></h3>
                
                {!loading && liveData.mechanics && liveData.mechanics.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {liveData.mechanics.map((m: string) => <span key={m} className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs font-bold border border-slate-200">{m}</span>)}
                  </div>
                )}
              </div>

              {/* Dark Metrics Bar - Removed Age and Weight, reduced to 2 columns */}
              <div className="bg-[#0f1115] text-white rounded-xl p-4 md:p-5 grid grid-cols-2 divide-x divide-slate-800 border border-slate-800 shadow-inner w-full">
                
                {/* Players */}
                <div className="flex flex-col justify-center pr-4">
                  <span className="text-lg md:text-xl font-black">{liveData.minPlayers}–{liveData.maxPlayers} Players</span>
                  <span className="text-xs text-slate-400 font-medium border-b border-dotted border-slate-600 inline-block w-fit pb-[2px] mt-1">
                    Community: {liveData.minPlayers}–{liveData.maxPlayers} — Best: {loading ? '...' : liveData.bestPlayers || '?'}
                  </span>
                </div>
                
                {/* Time */}
                <div className="flex flex-col justify-center pl-4 md:px-4">
                  <span className="text-lg md:text-xl font-black">{timeDisplay} Min</span>
                  <span className="text-xs text-slate-400 font-medium mt-1">Playing Time</span>
                </div>

              </div>

              {/* BGG SLEEVE LINK */}
              <div className="flex items-center gap-3">
                 <a 
                   href={`https://boardgamegeek.com/boardgame/${game.bggId}/${slugifiedName}/sleeves`} 
                   target="_blank" 
                   rel="noopener noreferrer"
                   className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-sm rounded-lg border border-indigo-200 transition"
                 >
                   <Layers size={16} /> View BGG Sleeve Guide
                 </a>
              </div>

            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
            {/* Left Column: Description */}
            <div>
              <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-3">Publisher Description</h4>
              {loading ? (
                <div className="flex items-center gap-2 text-indigo-600 font-bold py-4">
                  <Loader2 size={20} className="animate-spin" /> Fetching latest BGG data...
                </div>
              ) : (
                <div className="text-sm text-slate-700 leading-relaxed prose prose-sm max-w-none" dangerouslySetInnerHTML={createMarkup(liveData.description)} />
              )}
            </div>

            {/* Right Column: Match History */}
            <div>
              <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                <History size={16} /> Match History ({history.length})
              </h4>
              <div className="space-y-3">
                {history.length === 0 ? (
                  <div className="text-center py-6 bg-slate-50 rounded-xl border border-slate-100 text-slate-500 font-medium text-sm">
                    No recorded matches yet. Log a score to see history here!
                  </div>
                ) : (
                  history.map((record) => {
                    const maxScore = Math.max(...record.players.map((p: any) => Number(p.score || 0)));
                    const sortedPlayers = [...record.players].sort((a: any, b: any) => Number(b.score || 0) - Number(a.score || 0));
                    return (
                      <div key={record.id} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-3">
                        <div className="flex justify-between items-center text-xs text-slate-500 font-bold border-b pb-2 border-slate-100">
                          <span className="flex items-center gap-1"><Calendar size={14} /> {record.playedAt?.toDate() ? new Date(record.playedAt.toDate()).toLocaleDateString() : "Just now"}</span>
                          <span>Logged by {record.loggedBy || "Friend"}</span>
                        </div>
                        <div className="space-y-1.5">
                          {sortedPlayers.map((p: any, pIdx: number) => (
                            <div key={pIdx} className="flex justify-between items-center text-sm font-semibold">
                              <span className="text-slate-700 flex items-center gap-1.5">{Number(p.score) === maxScore && maxScore > 0 && <Trophy className="text-amber-500 shrink-0" size={14} />} {p.name}</span>
                              <div className="text-right">
                                <span className="font-black text-slate-900">{p.score} pts</span>
                                {p.rawExpression && p.rawExpression !== String(p.score) && <span className="block text-[10px] text-slate-400 font-normal">({p.rawExpression})</span>}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}