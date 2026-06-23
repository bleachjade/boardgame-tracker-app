import { useState, useEffect } from "react";
import Image from "next/image";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuthGroup } from "@/components/AuthGroupProvider";
import { Sparkles, Loader2, Plus } from "lucide-react";
import toast from "react-hot-toast";

export function RecommendationsTab({ userGames }: { userGames: any[] }) {
  const { user, userNickname } = useAuthGroup();
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingId, setAddingId] = useState<string | null>(null);

  const [avgPlayers, setAvgPlayers] = useState(4);
  const [avgTime, setAvgTime] = useState(60);

  useEffect(() => {
    async function buildRecommendations() {
      setLoading(true);
      try {
        const times = userGames.map(g => parseInt(g.playTime)).filter(n => !isNaN(n) && n > 0);
        const maxPs = userGames.map(g => parseInt(g.maxPlayers)).filter(n => !isNaN(n) && n > 0);

        const myAvgTime = times.length ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : 60;
        const myAvgMax = maxPs.length ? Math.round(maxPs.reduce((a, b) => a + b, 0) / maxPs.length) : 4;

        setAvgTime(myAvgTime);
        setAvgPlayers(myAvgMax);

        const res = await fetch("/api/bgg-hot");
        const xmlText = await res.text();
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, "text/xml");
        const items = Array.from(xmlDoc.getElementsByTagName("item"));
        const hotIds = items.slice(0, 20).map(item => item.getAttribute("id")).filter(Boolean);

        if (hotIds.length === 0) throw new Error("BoardGameGeek's trending list is temporarily unavailable. Please try again later.");

        const enrichRes = await fetch(`/api/bgg?ids=${hotIds.join(',')}`);
        const hotGames = await enrichRes.json();
        if (!Array.isArray(hotGames)) throw new Error(hotGames.error || "Failed to load trending games.");

        const ownedIds = new Set(userGames.map(g => g.bggId));
        const scoredGames = hotGames
          .filter((g: any) => !ownedIds.has(g.bggId))
          .map((g: any) => {
            const time = parseInt(g.playTime) || 60;
            const maxP = parseInt(g.maxPlayers) || 4;
            const penalty = Math.abs(time - myAvgTime) + (Math.abs(maxP - myAvgMax) * 20);
            return { ...g, penalty };
          });

        scoredGames.sort((a: any, b: any) => a.penalty - b.penalty);
        setRecommendations(scoredGames.slice(0, 12));
      } catch (err) {
        console.error("Failed to build recommendations", err);
      } finally {
        setLoading(false);
      }
    }
    buildRecommendations();
  }, [userGames]);

  const handleAddRec = async (game: any) => {
    if (!user) return;
    setAddingId(game.bggId);
    try {
      await addDoc(collection(db, "userGames"), {
        userId: user.uid, ownerNickname: userNickname, bggId: game.bggId, name: game.name,
        image: game.image, year: game.year, minPlayers: game.minPlayers, maxPlayers: game.maxPlayers,
        playTime: game.playTime, groupIds: [], addedAt: serverTimestamp()
      });
      toast.success(`${game.name} added to your library!`);
      setRecommendations(prev => prev.filter(g => g.bggId !== game.bggId));
    } catch (err) { toast.error("Failed to add game."); } finally { setAddingId(null); }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-slate-500 space-y-4">
        <Loader2 size={32} className="animate-spin text-indigo-600" />
        <p className="font-bold">Analyzing your library and checking global trends...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-indigo-600 to-blue-500 rounded-2xl p-6 md:p-8 text-white shadow-lg relative overflow-hidden">
        <Sparkles size={120} className="absolute -right-6 -top-6 text-white/10" />
        <h2 className="text-2xl font-black mb-2 relative z-10">Smart Discover</h2>
        <p className="text-indigo-100 font-medium max-w-xl relative z-10">
          We analyzed your library. Because you tend to play games that accommodate around <strong className="text-white">{avgPlayers} players</strong> and last <strong className="text-white">~{avgTime} minutes</strong>, here are the current trending hot games on BGG that perfectly match your style.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 md:gap-5">
        {recommendations.map((game, index) => (
          <div key={game.bggId} className="bg-white rounded-2xl md:shadow-sm overflow-hidden border border-slate-200 hover:shadow-md transition-shadow flex flex-col group">
            <div className="h-48 sm:h-56 w-full overflow-hidden bg-slate-100 border-b border-slate-200 shrink-0 relative">
              {game.image ? <Image src={game.image} alt={game.name} fill sizes="(max-width: 768px) 50vw, 33vw" className="object-cover group-hover:scale-105 transition-transform duration-300" unoptimized priority={index < 8} /> : <div className="w-full h-full flex items-center justify-center text-slate-400 font-bold">No Image</div>}
            </div>
            <div className="p-3 sm:p-5 flex-1 flex flex-col justify-between">
              <div>
                <h3 className="font-bold text-lg sm:text-xl text-slate-900 leading-tight mb-1 line-clamp-2 min-h-[45px]">{game.name}</h3>
                <p className="text-sm font-semibold text-slate-500 mb-4">{game.year || 'Unknown Year'}</p>
                <div className="flex justify-between text-xs font-bold text-slate-700 bg-slate-100 p-2.5 rounded-lg mb-4">
                  <span>{game.minPlayers || '?'}-{game.maxPlayers || '?'} Players</span>
                  <span>{game.playTime || '?'} Mins</span>
                </div>
              </div>
              <button onClick={() => handleAddRec(game)} disabled={addingId === game.bggId} className="w-full flex items-center justify-center gap-2 py-2.5 bg-indigo-50 text-indigo-700 font-bold rounded-xl text-sm border border-indigo-100 hover:bg-indigo-100 transition shadow-sm disabled:opacity-50">
                {addingId === game.bggId ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} Add to Library
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}