"use client";

import { useAuthGroup } from "@/components/AuthGroupProvider";
import { signInWithPopup, googleProvider, auth, db } from "@/lib/firebase";
import { useState, useEffect } from "react";
import { collection, query, where, onSnapshot, doc, updateDoc, deleteDoc, writeBatch, getDocs, getDoc, setDoc, serverTimestamp, addDoc } from "firebase/firestore";
import { SearchModal } from "@/components/SearchModal";
import { Library, Menu, Plus, UserPlus, BookOpen, ListChecks, Filter, Users, ArrowDownAZ, Shuffle, X, Sun, Moon, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next"; // NEW

// Extracted Components
import { Sidebar } from "@/components/Sidebar";
import { GameCard } from "@/components/GameCard";
import { RecommendationsTab } from "@/components/views/RecommendationsTab";
import { AnalyticsTab } from "@/components/views/AnalyticsTab";
import { FriendsTab } from "@/components/views/FriendsTab";
import { GameNightsTab } from "@/components/views/GameNightsTab";

// Extracted Modals
import { GameDetailsModal } from "@/components/modals/GameDetailsModal";
import { RandomGameModal } from "@/components/modals/RandomGameModal";
import { ScoresModal } from "@/components/modals/ScoresModal";
import { AssignModal } from "@/components/modals/AssignModal";
import { BulkAssignModal } from "@/components/modals/BulkAssignModal";
import { InviteModal } from "@/components/modals/InviteModal";
import { AddFromLibraryModal } from "@/components/modals/AddFromLibraryModal";

export default function Home() {
  const { user, userNickname, userProfile, loading: authLoading, activeGroup, setActiveGroup } = useAuthGroup();
  const { t } = useTranslation(); // NEW

  const [games, setGames] = useState<any[]>([]);
  const [currentView, setCurrentView] = useState<"library" | "recommendations" | "analytics" | "friends" | "events">("library");
  const [userTheme, setUserTheme] = useState("light");
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [sortOption, setSortOption] = useState<"recent" | "alpha" | "year">("recent");
  const [playerFilter, setPlayerFilter] = useState<string>("");
  const [isScrolled, setIsScrolled] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [assigningGame, setAssigningGame] = useState<any | null>(null);
  const [scoringGame, setScoringGame] = useState<any | null>(null);
  const [detailsGame, setDetailsGame] = useState<any | null>(null);
  const [invitingGroup, setInvitingGroup] = useState<any | null>(null);
  const [libraryModalGroup, setLibraryModalGroup] = useState<any | null>(null);
  const [randomGameOpen, setRandomGameOpen] = useState<any | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const [isBulkMode, setIsBulkMode] = useState(false);
  const [selectedGameIds, setSelectedGameIds] = useState<string[]>([]);
  const [isBulkAssignModalOpen, setIsBulkAssignModalOpen] = useState(false);

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
      } catch (err) { } finally { setSettingsLoaded(true); }
    };
    fetchPref();
  }, [user]);

  useEffect(() => {
    if (!user || !settingsLoaded || !userProfile) return;
    let targetUids = [user.uid];
    if (userProfile.isCouple && userProfile.partnerId) {
      targetUids.push(userProfile.partnerId);
    }
    let q = activeGroup === null
      ? query(collection(db, "userGames"), where("userId", "in", targetUids))
      : query(collection(db, "userGames"), where("groupIds", "array-contains", activeGroup.id));

    const unsub = onSnapshot(q, (snap) => setGames(snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))));
    return () => unsub();
  }, [activeGroup, user, settingsLoaded, userProfile]);

  useEffect(() => { setIsBulkMode(false); setSelectedGameIds([]); setSearchQuery(""); setPlayerFilter(""); setIsFilterOpen(false); }, [activeGroup, currentView]);

  const toggleTheme = async () => {
    const newTheme = userTheme === "light" ? "dark" : "light";
    setUserTheme(newTheme);
    if (newTheme === "dark") document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
    if (user) await setDoc(doc(db, "userPreferences", user.uid), { theme: newTheme }, { merge: true });
  };

  const selectGroupMobile = (group: any | null) => { setActiveGroup(group); setCurrentView("library"); setIsSidebarOpen(false); };
  const selectTab = (tab: "recommendations" | "analytics" | "library" | "friends" | "events") => { setActiveGroup(null); setCurrentView(tab); setIsSidebarOpen(false); };
  const toggleBulkSelection = (gameId: string) => setSelectedGameIds(prev => prev.includes(gameId) ? prev.filter(id => id !== gameId) : [...prev, gameId]);

  const handleCreateGroup = async () => {
    const name = prompt(t('home.enterGroupName'));
    if (name) {
      try {
        await addDoc(collection(db, "groups"), { name: name.trim(), ownerId: user?.uid, members: [user?.email || user?.uid], isSystem: false, createdAt: serverTimestamp() });
        toast.success(t('home.created'));
        setIsSidebarOpen(true);
      } catch (error) { toast.error(t('home.failed')); }
    }
  };

  const handleDeleteGroup = async (e: React.MouseEvent, groupId: string, groupName: string) => {
    e.stopPropagation();
    if (confirm(t('home.confirmDeleteGroup', { name: groupName }))) {
      try {
        await deleteDoc(doc(db, "groups", groupId));
        if (activeGroup?.id === groupId) setActiveGroup(null);
        toast.success(t('home.deleted'));
      } catch (error) { }
    }
  };

  const handleDeleteGame = async (e: React.MouseEvent, game: any) => {
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
  };

  const handleExport = async () => {
    if (user) {
      const snap = await getDocs(query(collection(db, "userGames"), where("userId", "==", user.uid)));
      const data = snap.docs.map(d => { const { userId, ownerNickname, addedAt, id, groupIds, ...rest } = d.data(); return rest; });
      await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
      toast.success(t('home.copied'));
    }
  };

  const handleImport = async () => {
    if (!user) return;
    try {
      const text = await navigator.clipboard.readText();
      if (!text) return toast.error(t('home.emptyClipboard'));
      const imported = JSON.parse(text);
      const batch = writeBatch(db);
      imported.forEach((g: any) => { if (g.bggId) batch.set(doc(collection(db, "userGames")), { ...g, userId: user.uid, ownerNickname: userNickname, groupIds: [], addedAt: serverTimestamp() }); });
      await batch.commit(); toast.success(t('home.imported'));
    } catch (err) { toast.error(t('home.invalidJson')); }
  };

  let processedGames = [...games];
  if (searchQuery.trim()) processedGames = processedGames.filter(g => g.name.toLowerCase().includes(searchQuery.toLowerCase()));
  if (playerFilter) processedGames = processedGames.filter(g => parseInt(playerFilter) >= parseInt(g.minPlayers || "0") && parseInt(playerFilter) <= parseInt(g.maxPlayers || "99"));

  const baseGames = processedGames.filter(g => !g.isExpansion);
  const orphanedExpansions = processedGames.filter(g => g.isExpansion && !baseGames.some(bg => bg.bggId === g.baseGameId));
  const parentGamesToRender = [...baseGames, ...orphanedExpansions];

  parentGamesToRender.sort((a, b) => sortOption === "alpha" ? a.name.localeCompare(b.name) : sortOption === "year" ? parseInt(b.year || "0") - parseInt(a.year || "0") : (b.addedAt?.seconds || 0) - (a.addedAt?.seconds || 0));

  const pickRandomGame = () => { if (parentGamesToRender.length === 0) return toast.error(t('home.noMatches')); setRandomGameOpen(parentGamesToRender[Math.floor(Math.random() * parentGamesToRender.length)]); };

  if (authLoading || (user && !settingsLoaded)) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900 transition-colors duration-300">
        <div className="relative flex items-center justify-center w-20 h-20">
          <div className="absolute inset-0 rounded-full border-4 border-indigo-200 dark:border-indigo-900/50 animate-[ping_1.5s_cubic-bezier(0,0,0.2,1)_infinite] opacity-75"></div>
          <div className="bg-white dark:bg-slate-800 p-3 rounded-full shadow-lg relative z-10 border border-slate-100 dark:border-slate-700">
            <Loader2 className="animate-spin text-indigo-600 dark:text-indigo-400" size={32} />
          </div>
        </div>
        <h2 suppressHydrationWarning className="mt-6 text-lg font-black text-slate-700 dark:text-slate-300 tracking-tight animate-pulse">
          {t('common.loading')}
        </h2>
      </div>
    );
  }

  if (!user) return <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4"><div className="bg-white p-8 rounded-xl shadow-xl border border-slate-200 max-w-sm w-full text-center"><Library className="mx-auto text-indigo-600 mb-4" size={56} /><h1 className="text-3xl font-black text-slate-900 mb-2">BG Tracker</h1><button suppressHydrationWarning onClick={() => signInWithPopup(auth, googleProvider)} className="w-full bg-indigo-600 text-white font-bold py-3 rounded-lg mt-8 shadow-md">
    {t('home.signIn')}
  </button></div></div>;

  return (
    <div className="h-screen flex flex-col md:flex-row bg-slate-50 dark:bg-slate-900 transition-colors duration-300 overflow-hidden">
      <div className="md:hidden bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 p-3 flex items-center justify-between shrink-0 z-20 shadow-sm transition-colors">
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
          <button onClick={() => setIsSidebarOpen(true)} className="p-1.5 bg-slate-100 dark:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-300 transition-colors"><Menu size={22} /></button>
        </div>
      </div>

      {isSidebarOpen && <div className="fixed inset-0 bg-slate-900/50 z-40 md:hidden backdrop-blur-sm" onClick={() => setIsSidebarOpen(false)} />}

      <Sidebar currentView={currentView} isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} selectGroupMobile={selectGroupMobile} selectTab={selectTab} handleCreateGroup={handleCreateGroup} handleDeleteGroup={handleDeleteGroup} handleExport={handleExport} handleImport={handleImport} />

      <main className="flex-1 overflow-y-auto flex flex-col relative" onScroll={(e) => setIsScrolled(e.currentTarget.scrollTop > 15)}>
        {currentView === "recommendations" ? <div className="p-4 md:p-8 max-w-7xl mx-auto w-full"><RecommendationsTab userGames={activeGroup === null ? games : []} /></div>
          : currentView === "analytics" ? <div className="p-4 md:p-8 max-w-7xl mx-auto w-full"><AnalyticsTab /></div>
            : currentView === "friends" ? <div className="p-4 md:p-8 max-w-7xl mx-auto w-full"><FriendsTab /></div> : currentView === "events" ? <div className="p-4 md:p-8 max-w-7xl mx-auto w-full"><GameNightsTab userGames={parentGamesToRender} /></div>
              : (
                <>
                  <div className={`bg-slate-50/95 dark:bg-slate-900/95 backdrop-blur z-20 sticky top-0 border-b border-slate-200 dark:border-slate-800 transition-all duration-300 ${isScrolled ? "shadow-sm" : ""} p-3 md:p-8 pb-3 md:pb-6`}>
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
                            <div className="w-full sm:w-44 relative"><ArrowDownAZ size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" /><select value={sortOption} onChange={(e: any) => setSortOption(e.target.value)} className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium text-slate-900 dark:text-white outline-none appearance-none"><option value="recent">{t('home.recentlyAdded')}</option><option value="alpha">{t('home.alphabetical')}</option><option value="year">{t('home.releaseYear')}</option></select></div>
                            <button onClick={pickRandomGame} className="w-full sm:w-auto bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-400 border border-amber-200 dark:border-amber-800 px-3 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-1.5 transition"><Shuffle size={16} /> {t('home.whatToPlay')}</button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full">
                    {parentGamesToRender.length === 0 ? <div className="flex items-center justify-center h-64 text-slate-500 dark:text-slate-400 font-medium">{t('home.noMatchesFilter')}</div>
                      : (
                        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 md:gap-5 items-start">
                          {parentGamesToRender.map((game, index) => {
                            const gameExpansions = processedGames.filter(g => g.isExpansion && g.baseGameId === game.bggId);
                            const hasEditPermission = game.userId === user.uid || (userProfile?.isCouple && game.userId === userProfile.partnerId);

                            return (
                              <GameCard
                                key={game.id} game={game} userUid={user.uid}
                                isBulkMode={isBulkMode} isSelected={selectedGameIds.includes(game.id)}
                                iOwnIt={hasEditPermission}
                                activeGroup={activeGroup} index={index}
                                expansions={gameExpansions}
                                onToggleBulk={toggleBulkSelection} onOpenDetails={setDetailsGame} onDelete={handleDeleteGame}
                                onLogScore={(e, g) => { e.stopPropagation(); setScoringGame(g); }}
                                onAssign={(e, g) => { e.stopPropagation(); setAssigningGame(g); }}
                              />
                            );
                          })}
                        </div>
                      )}
                  </div>
                </>
              )}
      </main>

      {isSearchOpen && <SearchModal onClose={() => setIsSearchOpen(false)} />}
      {assigningGame && <AssignModal game={assigningGame} onClose={() => setAssigningGame(null)} />}
      {isBulkAssignModalOpen && <BulkAssignModal gameIds={selectedGameIds} onClose={() => setIsBulkAssignModalOpen(false)} onClearSelection={() => { setIsBulkMode(false); setSelectedGameIds([]); }} />}
      {invitingGroup && <InviteModal group={invitingGroup} onClose={() => setInvitingGroup(null)} />}
      {libraryModalGroup && <AddFromLibraryModal group={libraryModalGroup} onClose={() => setLibraryModalGroup(null)} />}
      {scoringGame && <ScoresModal game={scoringGame} onClose={() => setScoringGame(null)} />}
      {randomGameOpen && <RandomGameModal game={randomGameOpen} onClose={() => setRandomGameOpen(null)} />}
      {detailsGame && <GameDetailsModal game={detailsGame} onClose={() => setDetailsGame(null)} />}
    </div>
  );
}