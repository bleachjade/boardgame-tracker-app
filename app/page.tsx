"use client";

import { useAuthGroup } from "@/components/AuthGroupProvider";
import { signInWithPopup, googleProvider, auth, db } from "@/lib/firebase";
import { useState, useEffect, useMemo, useRef, useCallback, memo } from "react";
import { collection, query, where, onSnapshot, doc, updateDoc, deleteDoc, writeBatch, getDocs, getDoc, setDoc, serverTimestamp, addDoc } from "firebase/firestore";
import dynamic from "next/dynamic";
import NextImage from "next/image";
import { Library, Menu, Plus, UserPlus, BookOpen, ListChecks, Filter, Users, ArrowDownAZ, Shuffle, X, Sun, Moon, LayoutGrid, LayoutList, Trophy, Image as ImageIcon, ChevronDown } from "lucide-react";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";

// Extracted Components
import { Sidebar } from "@/components/Sidebar";
import { GameCard } from "@/components/GameCard";
import { MobileBottomNav } from "@/components/MobileBottomNav";

// Heavy views/modals are split into separate chunks and loaded on demand.
const RecommendationsTab = dynamic(() => import("@/components/views/RecommendationsTab").then((m) => m.RecommendationsTab), { ssr: false });
const AnalyticsTab = dynamic(() => import("@/components/views/AnalyticsTab").then((m) => m.AnalyticsTab), { ssr: false });
const FriendsTab = dynamic(() => import("@/components/views/FriendsTab").then((m) => m.FriendsTab), { ssr: false });
const GameNightsTab = dynamic(() => import("@/components/views/GameNightsTab").then((m) => m.GameNightsTab), { ssr: false });
const SearchModal = dynamic(() => import("@/components/SearchModal").then((m) => m.SearchModal), { ssr: false });
const GameDetailsModal = dynamic(() => import("@/components/modals/GameDetailsModal").then((m) => m.GameDetailsModal), { ssr: false });
const RandomGameModal = dynamic(() => import("@/components/modals/RandomGameModal").then((m) => m.RandomGameModal), { ssr: false });
const ScoresModal = dynamic(() => import("@/components/modals/ScoresModal").then((m) => m.ScoresModal), { ssr: false });
const AssignModal = dynamic(() => import("@/components/modals/AssignModal").then((m) => m.AssignModal), { ssr: false });
const BulkAssignModal = dynamic(() => import("@/components/modals/BulkAssignModal").then((m) => m.BulkAssignModal), { ssr: false });
const InviteModal = dynamic(() => import("@/components/modals/InviteModal").then((m) => m.InviteModal), { ssr: false });
const AddFromLibraryModal = dynamic(() => import("@/components/modals/AddFromLibraryModal").then((m) => m.AddFromLibraryModal), { ssr: false });
const GamePickerModal = dynamic(() => import("@/components/modals/GamePickerModal").then((m) => m.GamePickerModal), { ssr: false });

// Types
import { Game, Group } from "@/lib/types";

// Stable reference so tab components don't see a "new" prop on every render
const EMPTY_GAMES: Game[] = [];
const GAMES_PER_BATCH = 24;

type BggRatingResult = { bggId?: string | number; rating?: string | number };

// Image Shape View Component - Masonry layout based on box dimensions
interface ImageShapeViewProps {
  games: Game[];
  onOpenDetails: (game: Game) => void;
  onLogScore: (game: Game) => void;
}

function getBoxMetrics(game: Game) {
  if (game.dimensions?.width && game.dimensions?.length && game.dimensions?.depth) {
    const aspectRatio = game.dimensions.width / game.dimensions.length;
    const normalizedWidth = game.dimensions.width / 30;
    return { aspectRatio, normalizedWidth: Math.max(0.5, Math.min(3, normalizedWidth)) };
  }
  const hash = game.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const ratios = [0.65, 0.75, 0.85, 1.0, 1.15, 1.3];
  const widths = [0.7, 0.85, 1.0, 1.2, 1.5, 2.0];
  const idx = hash % ratios.length;
  return { aspectRatio: ratios[idx], normalizedWidth: widths[idx] };
}

const ImageShapeView = memo(function ImageShapeView({ games, onOpenDetails, onLogScore }: ImageShapeViewProps) {
  const gamesWithMetrics = useMemo(
    () => games.map(game => ({ ...game, ...getBoxMetrics(game) })).sort((a, b) => a.aspectRatio - b.aspectRatio),
    [games]
  );

  return (
    <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 xl:columns-5 gap-3 p-1 space-y-3">
  {gamesWithMetrics.map((game) => {
    return (
      <div
        key={game.id}
        className="break-inside-avoid w-full"
      >
        <div
          onClick={() => onOpenDetails(game)}
          className="group relative bg-slate-900 rounded-xl shadow-xs hover:shadow-lg transition-all duration-300 cursor-pointer overflow-hidden w-full flex flex-col"
        >
          {game.image ? (
            <div className="relative w-full" style={{ aspectRatio: game.aspectRatio }}>
              <NextImage
                src={game.image}
                alt={game.name}
                fill
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                className="object-cover group-hover:scale-105 transition-transform duration-300"
              />
            </div>
          ) : (
            <div className="w-full h-48 flex items-center justify-center text-slate-400 font-bold bg-slate-100 dark:bg-slate-700 rounded-xl">
              {game.name}
            </div>
          )}

          {/* Gradient overlay at bottom for text readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent pointer-events-none rounded-xl" />

          {/* Subtle border that follows the container shape */}
          <div className="absolute inset-0 border border-slate-200/50 dark:border-slate-700/50 rounded-xl pointer-events-none" />

          {/* Game info overlay on hover */}
          <div className="absolute bottom-0 left-0 right-0 p-3 transform translate-y-full opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300 z-10">
            <h4 className="font-bold text-white text-sm truncate mb-1">{game.name}</h4>
            <p className="text-slate-300 text-xs font-medium">
              {game.minPlayers || "?"}-{game.maxPlayers || "?"} players • {game.playTime || "?"} mins
            </p>
          </div>

          {/* Log Score button overlay */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onLogScore(game);
            }}
            className="absolute top-2 right-2 p-2 bg-indigo-600 text-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-indigo-500 z-10"
            title="Log Score"
          >
            <Trophy size={14} />
          </button>
        </div>
      </div>
    );
  })}
</div>
  );
});

export default function Home() {
  const { user, userNickname, userProfile, loading: authLoading, activeGroup, setActiveGroup, userGroups } = useAuthGroup();
  const { t } = useTranslation();

  const [currentView, setCurrentView] = useState<"library" | "recommendations" | "analytics" | "friends" | "events">("library");
  const [userTheme, setUserTheme] = useState("light");
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  // Load filter/sort preferences from localStorage
  const [searchQuery, setSearchQuery] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('boardgame-tracker-searchQuery') || "";
    }
    return "";
  });
  const [sortOption, setSortOption] = useState<"recent" | "alpha" | "year" | "plays">(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('boardgame-tracker-sortOption') as "recent" | "alpha" | "year" | "plays") || "recent";
    }
    return "recent";
  });
  const [playerFilter, setPlayerFilter] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('boardgame-tracker-playerFilter') || "";
    }
    return "";
  });
  const [viewMode, setViewMode] = useState<"grid" | "compact" | "imageShape">(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('boardgame-tracker-viewMode') as "grid" | "compact" | "imageShape") || "grid";
    }
    return "grid";
  });
  const [isScrolled, setIsScrolled] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isGamePickerOpen, setIsGamePickerOpen] = useState(false);
  const [assigningGame, setAssigningGame] = useState<Game | null>(null);
  const [scoringGame, setScoringGame] = useState<Game | null>(null);
  const [detailsGame, setDetailsGame] = useState<Game | null>(null);
  const [invitingGroup, setInvitingGroup] = useState<Group | null>(null);
  const [libraryModalGroup, setLibraryModalGroup] = useState<Group | null>(null);
  const [randomGameOpen, setRandomGameOpen] = useState<Game | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const [isBulkMode, setIsBulkMode] = useState(false);
  const [selectedGameIds, setSelectedGameIds] = useState<string[]>([]);
  const [isBulkAssignModalOpen, setIsBulkAssignModalOpen] = useState(false);

  // Lazy grid rendering: only mount a batch of cards at a time
  const [visibleGameCount, setVisibleGameCount] = useState(GAMES_PER_BATCH);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Mobile nav hide on scroll down
  const lastScrollTopRef = useRef(0);
  const [showMobileNav, setShowMobileNav] = useState(true);

  // Games data from hook (will be implemented via useAuthGroup enhancement)
  const [games, setGames] = useState<Game[]>([]);
  const [gamesLoading, setGamesLoading] = useState(true);
  const [playCounts, setPlayCounts] = useState<Record<string, number>>({});
  const ratingBackfillIds = useRef<Set<string>>(new Set());

  // Render-phase resets: clear dependent state the moment its scope changes,
  // instead of doing it synchronously inside an effect.
  const playCountsKey = user ? `${user.uid}|${userProfile?.partnerId ?? ""}` : "";
  const [prevPlayCountsKey, setPrevPlayCountsKey] = useState(playCountsKey);
  if (playCountsKey !== prevPlayCountsKey) {
    setPrevPlayCountsKey(playCountsKey);
    setPlayCounts({});
  }

  const scopeKey = `${activeGroup?.id ?? ""}::${currentView}`;
  const [prevScopeKey, setPrevScopeKey] = useState(scopeKey);
  if (scopeKey !== prevScopeKey) {
    setPrevScopeKey(scopeKey);
    setIsBulkMode(false);
    setSelectedGameIds([]);
    setSearchQuery("");
    setPlayerFilter("");
    setIsFilterOpen(false);
  }

  useEffect(() => {
    if (!user) return;
    const fetchPref = async () => {
      try {
        const snap = await getDoc(doc(db, "userPreferences", user.uid));
        if (snap.exists() && snap.data().theme) {
          const loadedTheme = snap.data().theme;
          setUserTheme(loadedTheme);
          if (loadedTheme === "dark") document.documentElement.classList.add("dark");
          else document.documentElement.classList.remove("dark");
        } else {
          document.documentElement.classList.remove("dark");
        }
      } catch { /* stored preferences are optional */ } finally { setSettingsLoaded(true); }
    };
    fetchPref();
  }, [user]);

  useEffect(() => {
    if (!user || !settingsLoaded || !userProfile) return;
    const targetUids = [user.uid];
    if (userProfile.isCouple && userProfile.partnerId) {
      targetUids.push(userProfile.partnerId);
    }
    const q = activeGroup === null
      ? query(collection(db, "userGames"), where("userId", "in", targetUids))
      : query(collection(db, "userGames"), where("groupIds", "array-contains", activeGroup.id));

    const unsub = onSnapshot(q, (snap) => {
      setGames(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Game)));
      setGamesLoading(false);
    });
    return () => unsub();
  }, [activeGroup, user, settingsLoaded, userProfile]);

  // Backfill BoardGameGeek scores for games saved before ratings were stored.
  useEffect(() => {
    if (!user) return;

    const missingIds = Array.from(new Set(
      games
        .filter((game) => game.bggId && !(Number.parseFloat(game.rating || "") > 0))
        .map((game) => String(game.bggId))
        .filter((id) => !ratingBackfillIds.current.has(id))
    ));

    if (missingIds.length === 0) return;
    missingIds.forEach((id) => ratingBackfillIds.current.add(id));

    (async () => {
      const ratings: Record<string, string> = {};

      for (let i = 0; i < missingIds.length; i += 20) {
        const chunk = missingIds.slice(i, i + 20);
        try {
          const res = await fetch(`/api/bgg?ids=${chunk.join(',')}`);
          if (!res.ok) continue;
          const data: unknown = await res.json();
          if (!Array.isArray(data)) continue;

          data.forEach((raw) => {
            const item = raw as BggRatingResult;
            const value = typeof item?.rating === 'string' ? item.rating : '';
            if (Number.parseFloat(value) > 0) ratings[String(item.bggId)] = value;
          });
        } catch { /* ignore chunk failures and keep existing card data */ }
      }

      if (Object.keys(ratings).length === 0) return;
      setGames((prev) => prev.map((game) => (
        ratings[String(game.bggId)] ? { ...game, rating: ratings[String(game.bggId)] } : game
      )));
    })();
  }, [games, user]);

  useEffect(() => {
    if (!user) return;

    const targetUids = [user.uid];
    if (userProfile?.isCouple && userProfile.partnerId) targetUids.push(userProfile.partnerId);
    const q = query(collection(db, "gamePlays"), where("userId", "in", targetUids));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const counts: Record<string, number> = {};
      snapshot.docs.forEach((play) => {
        const bggId = play.data().bggId;
        if (bggId != null) {
          const key = String(bggId);
          counts[key] = (counts[key] || 0) + 1;
        }
      });
      setPlayCounts(counts);
    }, (error) => {
      console.error("Failed to load game play counts.", error);
    });

    return () => unsubscribe();
  }, [user, userProfile]);

  // Persist filter/sort preferences to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('boardgame-tracker-searchQuery', searchQuery);
    }
  }, [searchQuery]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('boardgame-tracker-sortOption', sortOption);
    }
  }, [sortOption]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('boardgame-tracker-playerFilter', playerFilter);
    }
  }, [playerFilter]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('boardgame-tracker-viewMode', viewMode);
    }
  }, [viewMode]);

  const toggleTheme = async () => {
    const newTheme = userTheme === "light" ? "dark" : "light";
    setUserTheme(newTheme);
    if (newTheme === "dark") document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
    if (user) await setDoc(doc(db, "userPreferences", user.uid), { theme: newTheme }, { merge: true });
  };

  const selectGroupMobile = (group: Group | null) => { setActiveGroup(group); setCurrentView("library"); setIsSidebarOpen(false); };
  const selectTab = (tab: "recommendations" | "analytics" | "library" | "friends" | "events") => { setActiveGroup(null); setCurrentView(tab); setIsSidebarOpen(false); };
  const toggleBulkSelection = useCallback((gameId: string) => setSelectedGameIds(prev => prev.includes(gameId) ? prev.filter(id => id !== gameId) : [...prev, gameId]), []);
  const handleOpenScoring = useCallback((game: Game) => setScoringGame(game), []);
  const handlePickGame = useCallback((game: Game) => {
    setIsGamePickerOpen(false);
    setScoringGame(game);
  }, []);
  const handleLogScore = useCallback((e: React.MouseEvent, game: Game) => { e.stopPropagation(); setScoringGame(game); }, []);
  const handleAssign = useCallback((e: React.MouseEvent, game: Game) => { e.stopPropagation(); setAssigningGame(game); }, []);

  const handleCreateGroup = async () => {
    const name = prompt(t('home.enterGroupName'));
    if (name) {
      try {
        await addDoc(collection(db, "groups"), { name: name.trim(), ownerId: user?.uid, members: [user?.email || user?.uid], isSystem: false, createdAt: serverTimestamp() });
        toast.success(t('home.created'));
        setIsSidebarOpen(true);
      } catch { toast.error(t('home.failed')); }
    }
  };

  const handleDeleteGroup = async (e: React.MouseEvent, groupId: string, groupName: string) => {
    e.stopPropagation();
    if (confirm(t('home.confirmDeleteGroup', { name: groupName }))) {
      try {
        await deleteDoc(doc(db, "groups", groupId));
        if (activeGroup?.id === groupId) setActiveGroup(null);
        toast.success(t('home.deleted'));
      } catch { /* group already gone */ }
    }
  };

  const handleTogglePin = useCallback(async (e: React.MouseEvent, game: Game) => {
    e.stopPropagation();
    try {
      await updateDoc(doc(db, "userGames", game.id), { isPinned: !game.isPinned });
      toast.success(game.isPinned ? t('gameCard.unpinned') : t('gameCard.pinned'));
    } catch {
      toast.error(t('home.failed'));
    }
  }, [t]);

  const handleDeleteGame = useCallback(async (e: React.MouseEvent, game: Game) => {
    e.stopPropagation();
    if (activeGroup === null) {
      if (confirm(t('home.confirmDeleteLibrary', { name: game.name }))) {
        await deleteDoc(doc(db, "userGames", game.id));
        toast.success(t('home.deleted'));
      }
    } else {
      if (confirm(t('home.confirmRemoveList', { name: game.name }))) {
        await updateDoc(doc(db, "userGames", game.id), { groupIds: (game.groupIds || []).filter((id: string) => id !== activeGroup.id) });
        toast.success(t('home.removed'));
      }
    }
  }, [activeGroup, t]);

  const handleExport = async () => {
    if (user) {
      const snap = await getDocs(query(collection(db, "userGames"), where("userId", "==", user.uid)));
      const data = snap.docs.map(d => {
        const rest: Record<string, unknown> = { ...d.data() };
        delete rest.userId;
        delete rest.ownerNickname;
        delete rest.addedAt;
        delete rest.id;
        delete rest.groupIds;
        return rest;
      });
      await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
      toast.success(t('home.copied'));
    }
  };

  const handleImport = async () => {
    if (!user) return;
    try {
      const text = await navigator.clipboard.readText();
      if (!text) return toast.error(t('home.emptyClipboard'));
      const imported: unknown = JSON.parse(text);
      const batch = writeBatch(db);
      const gamesToImport = Array.isArray(imported) ? imported : [];
      gamesToImport.forEach((raw) => {
        if (typeof raw !== "object" || raw === null) return;
        const game = raw as Partial<Game> & Record<string, unknown>;
        if (game.bggId) {
          batch.set(doc(collection(db, "userGames")), { ...game, userId: user.uid, ownerNickname: userNickname, groupIds: [], addedAt: serverTimestamp() });
        }
      });
      await batch.commit(); toast.success(t('home.imported'));
    } catch { toast.error(t('home.invalidJson')); }
  };

  const filtersKey = `${searchQuery}|${playerFilter}|${sortOption}|${activeGroup?.id ?? ""}|${currentView}`;
  const [prevFiltersKey, setPrevFiltersKey] = useState(filtersKey);
  if (filtersKey !== prevFiltersKey) {
    setPrevFiltersKey(filtersKey);
    setVisibleGameCount(GAMES_PER_BATCH);
  }

  const { processedGames, parentGamesToRender, expansionsByBaseId } = useMemo(() => {
    const search = searchQuery.trim().toLowerCase();
    const playerCount = Number.parseInt(playerFilter, 10);

    let processed = games;
    if (search) processed = processed.filter(game => game.name.toLowerCase().includes(search));
    if (playerFilter) {
      processed = processed.filter(game =>
        playerCount >= Number.parseInt(game.minPlayers || "0", 10) &&
        playerCount <= Number.parseInt(game.maxPlayers || "99", 10)
      );
    }

    const baseGames = processed.filter(game => !game.isExpansion);
    const baseGameIds = new Set(baseGames.map(game => game.bggId));
    const orphanedExpansions = processed.filter(game => game.isExpansion && !baseGameIds.has(game.baseGameId ?? ""));

    const expansionsByBaseId = new Map<string, Game[]>();
    processed.forEach(game => {
      if (!game.isExpansion || !game.baseGameId) return;
      const list = expansionsByBaseId.get(game.baseGameId);
      if (list) list.push(game);
      else expansionsByBaseId.set(game.baseGameId, [game]);
    });

    const parents = [...baseGames, ...orphanedExpansions];
    parents.sort((a, b) => {
      if (Boolean(a.isPinned) !== Boolean(b.isPinned)) return a.isPinned ? -1 : 1;
      return sortOption === "alpha"
        ? a.name.localeCompare(b.name)
        : sortOption === "year"
          ? Number.parseInt(b.year || "0", 10) - Number.parseInt(a.year || "0", 10)
          : sortOption === "plays"
            ? (playCounts[String(b.bggId)] || 0) - (playCounts[String(a.bggId)] || 0)
            : (b.addedAt?.seconds || 0) - (a.addedAt?.seconds || 0);
    });

    return { processedGames: processed, parentGamesToRender: parents, expansionsByBaseId };
  }, [games, searchQuery, playerFilter, sortOption, playCounts]);

  const visibleGames = useMemo(
    () => parentGamesToRender.slice(0, visibleGameCount),
    [parentGamesToRender, visibleGameCount]
  );
  const hasMoreGames = visibleGameCount < parentGamesToRender.length;
  const loadMoreGames = useCallback(
    () => setVisibleGameCount(count => Math.min(count + GAMES_PER_BATCH, parentGamesToRender.length)),
    [parentGamesToRender.length]
  );

  useEffect(() => {
    if (!hasMoreGames) return;
    const sentinel = loadMoreRef.current;
    if (!sentinel || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) loadMoreGames();
    }, { rootMargin: "800px 0px" });

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMoreGames, visibleGameCount, loadMoreGames, currentView, viewMode]);

  const pickRandomGame = () => { if (parentGamesToRender.length === 0) return toast.error(t('home.noMatches')); setRandomGameOpen(parentGamesToRender[Math.floor(Math.random() * parentGamesToRender.length)]); };

  const renderLoadMore = () => hasMoreGames ? (
    <div ref={loadMoreRef} className="flex justify-center py-8 md:py-10">
      <button onClick={loadMoreGames} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-600 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700">
        <ChevronDown size={16} />
        {t('home.loadMore')} ({parentGamesToRender.length - visibleGameCount})
      </button>
    </div>
  ) : null;

  if (authLoading || (user && !settingsLoaded) || gamesLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900 transition-colors duration-300">
        <div className="w-48 h-48 flex items-center justify-center">
          <DotLottieReact
            src="/LoadingCat.lottie"
            loop
            autoplay
          />
        </div>
        <h2 suppressHydrationWarning className="mt-4 text-lg font-black text-slate-700 dark:text-slate-300 tracking-tight animate-pulse">
          {t('common.loading')}
        </h2>
      </div>
    );
  }

  if (!user) return <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4"><div className="bg-white p-8 rounded-xl shadow-xl border border-slate-200 max-w-sm w-full text-center"><Library className="mx-auto text-indigo-600 mb-4" size={56} /><h1 className="text-3xl font-black text-slate-900 mb-2">BG Tracker</h1><button suppressHydrationWarning onClick={() => signInWithPopup(auth, googleProvider)} className="w-full bg-indigo-600 text-white font-bold py-3 rounded-lg mt-8 shadow-md">
    {t('home.signIn')}
  </button></div></div>;

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const scrollTop = e.currentTarget.scrollTop;
    setIsScrolled(scrollTop > 15);

    // Hide/show navs on scroll down/up (small threshold avoids jitter)
    const diff = scrollTop - lastScrollTopRef.current;
    if (scrollTop > 50 && diff > 6) {
      setShowMobileNav(false);
    } else if (diff < -6 || scrollTop <= 50) {
      setShowMobileNav(true);
    }
    lastScrollTopRef.current = scrollTop;
  };

  return (
    <div className="h-screen flex flex-col md:flex-row bg-slate-50 dark:bg-slate-900 transition-colors duration-300 overflow-hidden">
      {/* Mobile Top Navbar */}
      <div
        className={`md:hidden relative z-30 overflow-hidden shrink-0 bg-white dark:bg-slate-800 border-b transition-[max-height,padding,opacity,transform,box-shadow] duration-300 ease-out ${
          showMobileNav
            ? "max-h-24 p-3 opacity-100 translate-y-0 border-slate-200 dark:border-slate-700 shadow-sm"
            : "max-h-0 p-0 opacity-0 -translate-y-full border-transparent shadow-none"
        }`}
      >
        <div className="flex items-center justify-between">
          <button
            onClick={() => selectTab("library")}
            className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2 hover:opacity-80 transition-opacity outline-none"
          >
            <Library size={22} className="text-indigo-600 dark:text-indigo-400" /> BG Tracker
          </button>

          <div className="flex items-center gap-2">
            <button onClick={toggleTheme} className="p-1.5 bg-slate-100 dark:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-300 transition-colors">
              {userTheme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <button onClick={() => setIsSidebarOpen(true)} aria-label={t("sidebar.more")} className="p-1.5 bg-slate-100 dark:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-300 transition-colors">
              <Menu size={20} />
            </button>
          </div>
        </div>
      </div>

      {isSidebarOpen && <div className="fixed inset-0 bg-slate-900/50 z-40 md:hidden backdrop-blur-sm" onClick={() => setIsSidebarOpen(false)} />}

      <Sidebar currentView={currentView} isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} selectGroupMobile={selectGroupMobile} selectTab={selectTab} handleCreateGroup={handleCreateGroup} handleDeleteGroup={handleDeleteGroup} handleExport={handleExport} handleImport={handleImport} />

      <main className="flex-1 overflow-y-auto flex flex-col relative isolate pb-24 md:pb-0" onScroll={handleScroll}>
        {currentView === "recommendations" ? <div className="p-4 md:p-8 max-w-7xl mx-auto w-full"><RecommendationsTab userGames={activeGroup === null ? games : EMPTY_GAMES} /></div>
          : currentView === "analytics" ? <div className="p-4 md:p-8 max-w-7xl mx-auto w-full"><AnalyticsTab /></div>
          : currentView === "friends" ? <div className="p-4 md:p-8 max-w-7xl mx-auto w-full"><FriendsTab /></div> : currentView === "events" ? <div className="p-4 md:p-8 max-w-7xl mx-auto w-full"><GameNightsTab userGames={parentGamesToRender} /></div>
              : (
                <>
                  <div className={`bg-slate-50/95 dark:bg-slate-900/95 backdrop-blur z-20 sticky top-0 border-b border-slate-200 dark:border-slate-800 transition-[transform,opacity,box-shadow,padding] duration-300 ease-out ${isScrolled ? "shadow-sm" : ""} ${showMobileNav ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0 pointer-events-none md:translate-y-0 md:opacity-100 md:pointer-events-auto"} p-3 md:p-8 pb-3 md:pb-6`}>
                    <div className="max-w-7xl mx-auto flex flex-col gap-2 md:gap-3">
                      <header className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-2 md:gap-4 mb-0 md:mb-2">
                        <div>
                          <h2 className="text-xl md:text-3xl font-black text-slate-900 dark:text-white">{activeGroup === null ? t('home.allMyGames') : activeGroup.name}</h2>
                          <p className="text-xs md:text-sm text-slate-600 dark:text-slate-400 font-medium mt-0.5 md:mt-1">{t('home.gameCount', { count: processedGames.length })}</p>
                        </div>
                        <div className="flex flex-wrap w-full xl:w-auto gap-2 md:gap-3">
                          <button onClick={toggleTheme} className="hidden md:flex flex-none bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 p-2 md:p-3 rounded-xl border border-slate-300 dark:border-slate-600 shadow-sm transition items-center justify-center">
                            {userTheme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
                          </button>

                          {isBulkMode ? (
                            <>
                              <button onClick={() => setIsBulkMode(false)} className="flex-1 sm:flex-none bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold px-3 py-2 md:px-4 md:py-3 text-sm md:text-base rounded-xl transition">{t('home.cancelBulk')}</button>
                              <button disabled={selectedGameIds.length === 0} onClick={() => setIsBulkAssignModalOpen(true)} className="flex-1 sm:flex-none bg-indigo-600 disabled:bg-indigo-300 dark:disabled:bg-indigo-800 text-white font-bold px-3 py-2 md:px-4 md:py-3 text-sm md:text-base rounded-xl flex items-center justify-center gap-1.5 md:gap-2 shadow-sm transition"><ListChecks size={18} className="md:w-5 md:h-5" /> {t('home.assign')}</button>
                            </>
                          ) : (
                            <>
                              <button onClick={() => setIsBulkMode(true)} className="flex-1 sm:flex-none bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold px-3 py-2 md:px-4 md:py-3 text-sm md:text-base rounded-xl flex items-center justify-center gap-1.5 md:gap-2 border border-slate-300 dark:border-slate-600 shadow-sm transition"><ListChecks size={18} /> <span className="hidden sm:inline">{t('home.bulkEdit')}</span></button>
                              {activeGroup && !activeGroup.isSystem && activeGroup.ownerId === user.uid && <button onClick={() => setInvitingGroup(activeGroup)} className="flex-1 sm:flex-none bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 font-bold px-3 py-2 md:px-4 md:py-3 text-sm md:text-base rounded-xl flex items-center justify-center border border-indigo-200 dark:border-indigo-800"><UserPlus size={18} /> <span className="hidden sm:inline">{t('home.invite')}</span></button>}
                              {activeGroup && <button onClick={() => setLibraryModalGroup(activeGroup)} className="flex-1 sm:flex-none bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold px-3 py-2 md:px-4 md:py-3 text-sm md:text-base rounded-xl flex items-center justify-center border border-slate-300 dark:border-slate-600"><BookOpen size={18} /> <span className="hidden sm:inline">{t('home.addFromLibrary')}</span></button>}
                              <button onClick={() => setIsSearchOpen(true)} className="flex-1 sm:flex-none bg-indigo-600 text-white font-bold px-3 py-2 md:px-4 md:py-3 text-sm md:text-base rounded-xl flex items-center justify-center gap-1.5"><Plus size={18} /> <span className="hidden sm:inline">{t('home.searchNewGame')}</span><span className="sm:hidden">{t('home.searchNew')}</span></button>
                            </>
                          )}
                        </div>
                      </header>

                      {games.length > 0 && !isBulkMode && (
                        <div className="flex flex-col gap-2">
                          <button onClick={() => setIsFilterOpen(!isFilterOpen)} className="md:hidden flex items-center justify-between px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm text-slate-700 dark:text-slate-300 font-bold text-sm">
                            <div className="flex items-center gap-2"><Filter size={16} /> {t('home.filtersSorting')}</div>
                            {isFilterOpen ? <X size={16} /> : <ArrowDownAZ size={16} />}
                          </button>
                          <div className={`${isFilterOpen ? "flex" : "hidden"} md:flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2 md:gap-3 bg-white dark:bg-slate-800 p-2.5 md:p-2 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm`}>
                            <div className="flex-1 relative"><Filter size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" /><input type="text" placeholder={t('home.filterByName')} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 outline-none" /></div>
                            <div className="w-full sm:w-32 relative"><Users size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" /><input type="number" placeholder={t('home.players')} value={playerFilter} onChange={(e) => setPlayerFilter(e.target.value)} min="1" max="99" className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 outline-none" /></div>
                            <div className="w-full sm:w-44 relative"><ArrowDownAZ size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" /><select value={sortOption} onChange={(e) => setSortOption(e.target.value as typeof sortOption)} className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium text-slate-900 dark:text-white outline-none appearance-none"><option value="recent">{t('home.recentlyAdded')}</option><option value="alpha">{t('home.alphabetical')}</option><option value="year">{t('home.releaseYear')}</option><option value="plays">{t('home.mostPlayed')}</option></select></div>
                            <button onClick={pickRandomGame} className="w-full sm:w-auto bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-400 border border-amber-200 dark:border-amber-800 px-3 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-1.5 transition"><Shuffle size={16} /> {t('home.whatToPlay')}</button>
                            
                            {/* View Toggle Button - Cycles through Grid -> Compact -> Image Shape */}
                            <button
                              onClick={() => setViewMode(prev => prev === "grid" ? "compact" : prev === "compact" ? "imageShape" : "grid")}
                              className="p-2 bg-slate-100 dark:bg-slate-700/60 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-slate-700 dark:text-slate-300 transition flex items-center justify-center border border-slate-200 dark:border-slate-600 shrink-0"
                              title={viewMode === "grid" ? "Switch to Compact View" : viewMode === "compact" ? "Switch to Image Shape View" : "Switch to Grid View"}
                            >
                              {viewMode === "grid" ? <LayoutList size={18} /> : viewMode === "compact" ? <LayoutGrid size={18} /> : <ImageIcon size={18} />}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full">
                    {parentGamesToRender.length === 0 ? <div className="flex items-center justify-center h-64 text-slate-500 dark:text-slate-400 font-medium">{t('home.noMatchesFilter')}</div>
                      : viewMode === "grid" ? (
                        /* Default Card Grid View */
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 md:gap-4 items-start">
                          {visibleGames.map((game, index) => {
                            const hasEditPermission = game.userId === user.uid || (userProfile?.isCouple && game.userId === userProfile.partnerId);

                            return (
                              <GameCard
                                key={game.id} game={game} userUid={user.uid}
                                isBulkMode={isBulkMode} isSelected={selectedGameIds.includes(game.id)}
                                iOwnIt={!!hasEditPermission}
                                activeGroup={activeGroup} index={index}
                                expansions={expansionsByBaseId.get(game.bggId) || EMPTY_GAMES}
                                userLists={userGroups}
                                onToggleBulk={toggleBulkSelection} onOpenDetails={setDetailsGame} onDelete={handleDeleteGame}
                                onLogScore={handleLogScore}
                                onAssign={handleAssign}
                                onTogglePin={handleTogglePin}
                              />
                            );
                          })}
                        </div>
                      ) : viewMode === "imageShape" ? (
                        /* Image Shape View - Masonry layout based on box aspect ratio */
                        <ImageShapeView
                          games={visibleGames}
                          onOpenDetails={setDetailsGame}
                          onLogScore={handleOpenScoring}
                        />
                      ) : (
                        /* Compact Icon View with Only Log Score Action */
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          {visibleGames.map((game) => (
                            <div
                              key={game.id}
                              onClick={() => setDetailsGame(game)}
                              className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xs hover:shadow-md transition cursor-pointer group"
                            >
                              <div className="flex items-center gap-3 min-w-0 pr-2">
                                {game.image ? (
                                  <NextImage
                                    src={game.image}
                                    alt={game.name}
                                    width={48}
                                    height={48}
                                    className="w-12 h-12 object-cover rounded-lg border border-slate-100 dark:border-slate-700 shrink-0"
                                  />
                                ) : (
                                  <div className="w-12 h-12 bg-slate-100 dark:bg-slate-700 rounded-lg flex items-center justify-center text-slate-400 font-bold text-xs shrink-0">
                                    N/A
                                  </div>
                                )}
                                <div className="min-w-0">
                                  <h4 className="font-bold text-sm text-slate-900 dark:text-white truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                    {game.name}
                                  </h4>
                                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate">
                                    {game.minPlayers || "?"}-{game.maxPlayers || "?"} players • {game.playTime || "?"} mins
                                  </p>
                                </div>
                              </div>

                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setScoringGame(game);
                                }}
                                className="p-2.5 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-600 dark:hover:bg-indigo-600 text-indigo-600 dark:text-indigo-400 hover:text-white dark:hover:text-white rounded-xl transition border border-indigo-100 dark:border-indigo-900 shrink-0"
                                title="Log Score"
                              >
                                <Trophy size={16} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    {renderLoadMore()}
                  </div>
                </>
              )}
      </main>

      <MobileBottomNav currentView={currentView} onSelect={selectTab} onLogScore={() => setIsGamePickerOpen(true)} />

      {isGamePickerOpen && <GamePickerModal games={games} onPick={handlePickGame} onClose={() => setIsGamePickerOpen(false)} />}
      {isSearchOpen && <SearchModal onClose={() => setIsSearchOpen(false)} />}
      {assigningGame && <AssignModal game={assigningGame} onClose={() => setAssigningGame(null)} />}
      {isBulkAssignModalOpen && <BulkAssignModal gameIds={selectedGameIds} onClose={() => setIsBulkAssignModalOpen(false)} onClearSelection={() => { setIsBulkMode(false); setSelectedGameIds([]); }} />}
      {invitingGroup && <InviteModal group={invitingGroup} onClose={() => setInvitingGroup(null)} />}
      {libraryModalGroup && <AddFromLibraryModal group={libraryModalGroup} onClose={() => setLibraryModalGroup(null)} />}
      {scoringGame && <ScoresModal game={scoringGame} onClose={() => setScoringGame(null)} />}
      {randomGameOpen && <RandomGameModal game={randomGameOpen} onClose={() => setRandomGameOpen(null)} />}
      {detailsGame && <GameDetailsModal key={detailsGame.id} game={detailsGame} onClose={() => setDetailsGame(null)} />}
    </div>
  );
}