import { useState, useEffect } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuthGroup } from "@/components/AuthGroupProvider";
import { Trophy, BarChart3, Loader2, PiggyBank, ArrowUpRight, ArrowDownRight, TrendingUp } from "lucide-react";

export function AnalyticsTab() {
  const { user } = useAuthGroup();
  const [plays, setPlays] = useState<any[]>([]);
  const [libraryGames, setLibraryGames] = useState<any[]>([]);
  const [loadingPlays, setLoadingPlays] = useState(true);
  const [loadingLibrary, setLoadingLibrary] = useState(true);

  // 1. Fetch all logged play sessions for match calculations
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "gamePlays"), where("userId", "==", user.uid));
    const unsub = onSnapshot(q, (snap) => {
      setPlays(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoadingPlays(false);
    });
    return () => unsub();
  }, [user]);

  // 2. Fetch all library entries to aggregate price records
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "userGames"), where("userId", "==", user.uid));
    const unsub = onSnapshot(q, (snap) => {
      setLibraryGames(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoadingLibrary(false);
    });
    return () => unsub();
  }, [user]);

  if (loadingPlays || loadingLibrary) {
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="animate-spin text-indigo-600 dark:text-indigo-400" size={32}/>
      </div>
    );
  }

  // --- CORE LOGIC: COMBINED COMPETITIVE STANDINGS ---
  const playerWins: Record<string, number> = {};
  const gameHighScores: Record<string, { player: string; score: number }> = {};
  const gamePlayCounts: Record<string, number> = {}; // Tracks plays per BGG ID

  plays.forEach(play => {
    if (!play.players || play.players.length === 0) return;
    
    // Tally play counts per game for financial calculations
    if (play.bggId) {
      gamePlayCounts[play.bggId] = (gamePlayCounts[play.bggId] || 0) + 1;
    }

    const maxScore = Math.max(...play.players.map((p: any) => Number(p.score || 0)));
    const winners = play.players.filter((p: any) => Number(p.score || 0) === maxScore);
    
    winners.forEach((w: any) => { 
      playerWins[w.name] = (playerWins[w.name] || 0) + 1; 
    });

    if (play.gameName && maxScore > 0 && !play.isCoop) {
      if (!gameHighScores[play.gameName] || maxScore > gameHighScores[play.gameName].score) {
        gameHighScores[play.gameName] = { player: winners.map((w:any) => w.name).join(", "), score: maxScore };
      }
    }
  });

  const sortedWinners = Object.entries(playerWins).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const sortedRecords = Object.entries(gameHighScores).sort((a, b) => b[1].score - a[1].score).slice(0, 5);

  // --- NEW ECONOMIC LOGIC: FINANCIAL ROI CALCULATIONS ---
  let totalInvestment = 0;
  let totalPlaysRecordedForOwnedGames = 0;

  // Process ROI arrays for sorting
  const itemsWithCost = libraryGames.filter(g => typeof g.pricePaid === "number" && g.pricePaid > 0).map(game => {
    totalInvestment += game.pricePaid;
    const playCount = gamePlayCounts[game.bggId] || 0;
    totalPlaysRecordedForOwnedGames += playCount;
    const cpp = game.pricePaid / Math.max(playCount, 1);

    return {
      name: game.name,
      totalCost: game.pricePaid,
      playCount,
      costPerPlay: cpp
    };
  });

  // Calculate globally aggregated variables
  const globalAverageCpp = totalPlaysRecordedForOwnedGames > 0 
    ? (totalInvestment / totalPlaysRecordedForOwnedGames).toFixed(2) 
    : "0.00";

  // Best Value: lowest cost per play
  const bestRoiChampions = [...itemsWithCost]
    .sort((a, b) => a.costPerPlay - b.costPerPlay)
    .slice(0, 3);

  // Worst Value: highest cost per play
  const worstRoiSitters = [...itemsWithCost]
    .sort((a, b) => b.costPerPlay - a.costPerPlay)
    .slice(0, 3);

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* 1. FINANCIAL METRIC PORTFOLIO HEADER TICKERS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        
        {/* Total Library Cost */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex items-center gap-4">
          <div className="p-3 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-xl shrink-0">
            <PiggyBank size={24} />
          </div>
          <div>
            <span className="text-xs font-black text-slate-400 uppercase tracking-wider block">Library Capitalization</span>
            <span className="text-2xl font-black text-slate-900 dark:text-white">฿{totalInvestment.toLocaleString()}</span>
          </div>
        </div>

        {/* Global True Cost Per Play */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex items-center gap-4">
          <div className="p-3 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl shrink-0">
            <TrendingUp size={24} />
          </div>
          <div>
            <span className="text-xs font-black text-slate-400 uppercase tracking-wider block">System Net Value / Play</span>
            <span className="text-2xl font-black text-slate-900 dark:text-white">฿{globalAverageCpp}</span>
          </div>
        </div>

        {/* Total Tracked Logs */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex items-center gap-4">
          <div className="p-3 bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-xl shrink-0">
            <BarChart3 size={24} />
          </div>
          <div>
            <span className="text-xs font-black text-slate-400 uppercase tracking-wider block">Aggregated Match Plays</span>
            <span className="text-2xl font-black text-slate-900 dark:text-white">{plays.length} sessions</span>
          </div>
        </div>

      </div>

      {/* 2. ROI PERFORMANCE BREAKDOWN DASHBOARDS */}
      {itemsWithCost.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Best Value (ROI Champions) */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
            <h3 className="text-sm font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-1.5">
              <ArrowDownRight className="text-emerald-500" size={16} /> ROI Champions (Best Value)
            </h3>
            <div className="space-y-3">
              {bestRoiChampions.map((item) => (
                <div key={item.name} className="p-3 bg-emerald-50/50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/30 rounded-xl flex justify-between items-center">
                  <div className="min-w-0 pr-2">
                    <span className="font-bold text-slate-800 dark:text-slate-200 block truncate text-sm">{item.name}</span>
                    <span className="text-xs text-slate-400 font-medium">{item.playCount} plays registered</span>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-black text-emerald-600 dark:text-emerald-400 text-sm block">฿{item.costPerPlay.toFixed(2)}</span>
                    <span className="text-[10px] text-slate-400 font-medium block">per play</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Worst Value (Shelf Sitters) */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
            <h3 className="text-sm font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-1.5">
              <ArrowUpRight className="text-rose-500" size={16} /> Shelf Sitters (Needs Play)
            </h3>
            <div className="space-y-3">
              {worstRoiSitters.map((item) => (
                <div key={item.name} className="p-3 bg-rose-50/50 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-900/30 rounded-xl flex justify-between items-center">
                  <div className="min-w-0 pr-2">
                    <span className="font-bold text-slate-800 dark:text-slate-200 block truncate text-sm">{item.name}</span>
                    <span className="text-xs text-slate-400 font-medium">{item.playCount === 0 ? "Never played" : `${item.playCount} plays registered`}</span>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-black text-rose-600 dark:text-rose-400 text-sm block">฿{item.costPerPlay.toFixed(2)}</span>
                    <span className="text-[10px] text-slate-400 font-medium block">per play</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* 3. STANDARD COMPETITIVE LEADERBOARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Wins Leaderboard */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
          <h2 className="text-sm font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2 mb-4">
            <Trophy className="text-amber-500" size={16} /> Hall of Fame (Wins)
          </h2>
          <div className="space-y-3">
            {sortedWinners.map(([name, wins], idx) => (
              <div key={name} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 rounded-xl">
                <div className="flex items-center gap-3">
                  <span className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-sm ${idx === 0 ? "bg-amber-100 text-amber-600" : idx === 1 ? "bg-slate-200 text-slate-600" : idx === 2 ? "bg-orange-100 text-orange-700" : "bg-white dark:bg-slate-700 text-slate-400 dark:text-slate-300"}`}>#{idx + 1}</span>
                  <span className="font-bold text-slate-900 dark:text-white">{name}</span>
                </div>
                <span className="font-black text-indigo-600 dark:text-indigo-400">{wins} Wins</span>
              </div>
            ))}
          </div>
        </div>

        {/* Highest Score Record Lists */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
          <h2 className="text-sm font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2 mb-4">
            <BarChart3 className="text-emerald-500" size={16} /> High Scores
          </h2>
          <div className="space-y-3">
            {sortedRecords.map(([gameName, record]) => (
              <div key={gameName} className="flex flex-col justify-between p-3 bg-slate-50 dark:bg-slate-900 rounded-xl">
                <span className="font-bold text-slate-700 dark:text-slate-300 text-sm mb-1">{gameName}</span>
                <div className="flex justify-between items-center text-xs font-semibold">
                  <span className="text-slate-500 dark:text-slate-400">Held by {record.player}</span>
                  <span className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-2 py-1 rounded border border-emerald-200 dark:border-emerald-800">{record.score} pts</span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
}