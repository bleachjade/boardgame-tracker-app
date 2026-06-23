"use client";

import { useAuthGroup } from "@/components/AuthGroupProvider";
import { signInWithPopup, googleProvider, auth, db } from "@/lib/firebase";
import { useState, useEffect } from "react";
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, doc, updateDoc, deleteDoc, writeBatch, getDocs } from "firebase/firestore";
import { SearchModal } from "@/components/SearchModal";
import { Library, Menu, Plus, UserPlus, BookOpen, ListChecks, Filter, Users, ArrowDownAZ, Shuffle } from "lucide-react";
import toast from "react-hot-toast";

// Extracted Components
import { Sidebar } from "@/components/Sidebar";
import { GameCard } from "@/components/GameCard";
import { RecommendationsTab } from "@/components/views/RecommendationsTab";
import { AnalyticsTab } from "@/components/views/AnalyticsTab";

// Extracted Modals
import { GameDetailsModal } from "@/components/modals/GameDetailsModal";
import { RandomGameModal } from "@/components/modals/RandomGameModal";
import { ScoresModal } from "@/components/modals/ScoresModal";
import { AssignModal } from "@/components/modals/AssignModal";
import { BulkAssignModal } from "@/components/modals/BulkAssignModal";
import { InviteModal } from "@/components/modals/InviteModal";
import { AddFromLibraryModal } from "@/components/modals/AddFromLibraryModal";

export default function Home() {
  const { user, userNickname, loading, activeGroup, setActiveGroup } = useAuthGroup();
  const [games, setGames] = useState<any[]>([]);

  // VIEW & FILTER STATE
  const [currentView, setCurrentView] = useState<"library" | "recommendations" | "analytics">("library");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOption, setSortOption] = useState<"recent" | "alpha" | "year">("recent");
  const [playerFilter, setPlayerFilter] = useState<string>("");
  const [isScrolled, setIsScrolled] = useState(false);

  // MODAL STATE
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [assigningGame, setAssigningGame] = useState<any | null>(null);
  const [scoringGame, setScoringGame] = useState<any | null>(null);
  const [detailsGame, setDetailsGame] = useState<any | null>(null);
  const [invitingGroup, setInvitingGroup] = useState<any | null>(null);
  const [libraryModalGroup, setLibraryModalGroup] = useState<any | null>(null);
  const [randomGameOpen, setRandomGameOpen] = useState<any | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // BULK STATE
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [selectedGameIds, setSelectedGameIds] = useState<string[]>([]);
  const [isBulkAssignModalOpen, setIsBulkAssignModalOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    let q = activeGroup === null
      ? query(collection(db, "userGames"), where("userId", "==", user.uid))
      : query(collection(db, "userGames"), where("groupIds", "array-contains", activeGroup.id));

    const unsub = onSnapshot(q, (snap) => setGames(snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))));
    return () => unsub();
  }, [activeGroup, user]);

  useEffect(() => {
    setIsBulkMode(false);
    setSelectedGameIds([]);
    setSearchQuery("");
    setPlayerFilter("");
  }, [activeGroup, currentView]);

  // --- ACTIONS ---
  const selectGroupMobile = (group: any | null) => { setActiveGroup(group); setCurrentView("library"); setIsSidebarOpen(false); };
  const selectTab = (tab: "recommendations" | "analytics" | "library") => { setActiveGroup(null); setCurrentView(tab); setIsSidebarOpen(false); };
  const toggleBulkSelection = (gameId: string) => setSelectedGameIds(prev => prev.includes(gameId) ? prev.filter(id => id !== gameId) : [...prev, gameId]);

  const handleCreateGroup = async () => {
    const name = prompt("Enter a name for your new friend group:");
    if (!name || !name.trim()) return;
    try {
      await addDoc(collection(db, "groups"), { name: name.trim(), ownerId: user?.uid, members: [user?.email || user?.uid], isSystem: false, createdAt: serverTimestamp() });
      toast.success(`Group "${name}" created!`);
      setIsSidebarOpen(true);
    } catch (error) { toast.error("Failed to create group."); }
  };

  const handleDeleteGroup = async (e: React.MouseEvent, groupId: string, groupName: string) => {
    e.stopPropagation();
    if (!confirm(`Are you sure you want to delete "${groupName}"?`)) return;
    try { await deleteDoc(doc(db, "groups", groupId)); if (activeGroup?.id === groupId) setActiveGroup(null); toast.success("Deleted!"); } catch (error) { }
  };

  const handleDeleteGame = async (e: React.MouseEvent, game: any) => {
    e.stopPropagation();
    if (activeGroup === null) {
      if (!confirm(`Permanently delete "${game.name}" from your entire library?`)) return;
      try { await deleteDoc(doc(db, "userGames", game.id)); toast.success("Deleted!"); } catch (error) { }
    } else {
      if (!confirm(`Remove "${game.name}" from "${activeGroup.name}"?`)) return;
      try {
        const newGroupIds = (game.groupIds || []).filter((id: string) => id !== activeGroup.id);
        await updateDoc(doc(db, "userGames", game.id), { groupIds: newGroupIds });
        toast.success("Removed!");
      } catch (error) { }
    }
  };

  const handleExport = async () => {
    if (!user) return;
    try {
      const q = query(collection(db, "userGames"), where("userId", "==", user.uid));
      const snap = await getDocs(q);
      const data = snap.docs.map(d => { const { userId, ownerNickname, addedAt, id, groupIds, ...rest } = d.data(); return rest; });
      await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
      toast.success("Library copied to clipboard!");
    } catch(err) { toast.error("Failed to copy to clipboard."); }
  };

  const handleImport = async () => {
    if (!user) return;
    try {
      const text = await navigator.clipboard.readText();
      if (!text) return toast.error("Your clipboard is empty.");
      const imported = JSON.parse(text);
      if (!Array.isArray(imported)) throw new Error("Invalid format");
      const batch = writeBatch(db);
      let count = 0;
      imported.forEach((game: any) => {
        if (!game.bggId) return; 
        batch.set(doc(collection(db, "userGames")), { ...game, userId: user.uid, ownerNickname: userNickname, groupIds: [], addedAt: serverTimestamp() });
        count++;
      });
      await batch.commit();
      toast.success(`Successfully imported ${count} games from clipboard!`);
    } catch(err) { toast.error("Failed to parse clipboard data."); }
  };

  // --- FILTER & SORT ENGINE ---
  let processedGames = [...games];
  if (searchQuery.trim()) processedGames = processedGames.filter(g => g.name.toLowerCase().includes(searchQuery.toLowerCase()));
  if (playerFilter) {
    const target = parseInt(playerFilter);
    processedGames = processedGames.filter(g => target >= parseInt(g.minPlayers || "0") && target <= parseInt(g.maxPlayers || "99"));
  }
  processedGames.sort((a, b) => sortOption === "alpha" ? a.name.localeCompare(b.name) : sortOption === "year" ? parseInt(b.year || "0") - parseInt(a.year || "0") : (b.addedAt?.seconds || 0) - (a.addedAt?.seconds || 0));

  const pickRandomGame = () => {
    if (processedGames.length === 0) return toast.error("No games match your current filters!");
    setRandomGameOpen(processedGames[Math.floor(Math.random() * processedGames.length)]);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-slate-700 font-bold">Loading...</div>;

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
        <div className="bg-white p-8 rounded-xl shadow-xl border border-slate-200 max-w-sm w-full text-center">
          <Library className="mx-auto text-indigo-600 mb-4" size={56} />
          <h1 className="text-3xl font-black text-slate-900 mb-2">Boardgame Tracker</h1>
          <p className="text-slate-600 font-medium mb-8">Manage and share your collection.</p>
          <button onClick={() => signInWithPopup(auth, googleProvider)} className="w-full bg-indigo-600 text-white font-bold py-3 rounded-lg hover:bg-indigo-700 transition shadow-md hover:shadow-lg">Sign in with Google</button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col md:flex-row bg-slate-50 overflow-hidden">
      {/* MOBILE NAV */}
      <div className="md:hidden bg-white border-b border-slate-200 p-4 flex items-center justify-between shrink-0 z-20 shadow-sm">
        <h1 className="text-xl font-black text-slate-900 flex items-center gap-2"><Library size={24} className="text-indigo-600" /> Boardgame Tracker</h1>
        <button onClick={() => setIsSidebarOpen(true)} className="p-2 bg-slate-100 rounded-lg text-slate-600 hover:text-slate-900 transition"><Menu size={24} /></button>
      </div>
      {isSidebarOpen && <div className="fixed inset-0 bg-slate-900/50 z-40 md:hidden backdrop-blur-sm transition-opacity" onClick={() => setIsSidebarOpen(false)} />}

      <Sidebar 
        currentView={currentView}
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
        selectGroupMobile={selectGroupMobile}
        selectTab={selectTab}
        handleCreateGroup={handleCreateGroup}
        handleDeleteGroup={handleDeleteGroup}
        handleExport={handleExport}
        handleImport={handleImport}
      />

      {/* MAIN CONTENT */}
      <main className="flex-1 overflow-y-auto flex flex-col relative" onScroll={(e) => setIsScrolled(e.currentTarget.scrollTop > 15)}>
        {currentView === "recommendations" ? <div className="p-4 md:p-8 max-w-7xl mx-auto w-full"><RecommendationsTab userGames={activeGroup === null ? games : []} /></div>
        : currentView === "analytics" ? <div className="p-4 md:p-8 max-w-7xl mx-auto w-full"><AnalyticsTab /></div>
        : (
          <>
            <div className={`bg-slate-50/95 backdrop-blur z-20 sticky top-0 border-b border-slate-200 transition-all duration-300 ${isScrolled ? "p-3 shadow-sm" : "p-4 md:p-8 pb-4 md:pb-6"}`}>
              <div className="max-w-7xl mx-auto flex flex-col gap-3">
                <header className={`flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 transition-all duration-300 overflow-hidden ${isScrolled ? "max-h-0 opacity-0 mb-0 md:max-h-[200px] md:opacity-100 md:mb-2" : "max-h-[500px] opacity-100 mb-2"}`}>
                  <div>
                    <h2 className="text-2xl sm:text-3xl font-black text-slate-900">{activeGroup === null ? "All My Games" : activeGroup.name}</h2>
                    <p className="text-slate-600 font-medium mt-1">{processedGames.length} games {activeGroup && !activeGroup.isSystem ? `• ${activeGroup.members?.length || 1} members` : ''}</p>
                  </div>
                  <div className="flex flex-wrap w-full xl:w-auto gap-3">
                    {isBulkMode ? (
                      <>
                        <button onClick={() => setIsBulkMode(false)} className="flex-1 sm:flex-none bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold px-4 py-3 rounded-xl transition">Cancel Bulk</button>
                        <button disabled={selectedGameIds.length === 0} onClick={() => setIsBulkAssignModalOpen(true)} className="flex-1 sm:flex-none bg-indigo-600 disabled:bg-indigo-300 text-white font-bold px-4 py-3 rounded-xl flex items-center justify-center gap-2 shadow-sm transition"><ListChecks size={20} /> Assign ({selectedGameIds.length})</button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => setIsBulkMode(true)} className="flex-1 sm:flex-none bg-white hover:bg-slate-50 text-slate-700 font-bold px-4 py-3 rounded-xl flex items-center justify-center gap-2 border border-slate-300 shadow-sm transition"><ListChecks size={20} /> <span className="hidden sm:inline">Bulk Edit</span></button>
                        {activeGroup && !activeGroup.isSystem && activeGroup.ownerId === user.uid && <button onClick={() => setInvitingGroup(activeGroup)} className="flex-1 sm:flex-none bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold px-4 py-3 rounded-xl flex items-center justify-center gap-2 transition border border-indigo-200"><UserPlus size={20} /> <span className="hidden sm:inline">Invite</span></button>}
                        {activeGroup && <button onClick={() => setLibraryModalGroup(activeGroup)} className="flex-1 sm:flex-none bg-white hover:bg-slate-50 text-slate-700 font-bold px-4 py-3 rounded-xl flex items-center justify-center gap-2 border border-slate-300 shadow-sm transition hover:shadow"><BookOpen size={20} /> <span className="hidden sm:inline">Add from Library</span></button>}
                        <button onClick={() => setIsSearchOpen(true)} className="flex-1 sm:flex-none bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-3 rounded-xl flex items-center justify-center gap-2 shadow-md transition transform hover:-translate-y-0.5"><Plus size={20} /> <span className="hidden sm:inline">Search New Game</span><span className="sm:hidden">Search New</span></button>
                      </>
                    )}
                  </div>
                </header>

                {games.length > 0 && !isBulkMode && (
                  <div className="flex flex-wrap items-center gap-3 bg-white p-2 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex-1 min-w-[200px] relative"><Filter size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" /><input type="text" placeholder="Filter by name..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-indigo-600 outline-none" /></div>
                    <div className="w-32 relative"><Users size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" /><input type="number" placeholder="Players" value={playerFilter} onChange={(e) => setPlayerFilter(e.target.value)} min="1" max="99" className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-indigo-600 outline-none" /></div>
                    <div className="w-44 relative"><ArrowDownAZ size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" /><select value={sortOption} onChange={(e: any) => setSortOption(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium text-slate-900 focus:ring-2 focus:ring-indigo-600 outline-none appearance-none cursor-pointer"><option value="recent">Recently Added</option><option value="alpha">Alphabetical</option><option value="year">Release Year</option></select></div>
                    <button onClick={pickRandomGame} className="bg-amber-100 hover:bg-amber-200 text-amber-800 border border-amber-200 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition"><Shuffle size={16} /> What to Play?</button>
                  </div>
                )}
              </div>
            </div>

            <div className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full">
              {processedGames.length === 0 ? <div className="flex flex-col items-center justify-center h-64 text-slate-500 font-medium">{games.length === 0 ? "No games here yet." : "No games match your current filters."}</div>
              : (
                <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 md:gap-5">
                  {processedGames.map((game, index) => (
                    <GameCard 
                      key={game.id} game={game} userUid={user.uid}
                      isBulkMode={isBulkMode} isSelected={selectedGameIds.includes(game.id)} iOwnIt={game.userId === user.uid}
                      activeGroup={activeGroup} index={index}
                      onToggleBulk={toggleBulkSelection} onOpenDetails={setDetailsGame} onDelete={handleDeleteGame} onLogScore={(e, g) => { e.stopPropagation(); setScoringGame(g); }} onAssign={(e, g) => { e.stopPropagation(); setAssigningGame(g); }}
                    />
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </main>

      {/* MODALS */}
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