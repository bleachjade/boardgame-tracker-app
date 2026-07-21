"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, addDoc, serverTimestamp } from "firebase/firestore";
import { useAuthGroup } from "./AuthGroupProvider";
import { Search, Loader2, Plus, X, Users, Database, Globe, Star } from "lucide-react";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";

export function SearchModal({ onClose }: { onClose: () => void }) {
  const { user, userNickname } = useAuthGroup();
  const { t } = useTranslation();

  const [queryText, setQueryText] = useState("");
  const [targetPlayers, setTargetPlayers] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Local JSON catalog state
  const [localDb, setLocalDb] = useState<any[]>([]);
  const [localDbLoading, setLocalDbLoading] = useState(true);

  // 1. Fetch local games.json once on load (for player-only filtering)
  useEffect(() => {
    const loadLocalDatabase = async () => {
      try {
        const res = await fetch("/games.json");
        if (res.ok) {
          const data = await res.json();
          setLocalDb(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        console.error("Failed to load local games catalog", err);
      } finally {
        setLocalDbLoading(false);
      }
    };
    loadLocalDatabase();
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanText = queryText.trim();
    const cleanPlayers = targetPlayers.trim();

    if (!cleanText && !cleanPlayers) return;

    setLoading(true);

    try {
      let finalResults: any[] = [];

      // ==========================================
      // PATH A: USER TYPED A TEXT QUERY
      // Use Live API search (+ optional player filter)
      // ==========================================
      if (cleanText) {
        const res = await fetch(`/api/search?q=${encodeURIComponent(cleanText)}`);
        const searchData = await res.json();

        if (Array.isArray(searchData) && searchData.length > 0) {
          // Smart Sort: Bring exact/prefix matches to top before slicing
          const lowerQuery = cleanText.toLowerCase();
          searchData.sort((a: any, b: any) => {
            const aName = (a.name || "").toLowerCase();
            const bName = (b.name || "").toLowerCase();
            if (aName === lowerQuery && bName !== lowerQuery) return -1;
            if (bName === lowerQuery && aName !== lowerQuery) return 1;
            if (aName.startsWith(lowerQuery) && !bName.startsWith(lowerQuery)) return -1;
            if (bName.startsWith(lowerQuery) && !aName.startsWith(lowerQuery)) return 1;
            return aName.length - bName.length;
          });

          // Fetch deep details for top 20
          const rawIds = searchData.slice(0, 20).map((item: any) => item.id);
          const uniqueIds = Array.from(new Set(rawIds)).join(",");

          const bggRes = await fetch(`/api/bgg?ids=${uniqueIds}`);
          const enrichedData = await bggRes.json();
          finalResults = Array.isArray(enrichedData) ? enrichedData : [];

          // Filter by player count if entered alongside text
          if (cleanPlayers) {
            const targetNum = parseInt(cleanPlayers, 10);
            finalResults = finalResults.filter((game) => {
              const min = parseInt(game.minPlayers || "0", 10);
              const max = parseInt(game.maxPlayers || "99", 10);
              return targetNum >= min && targetNum <= max;
            });
          }
        }
      } 
      // ==========================================
      // PATH B: NO TEXT QUERY, ONLY PLAYER NUMBER
      // Use local games.json catalog & SORT BY RATING
      // ==========================================
      else if (cleanPlayers) {
        const targetNum = parseInt(cleanPlayers, 10);
        
        // 1. Filter by player count
        finalResults = localDb.filter((game) => {
          const min = parseInt(game.minPlayers || "0", 10);
          const max = parseInt(game.maxPlayers || "99", 10);
          return targetNum >= min && targetNum <= max;
        });

        // 2. Sort by Highest Rating First
        finalResults.sort((a, b) => {
          const ratingA = parseFloat(a.rating || "0");
          const ratingB = parseFloat(b.rating || "0");
          return ratingB - ratingA; // Descending order
        });
      }

      // Filter out games already owned by the user
      if (user && finalResults.length > 0) {
        const ownedQuery = query(collection(db, "userGames"), where("userId", "==", user.uid));
        const ownedSnap = await getDocs(ownedQuery);
        const ownedBggIds = new Set(ownedSnap.docs.map((doc) => String(doc.data().bggId)));

        finalResults = finalResults.filter((game) => !ownedBggIds.has(String(game.bggId)));
      }

      setResults(finalResults);
    } catch (err) {
      console.error("Search Error:", err);
      toast.error(t("search.error"));
      setResults([]);
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
      toast.error(t("search.alreadyInLibrary", { name: game.name }));
      return;
    }

    try {
      await addDoc(collection(db, "userGames"), {
        userId: user.uid,
        ownerNickname: userNickname,
        bggId: String(game.bggId),
        name: game.name,
        image: game.image,
        year: game.year,
        minPlayers: game.minPlayers,
        maxPlayers: game.maxPlayers,
        playTime: game.playTime,
        rating: game.rating || "N/A",
        groupIds: [],
        isExpansion: game.isExpansion || false,
        baseGameId: game.baseGameId || null,
        addedAt: serverTimestamp(),
      });

      toast.success(t("search.addSuccess", { name: game.name }));
      onClose();
    } catch (err) {
      toast.error(t("search.addFailed"));
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 dark:bg-slate-900/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in zoom-in duration-300">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col border border-slate-200 dark:border-slate-700">
        <div className="p-5 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50 rounded-t-xl shrink-0">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">{t("search.title")}</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shrink-0">
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <input
                type="text"
                placeholder={t("search.placeholder")}
                className="w-full border border-slate-300 dark:border-slate-600 bg-transparent p-3 rounded-lg outline-none focus:ring-2 focus:ring-indigo-600 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 font-medium"
                value={queryText}
                onChange={(e) => setQueryText(e.target.value)}
                autoFocus
              />
            </div>

            <div className="relative w-full sm:w-32 shrink-0">
              <Users size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="number"
                min="1"
                max="99"
                placeholder="Players?"
                value={targetPlayers}
                onChange={(e) => setTargetPlayers(e.target.value)}
                className="w-full pl-10 pr-3 py-3 border border-slate-300 dark:border-slate-600 bg-transparent rounded-lg outline-none focus:ring-2 focus:ring-indigo-600 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 font-medium"
              />
            </div>

            <button
              type="submit"
              disabled={loading || (!queryText.trim() && !targetPlayers.trim())}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 dark:disabled:bg-indigo-800 text-white px-6 py-3 rounded-lg flex items-center justify-center gap-2 font-semibold transition-colors shadow-sm shrink-0"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : <Search size={20} />}
              <span className="hidden sm:inline">{t("search.button")}</span>
            </button>
          </form>

          {/* Mode Badges */}
          <div className="mt-2 text-[11px] font-bold flex items-center gap-1.5">
            {queryText.trim() ? (
              <span className="text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                <Globe size={13} /> Live BGG Search
              </span>
            ) : targetPlayers.trim() ? (
              <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <Database size={13} /> Showing top rated games for {targetPlayers} players
              </span>
            ) : null}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50 dark:bg-slate-900/50 rounded-b-xl">
          {(!Array.isArray(results) || results.length === 0) && !loading && (
            <div className="text-center text-slate-500 dark:text-slate-400 py-8 font-medium">
              {targetPlayers && !queryText
                ? `No games found supporting ${targetPlayers} players in your local catalog.`
                : queryText
                ? `No games found matching "${queryText}".`
                : t("search.emptyState")}
            </div>
          )}

          {Array.isArray(results) &&
            results.map((game) => (
              <div
                key={game.bggId}
                className="flex gap-4 p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl items-center shadow-sm hover:shadow transition-shadow"
              >
                {game.image ? (
                  <img
                    src={queryText.trim() ? `/api/media?url=${encodeURIComponent(game.image)}` : game.image}
                    alt={game.name}
                    className="w-16 h-16 object-cover rounded-xl shadow-xs border border-slate-100 dark:border-slate-700 shrink-0"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-16 h-16 bg-slate-200 dark:bg-slate-700 rounded-xl flex items-center justify-center text-slate-400 font-bold text-xs text-center border border-slate-300 dark:border-slate-600 shrink-0">
                    {t("search.noImage")}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-lg text-slate-900 dark:text-white truncate" title={game.name}>
                      {game.name} <span className="text-slate-500 font-normal text-sm">({game.year || "N/A"})</span>
                    </h3>
                    {game.rating && game.rating !== "0" && (
                      <span className="flex items-center gap-1 text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800 shrink-0">
                        <Star size={11} className="fill-amber-400 text-amber-400" />
                        {parseFloat(game.rating).toFixed(1)}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400 font-medium mt-0.5">
                    {game.minPlayers || "?"}-{game.maxPlayers || "?"} {t("search.players")} • {game.playTime || "?"} {t("search.mins")}
                  </p>
                </div>
                <button
                  onClick={() => handleAddGame(game)}
                  className="bg-slate-100 dark:bg-slate-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 border border-slate-200 dark:border-slate-600 hover:border-indigo-200 dark:hover:border-indigo-800 p-3 rounded-full transition-colors group shrink-0"
                  title={t("search.addTooltip")}
                >
                  <Plus className="text-slate-600 dark:text-slate-300 group-hover:text-indigo-600 dark:group-hover:text-indigo-400" />
                </button>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}