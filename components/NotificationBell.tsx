"use client";

import { useEffect, useMemo, useState } from "react";
import { collection, getDocs, onSnapshot, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuthGroup } from "@/components/AuthGroupProvider";
import { Bell, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";

type FriendGame = {
  id: string;
  name?: string;
  image?: string;
  userId: string;
  addedAt?: { toMillis?: () => number; seconds?: number };
};

function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
  return chunks;
}

function toMillis(value: FriendGame["addedAt"]): number {
  if (!value) return 0;
  if (typeof value.toMillis === "function") return value.toMillis();
  if (typeof value.seconds === "number") return value.seconds * 1000;
  return 0;
}

export function NotificationBell({ dropUp = false, onOpenFriends }: { dropUp?: boolean; onOpenFriends?: () => void }) {
  const { user, userProfile } = useAuthGroup();
  const { t } = useTranslation();

  const friendsKey = (userProfile?.friendsList || []).join("|");
  const storageKey = user ? `boardgame-tracker-notifications-lastSeen-${user.uid}` : "";

  const watchedUids = useMemo(() => {
    const list = friendsKey ? friendsKey.split("|").filter(Boolean) : [];
    return list.filter((uid: string) => uid !== userProfile?.partnerId);
  }, [friendsKey, userProfile?.partnerId]);

  const [friendGames, setFriendGames] = useState<FriendGame[]>([]);
  const [friendNames, setFriendNames] = useState<Record<string, string>>({});
  const [isOpen, setIsOpen] = useState(false);
  const [highlightIds, setHighlightIds] = useState<Set<string>>(new Set());
  const [lastSeenMs, setLastSeenMs] = useState<number>(() => {
    if (typeof window === "undefined" || !storageKey) return Date.now();
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      const value = Number(stored);
      if (Number.isFinite(value) && value > 0) return value;
    }
    const now = Date.now();
    localStorage.setItem(storageKey, String(now));
    return now;
  });

  // Clear data immediately when the followed-friends list changes.
  const [prevFriendsKey, setPrevFriendsKey] = useState(friendsKey);
  if (friendsKey !== prevFriendsKey) {
    setPrevFriendsKey(friendsKey);
    setFriendGames([]);
    setFriendNames({});
  }

  useEffect(() => {
    if (watchedUids.length === 0) return;
    let cancelled = false;

    (async () => {
      const names: Record<string, string> = {};
      for (const group of chunkArray(watchedUids, 10)) {
        try {
          const snap = await getDocs(query(collection(db, "users"), where("uid", "in", group)));
          snap.docs.forEach((doc) => {
            const data = doc.data();
            names[data.uid] = data.nickname || data.email || "Friend";
          });
        } catch { /* profile names are cosmetic */ }
      }
      if (!cancelled) setFriendNames(names);
    })();

    return () => { cancelled = true; };
  }, [watchedUids]);

  useEffect(() => {
    if (watchedUids.length === 0) return;

    const groups = chunkArray(watchedUids, 10);
    const results: FriendGame[][] = groups.map(() => []);
    const unsubs = groups.map((group, index) =>
      onSnapshot(
        query(collection(db, "userGames"), where("userId", "in", group)),
        (snap) => {
          results[index] = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() } as FriendGame));
          setFriendGames(results.flat());
        },
        (error) => console.error("Failed to load friend game notifications:", error)
      )
    );

    return () => unsubs.forEach((unsub) => unsub());
  }, [watchedUids]);

  const feed = useMemo(() => {
    return friendGames
      .map((game) => ({
        id: game.id,
        name: game.name || t('notifications.unknownGame'),
        image: game.image,
        friendUid: game.userId,
        friendName: friendNames[game.userId] || t('notifications.aFriend'),
        addedAtMs: toMillis(game.addedAt),
      }))
      .filter((item) => item.addedAtMs > 0)
      .sort((a, b) => b.addedAtMs - a.addedAtMs)
      .slice(0, 25);
  }, [friendGames, friendNames, t]);

  const unreadCount = feed.filter((item) => item.addedAtMs > lastSeenMs).length;

  const handleToggle = () => {
    if (!isOpen) {
      setHighlightIds(new Set(feed.filter((item) => item.addedAtMs > lastSeenMs).map((item) => item.id)));
      const now = Date.now();
      setLastSeenMs(now);
      try { localStorage.setItem(storageKey, String(now)); } catch { /* storage may be unavailable */ }
    }
    setIsOpen((prev) => !prev);
  };

  if (!user) return null;

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={handleToggle}
        aria-label={t('notifications.title')}
        title={t('notifications.title')}
        className="relative p-2 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors rounded-lg shrink-0"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center border border-white dark:border-slate-800">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className={`absolute right-0 ${dropUp ? "bottom-full mb-2" : "top-full mt-2"} w-80 max-w-[calc(100vw-2rem)] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl z-50 overflow-hidden`}>
          <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <h3 className="text-sm font-black text-slate-900 dark:text-white">{t('notifications.title')}</h3>
            <span className="text-[10px] font-bold text-slate-400">{feed.length}</span>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {feed.length === 0 ? (
              <div className="px-4 py-8 text-center text-xs font-medium text-slate-400">
                {t('notifications.empty')}
              </div>
            ) : (
              feed.map((item) => {
                const isNew = highlightIds.has(item.id);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => { setIsOpen(false); onOpenFriends?.(); }}
                    className={`w-full text-left flex items-center gap-3 px-3 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors ${isNew ? "bg-indigo-50/60 dark:bg-indigo-950/20" : ""}`}
                  >
                    <div className="relative w-9 h-9 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-900 shrink-0 border border-slate-200 dark:border-slate-700">
                      {item.image ? (
                        <img src={`/api/media?url=${encodeURIComponent(item.image)}`} alt="" className="w-full h-full object-cover" loading="lazy" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-400"><Loader2 size={14} /></div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="block text-xs font-black text-slate-900 dark:text-white truncate">{item.name}</span>
                      <span className="block text-[10px] font-medium text-slate-400 truncate">
                        {t('notifications.addedBy', { name: item.friendName })} · {new Date(item.addedAtMs).toLocaleDateString()}
                      </span>
                    </div>
                    {isNew && <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0" />}
                  </button>
                );
              })
            )}
          </div>

          <button
            type="button"
            onClick={() => { setIsOpen(false); onOpenFriends?.(); }}
            className="w-full px-4 py-2.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 border-t border-slate-200 dark:border-slate-700 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-colors"
          >
            {t('notifications.viewFriends')}
          </button>
        </div>
      )}
    </div>
  );
}
