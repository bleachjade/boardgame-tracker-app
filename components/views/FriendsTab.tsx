"use client";

import { useState, useEffect } from "react";
import { collection, query, where, getDocs, updateDoc, doc, arrayUnion, arrayRemove, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuthGroup } from "@/components/AuthGroupProvider";
import { Users, UserPlus, Heart, Search, Eye, Loader2, HeartHandshake, Unlink, UserMinus, Sparkles } from "lucide-react";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next"; // NEW

export function FriendsTab() {
  const { user } = useAuthGroup();
  const { t } = useTranslation(); // NEW

  const [friendEmail, setFriendEmail] = useState("");
  const [partnerEmail, setPartnerEmail] = useState("");

  const [currentUserProfile, setCurrentUserProfile] = useState<any>(null);
  const [partnerProfile, setPartnerProfile] = useState<any | null>(null);
  const [friendsProfiles, setFriendsProfiles] = useState<any[]>([]);
  const [loadingFriends, setLoadingFriends] = useState(true);

  const [selectedFriend, setSelectedFriend] = useState<any | null>(null);
  const [friendGames, setFriendGames] = useState<any[]>([]);
  const [loadingGames, setLoadingGames] = useState(false);
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
      } catch (err) { }

      toast.success(t('friends.linkSuccess'));
      setPartnerEmail("");
    } catch (err) {
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
    } catch (err) {
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
    } catch (err) { toast.error(t('friends.addFail')); }
  };

  const handleRemoveFriend = async (friendUid: string, friendName: string) => {
    if (!user || !confirm(t('friends.removeConfirm', { name: friendName }))) return;
    try {
      await updateDoc(doc(db, "users", user.uid), { friendsList: arrayRemove(friendUid) });
      toast.success(t('friends.removed', { name: friendName }));
      if (selectedFriend?.uid === friendUid) setSelectedFriend(null);
    } catch (err) { toast.error(t('friends.removeFail')); }
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

      {!selectedFriend ? (
        <div className="space-y-3">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 mt-4">
            <Users size={14} /> {t('friends.myCircle', { count: friendsProfiles.length })}
          </h3>

          {friendsProfiles.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-slate-800 border rounded-2xl text-slate-400 text-sm font-medium">{t('friends.emptyCircle')}</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {friendsProfiles.map((friend) => (
                <div key={friend.uid} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 flex justify-between items-center shadow-xs group">
                  <div className="min-w-0 pr-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-slate-900 dark:text-white truncate block">{friend.nickname}</span>
                      {friend.isCouple && (
                        <span className="flex items-center gap-0.5 text-[9px] font-black bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 px-1.5 py-0.5 rounded-full">
                          <Heart size={10} className="fill-rose-500" /> {t('friends.coupledShelf')}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-slate-400 truncate block mt-0.5">{friend.email}</span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button onClick={() => setSelectedFriend(friend)} className="p-2.5 bg-slate-50 hover:bg-indigo-50 dark:bg-slate-900 dark:hover:bg-indigo-950/40 text-slate-500 dark:text-slate-300 hover:text-indigo-600 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs transition-colors flex items-center justify-center gap-1.5 font-bold text-xs">
                      <Eye size={14} /> <span className="hidden sm:inline">{t('friends.viewShelf')}</span>
                    </button>
                    <button onClick={() => handleRemoveFriend(friend.uid, friend.nickname)} className="p-2.5 bg-slate-50 hover:bg-red-50 dark:bg-slate-900 dark:hover:bg-red-950/40 text-slate-400 hover:text-red-500 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs transition-colors md:opacity-0 md:group-hover:opacity-100">
                      <UserMinus size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
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
                <div key={game.id} className="bg-white dark:bg-slate-800 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col justify-between group">
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
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}