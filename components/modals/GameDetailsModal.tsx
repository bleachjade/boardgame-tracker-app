import { useState, useEffect } from "react";
import Image from "next/image";
import { Info, X, BrainCircuit, Loader2 } from "lucide-react";
import { createMarkup } from "@/lib/utils";

export function GameDetailsModal({ game, onClose }: { game: any; onClose: () => void }) {
  const [liveData, setLiveData] = useState<any>(game);
  const [loading, setLoading] = useState(true);

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

  const weight = parseFloat(liveData.weight || "0").toFixed(2);
  const weightColor = Number(weight) > 3.5 ? "text-red-600 bg-red-100" : Number(weight) > 2.5 ? "text-amber-600 bg-amber-100" : "text-emerald-600 bg-emerald-100";

  return (
    <div className="fixed inset-0 bg-slate-900/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in zoom-in duration-300">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="p-4 border-b flex justify-between items-center bg-slate-50 shrink-0">
          <h2 className="font-black text-slate-900 text-xl flex items-center gap-2"><Info className="text-indigo-600" /> Game Details</h2>
          <button onClick={onClose}><X size={24} className="text-slate-500 hover:text-slate-900" /></button>
        </div>
        
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          <div className="flex flex-col sm:flex-row gap-6">
            <div className="w-full sm:w-48 h-48 sm:h-auto rounded-xl overflow-hidden shadow-md shrink-0 relative bg-slate-100">
              {liveData.image ? <Image src={liveData.image} alt={liveData.name} fill className="object-cover" unoptimized /> : <div className="w-full h-full flex items-center justify-center text-slate-400 font-bold">No Image</div>}
            </div>
            <div className="flex-1">
              <h3 className="text-2xl font-black text-slate-900 mb-1">{liveData.name} <span className="text-slate-400 font-medium text-lg">({liveData.year || 'N/A'})</span></h3>
              <div className="flex flex-wrap gap-2 mb-4">
                <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-bold">{liveData.minPlayers}-{liveData.maxPlayers} Players</span>
                <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-bold">{liveData.playTime} Mins</span>
                {loading ? <span className="px-3 py-1 rounded-full text-xs font-black flex items-center gap-1 text-slate-400 bg-slate-100 animate-pulse">Loading Details...</span> : weight !== "0.00" && !isNaN(Number(weight)) ? <span className={`px-3 py-1 rounded-full text-xs font-black flex items-center gap-1 ${weightColor}`}><BrainCircuit size={14}/> Weight: {weight} / 5</span> : null}
              </div>
              {!loading && liveData.mechanics && liveData.mechanics.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Mechanics</h4>
                  <div className="flex flex-wrap gap-1.5">{liveData.mechanics.map((m: string) => <span key={m} className="px-2 py-1 bg-indigo-50 text-indigo-700 rounded text-xs font-semibold border border-indigo-100">{m}</span>)}</div>
                </div>
              )}
            </div>
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900 mb-2">Description</h4>
            {loading ? <div className="flex items-center gap-2 text-indigo-600 font-bold py-4"><Loader2 size={20} className="animate-spin" /> Pulling latest info from BGG...</div> : <div className="text-sm text-slate-600 leading-relaxed prose prose-sm" dangerouslySetInnerHTML={createMarkup(liveData.description)} />}
          </div>
        </div>
      </div>
    </div>
  );
}