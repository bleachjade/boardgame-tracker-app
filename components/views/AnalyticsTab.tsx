import { useState, useEffect } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuthGroup } from "@/components/AuthGroupProvider";
import { Trophy, BarChart3, Loader2 } from "lucide-react";

export function AnalyticsTab() {
  const { user } = useAuthGroup();
  const [plays, setPlays] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "gamePlays"), where("userId", "==", user.uid));
    const unsub = onSnapshot(q, (snap) => {
      setPlays(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });
    return () => unsub();
  }, [user]);

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-indigo-600" size={32}/></div>;
  if (plays.length === 0) return <div className="text-center p-12 text-slate-500 font-bold">No matches logged yet! Play some games and log their scores to generate leaderboards.</div>;

  const playerWins: Record<string, number> = {};
  const gameHighScores: Record<string, { player: string; score: number }> = {};
  
  plays.forEach(play => {
    if (!play.players || play.players.length === 0) return;
    const maxScore = Math.max(...play.players.map((p: any) => Number(p.score || 0)));
    const winners = play.players.filter((p: any) => Number(p.score || 0) === maxScore);
    winners.forEach((w: any) => { playerWins[w.name] = (playerWins[w.name] || 0) + 1; });
    if (play.gameName && maxScore > 0) {
      if (!gameHighScores[play.gameName] || maxScore > gameHighScores[play.gameName].score) {
        gameHighScores[play.gameName] = { player: winners.map((w:any) => w.name).join(", "), score: maxScore };
      }
    }
  });

  const sortedWinners = Object.entries(playerWins).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const sortedRecords = Object.entries(gameHighScores).sort((a, b) => b[1].score - a[1].score).slice(0, 8);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-xl font-black text-slate-900 flex items-center gap-2 mb-6"><Trophy className="text-amber-500" /> Hall of Fame (Wins)</h2>
          <div className="space-y-3">
            {sortedWinners.map(([name, wins], idx) => (
              <div key={name} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <span className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-sm ${idx === 0 ? "bg-amber-100 text-amber-600" : idx === 1 ? "bg-slate-200 text-slate-600" : idx === 2 ? "bg-orange-100 text-orange-700" : "bg-white text-slate-400"}`}>#{idx + 1}</span>
                  <span className="font-bold text-slate-900">{name}</span>
                </div>
                <span className="font-black text-indigo-600">{wins} Wins</span>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-xl font-black text-slate-900 flex items-center gap-2 mb-6"><BarChart3 className="text-emerald-500" /> High Scores</h2>
          <div className="space-y-3">
            {sortedRecords.map(([gameName, record]) => (
              <div key={gameName} className="flex flex-col justify-between p-3 bg-slate-50 rounded-xl">
                <span className="font-bold text-slate-700 text-sm mb-1">{gameName}</span>
                <div className="flex justify-between items-center text-xs font-semibold">
                  <span className="text-slate-500">Held by {record.player}</span>
                  <span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded border border-emerald-200">{record.score} pts</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}