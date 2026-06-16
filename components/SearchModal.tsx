"use client";

import { useState } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, addDoc, serverTimestamp } from "firebase/firestore";
import { useAuthGroup } from "./AuthGroupProvider";
import { Search, Loader2, Plus, X } from "lucide-react";
import toast from "react-hot-toast";

export function SearchModal({ onClose }: { onClose: () => void }) {
  // UPDATED: Destructure userNickname
  const { user, userNickname } = useAuthGroup();
  const [queryText, setQueryText] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!queryText.trim()) return;
    
    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(queryText)}`);
      const searchData = await res.json();
      
      if (!searchData || searchData.length === 0) {
        setResults([]);
        return;
      }
      
      const ids = searchData.slice(0, 12).map((item: any) => item.id).join(',');
      const bggRes = await fetch(`/api/bgg?ids=${ids}`);
      const enrichedData = await bggRes.json();
      
      setResults(enrichedData);
    } catch (err) {
      toast.error("Error searching for games.");
    } finally {
      setLoading(false);
    }
  };

  const handleAddGame = async (game: any) => {
    if (!user) return;

    const q = query(
      collection(db, "userGames"),
      where("userId", "==", user.uid),
      where("bggId", "==", game.bggId)
    );
    const existing = await getDocs(q);
    
    if (!existing.empty) {
      toast.error(`${game.name} is already in your library!`);
      return;
    }

    try {
      await addDoc(collection(db, "userGames"), {
        userId: user.uid,
        ownerNickname: userNickname, // NEW: Stamp the game with the user's nickname!
        bggId: game.bggId,
        name: game.name,
        image: game.image,
        year: game.year,
        minPlayers: game.minPlayers,
        maxPlayers: game.maxPlayers,
        playTime: game.playTime,
        groupIds: [],
        addedAt: serverTimestamp()
      });

      toast.success(`${game.name} added to your library!`);
      onClose();
    } catch (err) {
      toast.error("Failed to add game.");
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col border border-slate-200">
        <div className="p-5 border-b border-slate-200 flex justify-between items-center bg-slate-50 rounded-t-xl">
          <h2 className="text-xl font-bold text-slate-900">Add to Library</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-900 transition-colors">
            <X size={24} />
          </button>
        </div>
        
        <form onSubmit={handleSearch} className="p-4 border-b border-slate-200 flex flex-col md:flex-row gap-3 bg-white">
          <input 
            type="text" 
            placeholder="Search for a game..." 
            className="flex-1 border border-slate-300 p-3 rounded-lg outline-none focus:ring-2 focus:ring-blue-600 text-slate-900 placeholder-slate-400 font-medium"
            value={queryText}
            onChange={(e) => setQueryText(e.target.value)}
          />
          <button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-6 py-2 rounded-lg flex items-center gap-2 font-semibold transition-colors">
            {loading ? <Loader2 className="animate-spin" size={20}/> : <Search size={20}/>}
            Search
          </button>
        </form>

        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">
          {results.length === 0 && !loading && (
             <div className="text-center text-slate-500 py-8 font-medium">Search for a game to add it to your collection.</div>
          )}
          {results.map((game) => (
            <div key={game.bggId} className="flex gap-4 p-4 bg-white border border-slate-200 rounded-lg items-center shadow-sm hover:shadow transition-shadow">
              {game.image ? (
                <img src={game.image} alt={game.name} className="w-16 h-16 object-cover rounded shadow-sm border border-slate-100" />
              ) : (
                <div className="w-16 h-16 bg-slate-200 rounded flex items-center justify-center text-slate-400 font-bold text-xs text-center border border-slate-300">No Image</div>
              )}
              <div className="flex-1">
                <h3 className="font-bold text-lg text-slate-900">{game.name} <span className="text-slate-500 font-normal text-sm">({game.year || 'N/A'})</span></h3>
                <p className="text-sm text-slate-600 font-medium">{game.minPlayers || '?'}-{game.maxPlayers || '?'} Players • {game.playTime || '?'} Mins</p>
              </div>
              <button 
                onClick={() => handleAddGame(game)}
                className="bg-slate-100 hover:bg-blue-50 border border-slate-200 hover:border-blue-200 p-3 rounded-full transition-colors group"
                title="Add Game"
              >
                <Plus className="text-slate-600 group-hover:text-blue-600" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}