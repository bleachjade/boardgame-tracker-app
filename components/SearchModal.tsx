"use client";

import { useState } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, addDoc, serverTimestamp } from "firebase/firestore";
import { useAuthGroup } from "./AuthGroupProvider";
import { Search, Loader2, Plus, X } from "lucide-react";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next"; // NEW

export function SearchModal({ onClose }: { onClose: () => void }) {
  const { user, userNickname } = useAuthGroup();
  const { t } = useTranslation(); // NEW

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

      if (!Array.isArray(searchData) || searchData.length === 0) {
        setResults([]);
        return;
      }

      const rawIds = searchData.slice(0, 12).map((item: any) => item.id);
      const uniqueIds = Array.from(new Set(rawIds)).join(',');

      const bggRes = await fetch(`/api/bgg?ids=${uniqueIds}`);
      const enrichedData = await bggRes.json();

      let finalResults = Array.isArray(enrichedData) ? enrichedData : [];

      if (user && finalResults.length > 0) {
        const ownedQuery = query(collection(db, "userGames"), where("userId", "==", user.uid));
        const ownedSnap = await getDocs(ownedQuery);
        const ownedBggIds = new Set(ownedSnap.docs.map(doc => String(doc.data().bggId)));

        finalResults = finalResults.filter(game => !ownedBggIds.has(String(game.bggId)));
      }

      setResults(finalResults);
    } catch (err) {
      console.error(err);
      toast.error(t('search.error'));
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
      // NOTE: Using dynamic interpolation for the game name
      toast.error(t('search.alreadyInLibrary', { name: game.name }));
      return;
    }

    try {
      await addDoc(collection(db, "userGames"), {
        userId: user.uid,
        ownerNickname: userNickname,
        bggId: game.bggId,
        name: game.name,
        image: game.image,
        year: game.year,
        minPlayers: game.minPlayers,
        maxPlayers: game.maxPlayers,
        playTime: game.playTime,
        groupIds: [],
        isExpansion: game.isExpansion || false,
        baseGameId: game.baseGameId || null,
        addedAt: serverTimestamp()
      });

      toast.success(t('search.addSuccess', { name: game.name }));
      onClose();
    } catch (err) {
      toast.error(t('search.addFailed'));
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 dark:bg-slate-900/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in zoom-in duration-300">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col border border-slate-200 dark:border-slate-700">
        <div className="p-5 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50 rounded-t-xl">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">{t('search.title')}</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSearch} className="p-4 border-b border-slate-200 dark:border-slate-700 flex flex-col md:flex-row gap-3 bg-white dark:bg-slate-800">
          <input
            type="text"
            placeholder={t('search.placeholder')}
            className="flex-1 border border-slate-300 dark:border-slate-600 bg-transparent p-3 rounded-lg outline-none focus:ring-2 focus:ring-indigo-600 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 font-medium"
            value={queryText}
            onChange={(e) => setQueryText(e.target.value)}
            autoFocus
          />
          <button type="submit" disabled={loading} className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 dark:disabled:bg-indigo-800 text-white px-6 py-2 rounded-lg flex items-center justify-center gap-2 font-semibold transition-colors shadow-sm">
            {loading ? <Loader2 className="animate-spin" size={20} /> : <Search size={20} />}
            {t('search.button')}
          </button>
        </form>

        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50 dark:bg-slate-900/50 rounded-b-xl">
          {(!Array.isArray(results) || results.length === 0) && !loading && (
            <div className="text-center text-slate-500 dark:text-slate-400 py-8 font-medium">{t('search.emptyState')}</div>
          )}
          {Array.isArray(results) && results.map((game) => (
            <div key={game.bggId} className="flex gap-4 p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl items-center shadow-sm hover:shadow transition-shadow">
              {game.image ? (
                <img
                  src={`/api/media?url=${encodeURIComponent(game.image)}`}
                  alt={game.name}
                  className="w-16 h-16 object-cover rounded-xl shadow-xs border border-slate-100 dark:border-slate-700 shrink-0"
                  loading="lazy"
                />
              ) : (
                <div className="w-16 h-16 bg-slate-200 dark:bg-slate-700 rounded-xl flex items-center justify-center text-slate-400 font-bold text-xs text-center border border-slate-300 dark:border-slate-600 shrink-0">
                  {t('search.noImage')}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-lg text-slate-900 dark:text-white truncate">{game.name} <span className="text-slate-500 font-normal text-sm">({game.year || 'N/A'})</span></h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">{game.minPlayers || '?'}-{game.maxPlayers || '?'} {t('search.players')} • {game.playTime || '?'} {t('search.mins')}</p>
              </div>
              <button
                onClick={() => handleAddGame(game)}
                className="bg-slate-100 dark:bg-slate-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 border border-slate-200 dark:border-slate-600 hover:border-indigo-200 dark:hover:border-indigo-800 p-3 rounded-full transition-colors group shrink-0"
                title={t('search.addTooltip')}
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