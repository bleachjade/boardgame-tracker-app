"use client";

import { useState, useEffect } from "react";
import { collection, query, where, getDocs, updateDoc, doc, arrayUnion, arrayRemove, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuthGroup } from "@/components/AuthGroupProvider";
import { Users, UserPlus, Heart, Search, Eye, Loader2, HeartHandshake, Unlink, UserMinus, Sparkles } from "lucide-react";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";

export function FriendsTab() {
  const { user } = useAuthGroup();
  const { t } = useTranslation();

  const [friendEmail, setFriendEmail] = useState("");
  const [partnerEmail, setPartnerEmail] = useState("");

  const [currentUserProfile, setCurrentUserProfile] = useState<any>(null);
  const [partnerProfile, setPartnerProfile] = useState<any | null>(null);
  const [friendsProfiles, setFriendsProfiles] = useState<any[]>([]);
  const [loadingFriends, setLoadingFriends] = useState(true);

  const [selectedFriend, setSelectedFriend] = useState<any | null>(null);
  const [selectedGame, setSelectedGame] = useState<any | null>(null);
  const [friendGames, setFriendGames] = useState<any[]>([]);
  const [gameHistory, setGameHistory] = useState<any[]>([]);
  const [loadingGames, setLoadingGames] = useState(false);
  const [loadingGameHistory, setLoadingGameHistory] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (!user) return;
    const userRef = doc(db, "users", user.uid);
    const unsub = onSnapshot(userRef, async (profileSnap) => {
      if (!profileSnap.exists()) {
        setLoadingFriends(false);
        return;
      }
      const data = profileSnap.data();
      setCurrentUserProfile(data);

      const followedUids = data.friendsList || [];
      if (followedUids.length === 0) {
        setFriendsProfiles([]);
        setLoadingFriends(false);
        return;
      }
      const q = query(collection(db, "users"), where("uid", "in", followedUids));
      const res = await getDocs(q);
      setFriendsProfiles(res.docs.map(d => d.data()));
      setLoadingFriends(false);
    });
    return () => unsub();
  }, [user]);

  useEffect(() => {
    if (!currentUserProfile?.isCouple || !currentUserProfile?.partnerId) {
      setPartnerProfile(null);
      return;
    }
    const partnerRef = doc(db, "users", currentUserProfile.partnerId);
    const unsubPartner = onSnapshot(partnerRef, (snap) => {
      if (snap.exists()) setPartnerProfile(snap.data());
    });
    return () => unsubPartner();
  }, [currentUserProfile]);

  useEffect(() => {
    if (!selectedFriend) return;
    setSelectedGame(null);
    setLoadingGames(true);

    const targetUids = [selectedFriend.uid];
    if (selectedFriend.isCouple && selectedFriend.partnerId) {
      targetUids.push(selectedFriend.partnerId);
    }

    const q = query(collection(db, "userGames"), where("userId", "in", targetUids));
    const unsub = onSnapshot(q, (snap) => {
      setFriendGames(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoadingGames(false);
    });
    return () => unsub();
  }, [selectedFriend]);

  useEffect(() => {
    if (!selectedFriend || !selectedGame) {
      setGameHistory([]);
      return;
    }

    setLoadingGameHistory(true);
    const q = query(
      collection(db, "gamePlays"),
      where("userId", "==", selectedFriend.uid),
      where("bggId", "==", selectedGame.bggId)
    );

    const unsub = onSnapshot(q, (snap) => {
      const history = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .sort((a: any, b: any) => (b.playedAt?.seconds || 0) - (a.playedAt?.seconds || 0));
      setGameHistory(history);
      setLoadingGameHistory(false);
    });

    return () => unsub();
  }, [selectedFriend, selectedGame]);

  const handleLinkPartner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !partnerEmail.trim()) return;

    try {
      const q = query(collection(db, "users"), where("email", "==", partnerEmail.trim().toLowerCase()));
      const snap = await getDocs(q);

      if (snap.empty) return toast.error(t('friends.noMatch'));

      const partnerDoc = snap.docs[0];
      const partnerData = partnerDoc.data();

      if (partnerData.uid === user.uid) return toast.error(t('friends.noSelf'));
      if (partnerData.isCouple && partnerData.partnerId !== user.uid) return toast.error(t('friends.alreadyLinked'));

      await updateDoc(doc(db, "users", user.uid), { isCouple: true, partnerId: partnerData.uid });

      try {
        await updateDoc(doc(db, "users", partnerData.uid), { isCouple: true, partnerId: user.uid });
      } catch {}

      toast.success(t('friends.linkSuccess'));
      setPartnerEmail("");
    } catch {
      toast.error(t('friends.linkFail'));
    }
  };

  const handleUnlinkPartner = async () => {
    if (!confirm(t('friends.unlinkConfirm'))) return;
    try {
      const pId = currentUserProfile.partnerId;
      await updateDoc(doc(db, "users", user!.uid), { isCouple: false, partnerId: null });
      if (pId) await updateDoc(doc(db, "users", pId), { isCouple: false, partnerId: null });
      toast.success(t('friends.unlinkSuccess'));
    } catch {
      toast.error(t('friends.unlinkFail'));
    }
  };

  const handleAddFriend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !friendEmail.trim()) return;

    try {
      const q = query(collection(db, "users"), where("email", "==", friendEmail.trim().toLowerCase()));
      const snap = await getDocs(q);

      if (snap.empty) return toast.error(t('friends.addNoFind'));
      const targetUserDoc = snap.docs[0].data();
      if (targetUserDoc.uid === user.uid) return toast.error(t('friends.addNoSelf'));

      await updateDoc(doc(db, "users", user.uid), { friendsList: arrayUnion(targetUserDoc.uid) });
      toast.success(t('friends.followed', { name: targetUserDoc.nickname }));
      setFriendEmail("");
    } catch {
      toast.error(t('friends.addFail'));
    }
  };

  const handleRemoveFriend = async (friendUid: string, friendName: string) => {
    if (!user || !confirm(t('friends.removeConfirm', { name: friendName }))) return;
    try {
      await updateDoc(doc(db, "users", user.uid), { friendsList: arrayRemove(friendUid) });
      toast.success(t('friends.removed', { name: friendName }));
      if (selectedFriend?.uid === friendUid) setSelectedFriend(null);
    } catch {
      toast.error(t('friends.removeFail'));
    }
  };

  if (loadingFriends || !currentUserProfile) {
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="animate-spin text-indigo-600 dark:text-indigo-400" size={32} />
      </div>
    );
  }

  const filteredGames = friendGames.filter(g => g.name.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-300 px-1 sm:px-0">
      {!selectedFriend && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-rose-50 dark:bg-rose-950/20 rounded-2xl shadow-sm border border-rose-200 dark:border-rose-900/50 p-5 space-y-4">
            <div>
              <h3 className="text-sm font-black text-rose-900 dark:text-rose-400 flex items-center gap-2">
                <HeartHandshake className="text-rose-500 shrink-0" size={18} /> {t('friends.coupleTitle')}
              </h3>
              <p className="text-xs font-medium text-rose-700 dark:text-rose-300/70 mt-0.5">{t('friends.coupleDesc')}</p>
            </div>

            {currentUserProfile?.isCouple ? (
              <div className="bg-white dark:bg-slate-800 border-2 border-rose-300 dark:border-rose-800 rounded-xl p-4 flex items-center justify-between shadow-sm relative overflow-hidden">
                <div className="flex items-center gap-3 relative z-10">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-rose-400 to-rose-600 flex items-center justify-center shadow-sm shrink-0">
                    <Sparkles className="text-white" size={20} />
                  </div>
                  <div className="min-w-0">
                    <span className="block text-xs font-bold text-rose-500 dark:text-rose-400 uppercase tracking-wider mb-0.5">{t('friends.linkedPartner')}</span>
                    <span className="block text-base font-black text-slate-900 dark:text-white truncate">
                      {partnerProfile ? partnerProfile.nickname : t('common.loading')}
                    </span>
                    <span className="block text-xs font-medium text-slate-500 dark:text-slate-400 truncate">
                      {partnerProfile ? partnerProfile.email : "..."}
                    </span>
                  </div>
                </div>
                <button onClick={handleUnlinkPartner} className="p-2.5 bg-rose-100 hover:bg-rose-200 dark:bg-rose-900/40 dark:hover:bg-rose-900/70 text-rose-600 dark:text-rose-400 rounded-lg transition relative z-10 shadow-xs">
                  <Unlink size={16} />
                </button>
              </div>
            ) : (
              <form onSubmit={handleLinkPartner} className="flex gap-2">
                <input
                  type="email" required placeholder={t('friends.partnerEmail')}
                  value={partnerEmail} onChange={(e) => setPartnerEmail(e.target.value)}
                  className="flex-1 border border-rose-200 dark:border-rose-900/50 bg-white dark:bg-slate-900 p-2.5 text-sm rounded-xl outline-none focus:ring-2 focus:ring-rose-500 text-slate-900 dark:text-white font-medium"
                />
                <button type="submit" className="px-4 bg-rose-500 text-white font-bold text-sm rounded-xl hover:bg-rose-600 transition shadow-xs flex items-center gap-1.5 shrink-0">
                  {t('friends.linkBtn')}
                </button>
              </form>
            )}
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-5 space-y-4">
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                <UserPlus className="text-indigo-600 dark:text-indigo-400" size={18} /> {t('friends.followTitle')}
              </h3>
              <p className="text-xs font-medium text-slate-400 mt-0.5">{t('friends.followDesc')}</p>
            </div>
            <form onSubmit={handleAddFriend} className="flex gap-2">
              <input
                type="email" required placeholder="friend@email.com"
                value={friendEmail} onChange={(e) => setFriendEmail(e.target.value)}
                className="flex-1 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-2.5 text-sm rounded-xl outline-none focus:ring-2 focus:ring-indigo-600 text-slate-900 dark:text-white font-medium"
              />
              <button type="submit" className="px-5 bg-indigo-600 text-white font-bold text-sm rounded-xl hover:bg-indigo-700 transition shadow-xs flex items-center gap-1.5 shrink-0">
                {t('friends.followBtn')}
              </button>
            </form>
          </div>
        </div>
      )}

      {selectedFriend && !selectedGame && (
        <div className="space-y-5 animate-in slide-in-from-right duration-300">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
            <div className="min-w-0">
              <button onClick={() => setSelectedFriend(null)} className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline mb-1 block">{t('friends.returnRoster')}</button>
              <h3 className="text-base font-black text-slate-900 dark:text-white truncate flex items-center gap-2">
                {t('friends.browsing', { name: selectedFriend.nickname })}
                {selectedFriend.isCouple && <span className="shrink-0 flex items-center"><Heart size={14} className="text-rose-500 fill-rose-500" /></span>}
              </h3>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input type="text" placeholder={t('friends.searchFriend')} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-9 pr-4 py-2 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs rounded-xl outline-none focus:ring-2 focus:ring-indigo-600 text-slate-900 dark:text-white font-medium" />
            </div>
          </div>

          {loadingGames ? (
            <div className="flex justify-center py-12"><Loader2 className="animate-spin text-indigo-600 dark:text-indigo-400" size={32} /></div>
          ) : filteredGames.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-slate-800 border rounded-2xl text-slate-400 text-sm font-medium">{t('friends.noMatching')}</div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {filteredGames.map((game) => (
                <button key={game.id} type="button" onClick={() => setSelectedGame(game)} className="bg-white dark:bg-slate-800 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col justify-between group text-left focus:outline-none focus:ring-2 focus:ring-indigo-600">
                  <div className="relative aspect-square w-full bg-slate-100 dark:bg-slate-900 border-b dark:border-slate-700/50 overflow-hidden">
                    {game.image ? (
                      <img src={`/api/media?url=${encodeURIComponent(game.image)}`} alt={game.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />
                    ) : <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs font-bold text-center p-4">No Image</div>}
                  </div>
                  <div className="p-3 bg-white dark:bg-slate-800 space-y-1 flex-1 flex flex-col justify-between">
                    <div className="min-w-0">
                      <span className="font-black text-slate-900 dark:text-white text-xs block truncate" title={game.name}>{game.name}</span>
                      <span className="text-[10px] font-semibold text-slate-400 block truncate mt-0.5">👤 {game.minPlayers}-{game.maxPlayers} | ⏱️ {game.playTime}</span>
                    </div>
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-700/50 flex justify-between items-center text-[9px] font-bold text-slate-400">
                      <span>{t('friends.weight')}: {game.weight || "N/A"}</span>
                      {game.isExpansion && <span className="text-indigo-600 bg-indigo-50 dark:bg-indigo-950/60 px-1.5 py-0.5 rounded">{t('friends.expansion')}</span>}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {selectedFriend && selectedGame && (
        <div className="space-y-5 animate-in slide-in-from-right duration-300">
          <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="min-w-0">
                <button onClick={() => setSelectedGame(null)} className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline mb-1 block">← {t('friends.returnRoster')}</button>
                <h3 className="text-base font-black text-slate-900 dark:text-white truncate">{selectedGame.name}</h3>
              </div>
              <div className="flex items-center gap-2 rounded-xl bg-slate-100 dark:bg-slate-900 px-3 py-2 text-xs font-bold text-slate-500 dark:text-slate-400">
                <span>{selectedFriend.nickname}</span>
              </div>
            </div>
          </div>

          {loadingGameHistory ? (
            <div className="flex justify-center py-10"><Loader2 className="animate-spin text-indigo-600 dark:text-indigo-400" size={32} /></div>
          ) : gameHistory.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-slate-800 border rounded-2xl text-slate-400 text-sm font-medium">No logged plays found for this game.</div>
          ) : (
            <div className="space-y-4">
              {gameHistory.map((record) => {
                const players = Array.isArray(record.players) ? record.players : [];
                const maxScore = players.length ? Math.max(...players.map((p: any) => Number(p.score || 0))) : 0;
                const sortedPlayers = [...players].sort((a: any, b: any) => Number(b.score || 0) - Number(a.score || 0));
                const canViewPhoto = record.userId === user?.uid || selectedFriend.uid === user?.uid;

                return (
                  <div key={record.id} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 shadow-xs space-y-3">
                    <div className="flex justify-between items-center text-xs text-slate-500 dark:text-slate-400 font-bold border-b dark:border-slate-700 pb-2 border-slate-100">
                      <span className="flex items-center gap-1"><span>📅</span> {record.playedAt?.toDate ? new Date(record.playedAt.toDate()).toLocaleDateString() : "Just now"}</span>
                      <span>{record.loggedBy || selectedFriend.nickname}</span>
                    </div>

                    <div className="space-y-1.5">
                      {sortedPlayers.map((p: any, index: number) => (
                        <div key={`${record.id}-${index}`} className="flex justify-between items-center text-sm font-semibold">
                          <span className="text-slate-700 dark:text-slate-200 flex items-center gap-1.5">{Number(p.score) === maxScore && maxScore > 0 && <span>🏆</span>} {p.name}</span>
                          <div className="text-right">
                            <span className="font-black text-slate-900 dark:text-white">{p.score} pts</span>
                            {p.rawExpression && p.rawExpression !== String(p.score) && <span className="block text-[10px] text-slate-400 dark:text-slate-500 font-normal">({p.rawExpression})</span>}
                          </div>
                        </div>
                      ))}
                    </div>

                    {record.memoryPhoto && canViewPhoto ? (
                      <div className="mt-3 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-900/50">
                        <img src={record.memoryPhoto} alt="Session memory" className="w-full max-h-64 object-contain" />
                      </div>
                    ) : record.memoryPhoto ? (
                      <div className="mt-3 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40 p-3 text-xs font-medium text-slate-500 dark:text-slate-400">
                        Photo hidden — only the uploader can view this session image.
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
