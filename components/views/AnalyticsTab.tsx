"use client";

import { useState, useEffect } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuthGroup } from "@/components/AuthGroupProvider";
import { Trophy, BarChart3, Loader2, PiggyBank, ArrowUpRight, ArrowDownRight, TrendingUp, Wallet } from "lucide-react";
import { useTranslation } from "react-i18next";

type AnalyticsPlay = {
  id: string;
  bggId?: string;
  players?: { name?: string; score?: number | string }[];
  playedAt?: { toMillis?: () => number; seconds?: number };
};

type AnalyticsGame = {
  id: string;
  name: string;
  bggId?: string;
  image?: string;
  pricePaid?: number;
  weight?: string;
  addedAt?: { toMillis?: () => number; seconds?: number };
};

export function AnalyticsTab() {
  const { user, userProfile } = useAuthGroup();
  const { t } = useTranslation();

  const [plays, setPlays] = useState<AnalyticsPlay[]>([]);
  const [libraryGames, setLibraryGames] = useState<AnalyticsGame[]>([]);
  const [loadingPlays, setLoadingPlays] = useState(true);
  const [loadingLibrary, setLoadingLibrary] = useState(true);

  useEffect(() => {
    if (!user) return;

    const targetUids = [user.uid];
    if (userProfile?.isCouple && userProfile.partnerId) targetUids.push(userProfile.partnerId);

    const q = query(collection(db, "gamePlays"), where("userId", "in", targetUids));
    const unsub = onSnapshot(q, (snap) => {
      setPlays(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() } as AnalyticsPlay)));
      setLoadingPlays(false);
    }, () => setLoadingPlays(false));
    return () => unsub();
  }, [user, userProfile]);

  useEffect(() => {
    if (!user) return;

    const targetUids = [user.uid];
    if (userProfile?.isCouple && userProfile.partnerId) targetUids.push(userProfile.partnerId);

    const q = query(collection(db, "userGames"), where("userId", "in", targetUids));
    const unsub = onSnapshot(q, (snap) => {
      setLibraryGames(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() } as AnalyticsGame)));
      setLoadingLibrary(false);
    }, () => setLoadingLibrary(false));
    return () => unsub();
  }, [user, userProfile]);

  if (loadingPlays || loadingLibrary) {
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="animate-spin text-indigo-600 dark:text-indigo-400" size={32} />
      </div>
    );
  }

  const playerWins: Record<string, number> = {};
  const gamePlayCounts: Record<string, number> = {};
  const playedGameIds = new Set<string>();

  plays.forEach((play) => {
    if (!play.players || play.players.length === 0) return;
    if (play.bggId) {
      gamePlayCounts[play.bggId] = (gamePlayCounts[play.bggId] || 0) + 1;
      playedGameIds.add(String(play.bggId));
    }
    const maxScore = Math.max(...play.players.map((p) => Number(p.score || 0)));
    const winners = play.players.filter((p) => Number(p.score || 0) === maxScore);
    winners.forEach((w) => {
      if (w.name) playerWins[w.name] = (playerWins[w.name] || 0) + 1;
    });
  });

  const sortedWinners = Object.entries(playerWins).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const itemsWithCost = libraryGames.filter((g): g is typeof g & { pricePaid: number } => typeof g.pricePaid === "number" && g.pricePaid > 0).map((game) => {
    const playCount = gamePlayCounts[game.bggId ?? ""] || 0;
    return { name: game.name, totalCost: game.pricePaid, playCount, costPerPlay: game.pricePaid / Math.max(playCount, 1) };
  });

  const totalInvestment = libraryGames.reduce((acc, curr) => acc + (Number(curr.pricePaid) || 0), 0);
  const globalAverageCpp = plays.length > 0 ? (totalInvestment / plays.length).toFixed(2) : "0.00";
  const bestRoiChampions = [...itemsWithCost].sort((a, b) => a.costPerPlay - b.costPerPlay).slice(0, 3);
  const worstRoiSitters = [...itemsWithCost].sort((a, b) => b.costPerPlay - a.costPerPlay).slice(0, 3);

  const now = new Date();
  const monthlyPlays = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
    return {
      key: `${date.getFullYear()}-${date.getMonth()}`,
      label: date.toLocaleString(undefined, { month: "short" }),
      count: 0,
    };
  });

  plays.forEach((play) => {
    const ms = play.playedAt?.toMillis
      ? play.playedAt.toMillis()
      : typeof play.playedAt?.seconds === "number"
        ? play.playedAt.seconds * 1000
        : 0;
    if (!ms) return;
    const date = new Date(ms);
    const bucket = monthlyPlays.find((month) => month.key === `${date.getFullYear()}-${date.getMonth()}`);
    if (bucket) bucket.count += 1;
  });

  const maxMonthlyPlays = Math.max(...monthlyPlays.map((month) => month.count), 1);

  const topPlayedGames = Object.entries(gamePlayCounts)
    .map(([bggId, count]) => {
      const game = libraryGames.find((entry) => String(entry.bggId) === String(bggId));
      return { bggId, count, name: game?.name || `Game #${bggId}`, image: game?.image };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  const maxGamePlays = topPlayedGames[0]?.count || 1;

  const monthlySpending = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
    return {
      key: `${date.getFullYear()}-${date.getMonth()}`,
      label: date.toLocaleString(undefined, { month: "short" }),
      total: 0,
    };
  });

  libraryGames.forEach((game) => {
    const ms = game.addedAt?.toMillis
      ? game.addedAt.toMillis()
      : typeof game.addedAt?.seconds === "number"
        ? game.addedAt.seconds * 1000
        : 0;
    if (!ms) return;
    const date = new Date(ms);
    const bucket = monthlySpending.find((month) => month.key === `${date.getFullYear()}-${date.getMonth()}`);
    if (bucket) bucket.total += Number(game.pricePaid) || 0;
  });

  const maxMonthlySpending = Math.max(...monthlySpending.map((month) => month.total), 1);
  const totalSpending = monthlySpending.reduce((sum, month) => sum + month.total, 0);

  const formatCompactAmount = (value: number) => {
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
    if (value >= 1_000) return `${(value / 1_000).toFixed(1).replace(/\.0$/, "")}k`;
    return `${Math.round(value)}`;
  };

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-300 px-1 sm:px-0">

      <div>
        <h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
          <BarChart3 className="text-indigo-600 dark:text-indigo-400" size={24} /> {t('analytics.title')}
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mt-1">{t('analytics.subtitle')}</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4">
        <div className="bg-white dark:bg-slate-800 p-4 sm:p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:gap-4">
          <div className="p-2.5 sm:p-3 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-xl shrink-0">
            <PiggyBank size={20} className="sm:w-6 sm:h-6" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-wider block leading-tight break-words">{t('analytics.libCap')}</span>
            <span className="text-base sm:text-2xl font-black text-slate-900 dark:text-white block leading-tight break-all">฿{totalInvestment.toLocaleString()}</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 sm:p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:gap-4">
          <div className="p-2.5 sm:p-3 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl shrink-0">
            <TrendingUp size={20} className="sm:w-6 sm:h-6" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-wider block leading-tight break-words">{t('analytics.netVal')}</span>
            <span className="text-base sm:text-2xl font-black text-slate-900 dark:text-white block leading-tight break-all">฿{globalAverageCpp}</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 sm:p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:gap-4">
          <div className="p-2.5 sm:p-3 bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-xl shrink-0">
            <BarChart3 size={20} className="sm:w-6 sm:h-6" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-wider block leading-tight break-words">{t('analytics.sessionsLabel')}</span>
            <span className="text-base sm:text-2xl font-black text-slate-900 dark:text-white block leading-tight break-all">{plays.length}</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 sm:p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:gap-4">
          <div className="p-2.5 sm:p-3 bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-xl shrink-0">
            <Trophy size={20} className="sm:w-6 sm:h-6" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-wider block leading-tight break-words">{t('analytics.uniqueGames')}</span>
            <span className="text-base sm:text-2xl font-black text-slate-900 dark:text-white block leading-tight break-all">{playedGameIds.size}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-4 sm:p-6">
          <h3 className="text-xs sm:text-sm font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
            <TrendingUp className="text-indigo-500" size={16} /> {t('analytics.playsOverTime')}
          </h3>
          <div className="mt-4 h-44 flex items-end gap-2 sm:gap-3">
            {monthlyPlays.map((month) => {
              const height = Math.max((month.count / maxMonthlyPlays) * 100, 8);
              return (
                <div key={month.key} className="flex-1 h-full flex flex-col items-center justify-end gap-1.5 min-w-0">
                  <span className="text-[10px] sm:text-xs font-black text-slate-500 dark:text-slate-400">{month.count}</span>
                  <div className="w-full flex-1 flex items-end">
                    <div
                      className={`w-full rounded-t-lg transition-all duration-300 ${month.count > 0 ? "bg-gradient-to-t from-indigo-600 to-indigo-400" : "bg-slate-100 dark:bg-slate-700"}`}
                      style={{ height: month.count > 0 ? `${height}%` : "4px" }}
                    />
                  </div>
                  <span className="text-[10px] sm:text-xs font-bold text-slate-400 truncate w-full text-center">{month.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-4 sm:p-6">
          <h3 className="text-xs sm:text-sm font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
            <Trophy className="text-amber-500" size={16} /> {t('analytics.topPlayed')}
          </h3>
          {topPlayedGames.length === 0 ? (
            <div className="h-44 flex items-center justify-center text-xs font-medium text-slate-400 text-center">{t('analytics.noChartData')}</div>
          ) : (
            <div className="mt-4 space-y-3">
              {topPlayedGames.map((game, index) => (
                <div key={game.bggId} className="flex items-center gap-3">
                  <span className="w-4 text-[11px] font-black text-slate-400 shrink-0 text-center">{index + 1}</span>
                  {game.image ? (
                    <img
                      src={`/api/media?url=${encodeURIComponent(game.image)}`}
                      alt=""
                      className="w-7 h-7 rounded-md object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-md bg-slate-100 dark:bg-slate-700 shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between gap-2 text-xs">
                      <span className="truncate font-bold text-slate-700 dark:text-slate-200">{game.name}</span>
                      <span className="font-black text-indigo-600 dark:text-indigo-400 shrink-0">{game.count}</span>
                    </div>
                    <div className="mt-1 h-1.5 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-400"
                        style={{ width: `${(game.count / maxGamePlays) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-4 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
            <h3 className="text-xs sm:text-sm font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-1.5 leading-tight min-w-0">
              <Wallet className="text-amber-500 shrink-0" size={16} /> {t('analytics.spendingPerMonth')}
            </h3>
            <span className="text-xs sm:text-base font-black text-slate-900 dark:text-white text-right leading-tight">฿{Math.round(totalSpending).toLocaleString()}</span>
          </div>
          <div className="mt-4 h-44 flex items-end gap-2 sm:gap-3">
            {monthlySpending.map((month) => {
              const height = Math.max((month.total / maxMonthlySpending) * 100, 8);
              return (
                <div key={month.key} className="flex-1 h-full flex flex-col items-center justify-end gap-1.5 min-w-0">
                  <span className="text-[9px] sm:text-[10px] font-black text-slate-500 dark:text-slate-400 truncate max-w-full">฿{formatCompactAmount(month.total)}</span>
                  <div className="w-full flex-1 flex items-end">
                    <div
                      className={`w-full rounded-t-lg transition-all duration-300 ${month.total > 0 ? "bg-gradient-to-t from-amber-500 to-amber-300" : "bg-slate-100 dark:bg-slate-700"}`}
                      style={{ height: month.total > 0 ? `${height}%` : "4px" }}
                    />
                  </div>
                  <span className="text-[10px] sm:text-xs font-bold text-slate-400 truncate w-full text-center">{month.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {itemsWithCost.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-4 sm:p-6">
            <h3 className="text-xs sm:text-sm font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
              <ArrowDownRight className="text-emerald-500" size={16} /> {t('analytics.roiChamp')}
            </h3>
            <div className="space-y-2.5">
              {bestRoiChampions.map((item) => (
                <div key={item.name} className="p-3 bg-emerald-50/50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/30 rounded-xl flex justify-between items-center gap-2">
                  <div className="min-w-0 flex-1">
                    <span className="font-bold text-slate-800 dark:text-slate-200 block truncate text-sm">{item.name}</span>
                    <span className="text-xs text-slate-400 font-medium">{t('analytics.playsCount', { count: item.playCount })}</span>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-black text-emerald-600 dark:text-emerald-400 text-sm block">฿{item.costPerPlay.toFixed(2)}</span>
                    <span className="text-[10px] text-slate-400 font-medium block">{t('analytics.perPlay')}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-4 sm:p-6">
            <h3 className="text-xs sm:text-sm font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
              <ArrowUpRight className="text-rose-500" size={16} /> {t('analytics.shelfSitters')}
            </h3>
            <div className="space-y-2.5">
              {worstRoiSitters.map((item) => (
                <div key={item.name} className="p-3 bg-rose-50/50 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-900/30 rounded-xl flex justify-between items-center gap-2">
                  <div className="min-w-0 flex-1">
                    <span className="font-bold text-slate-800 dark:text-slate-200 block truncate text-sm">{item.name}</span>
                    <span className="text-xs text-slate-400 font-medium truncate block">{item.playCount === 0 ? t('analytics.neverPlayed') : t('analytics.playsCount', { count: item.playCount })}</span>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-black text-rose-600 dark:text-rose-400 text-sm block">฿{item.costPerPlay.toFixed(2)}</span>
                    <span className="text-[10px] text-slate-400 font-medium block">{t('analytics.perPlay')}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-4 sm:p-6">
          <h2 className="text-xs sm:text-sm font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2 mb-3">
            <Trophy className="text-amber-500" size={16} /> {t('analytics.hallOfFame')}
          </h2>
          <div className="space-y-2.5">
            {sortedWinners.length === 0 ? (
              <div className="text-center text-xs text-slate-400 font-medium py-6 border border-dashed rounded-xl">{t('analytics.noPlays')}</div>
            ) : sortedWinners.map(([name, wins], idx) => (
              <div key={name} className="flex items-center justify-between p-2.5 sm:p-3 bg-slate-50 dark:bg-slate-900 rounded-xl">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                  <span className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center font-black text-xs sm:text-sm shrink-0 ${idx === 0 ? "bg-amber-100 text-amber-600" : idx === 1 ? "bg-slate-200 text-slate-600" : idx === 2 ? "bg-orange-100 text-orange-700" : "bg-white dark:bg-slate-700 text-slate-400 dark:text-slate-300"}`}>#{idx + 1}</span>
                  <span className="font-bold text-slate-900 dark:text-white text-sm truncate">{name}</span>
                </div>
                <span className="font-black text-indigo-600 dark:text-indigo-400 text-sm shrink-0">{t('analytics.winsCount', { count: wins })}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
}
