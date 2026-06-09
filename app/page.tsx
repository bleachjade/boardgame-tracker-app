"use client";

import { useAuthGroup } from "@/components/AuthGroupProvider";
import { signInWithPopup, googleProvider, auth, db } from "@/lib/firebase";
import { useState, useEffect } from "react";
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, doc, updateDoc, deleteDoc, arrayUnion, orderBy } from "firebase/firestore";
import { SearchModal } from "@/components/SearchModal";
import { LogOut, Plus, Users, Library, FolderPlus, FolderOpen, Check, X, Trash2, Menu, UserPlus, BookOpen, Trophy, Calendar, Calculator, History } from "lucide-react";
import toast from "react-hot-toast";

// --- MODALS ---

// UPDATED: Robust safe math calculation helper that fixes leading zero bugs (e.g., 05 + 09)
const calculateScoreString = (input: string): number => {
  // 1. Strip away everything except numbers and valid basic math symbols
  let sanitized = input.replace(/[^0-9+\-*/().]/g, "");
  
  // 2. FIX: Strip out leading zeros from numbers (e.g., "05" becomes "5", "009" becomes "9") 
  // This prevents strict-mode engine crashes or unintended octal conversions
  sanitized = sanitized.replace(/\b0+(?=\d)/g, "");

  if (!sanitized) return 0;
  try {
    const total = new Function(`return ${sanitized}`)();
    return typeof total === "number" && !isNaN(total) ? total : 0;
  } catch {
    return 0; // Return 0 gracefully while user is in the middle of typing an expression
  }
};

// UPDATED MODAL: Score Sheet & Match History Log Panel
function ScoresModal({ game, onClose }: { game: any; onClose: () => void }) {
  const { user, userNickname } = useAuthGroup();
  const [activeTab, setActiveTab] = useState<"log" | "history">("log");
  const [history, setHistory] = useState<any[]>([]);
  
  const [players, setPlayers] = useState<Array<{ name: string; scoreInput: string }>>([
    { name: userNickname || "Player 1", scoreInput: "" }
  ]);

  useEffect(() => {
    const q = query(
      collection(db, "gamePlays"),
      where("bggId", "==", game.bggId),
      orderBy("playedAt", "desc")
    );
    const unsub = onSnapshot(q, (snap) => {
      setHistory(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      console.log("Waiting on index verification...", error.message);
    });
    return () => unsub();
  }, [game.bggId]);

  const addPlayerRow = () => {
    setPlayers([...players, { name: `Player ${players.length + 1}`, scoreInput: "" }]);
  };

  const removePlayerRow = (index: number) => {
    setPlayers(players.filter((_, i) => i !== index));
  };

  const updatePlayer = (index: number, field: "name" | "scoreInput", value: string) => {
    const newPlayers = [...players];
    newPlayers[index][field] = value;
    setPlayers(newPlayers);
  };

  const handleSavePlay = async () => {
    if (!user) return;
    
    const finalScores = players.map(p => ({
      name: p.name.trim() || "Anonymous",
      score: calculateScoreString(p.scoreInput),
      rawExpression: p.scoreInput
    }));

    try {
      await addDoc(collection(db, "gamePlays"), {
        userId: user.uid,
        loggedBy: userNickname,
        gameId: game.id,
        bggId: game.bggId,
        gameName: game.name,
        players: finalScores,
        playedAt: serverTimestamp()
      });
      toast.success("Game play session logged!");
      onClose();
    } catch (err) {
      toast.error("Failed to save match scoring details.");
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg flex flex-col border border-slate-200 max-h-[85vh]">
        
        {/* Modal Header */}
        <div className="p-4 border-b flex justify-between items-center bg-slate-50 rounded-t-xl shrink-0">
          <div>
            <h2 className="font-black text-slate-900 text-lg flex items-center gap-2 truncate max-w-[320px]">
              <Trophy className="text-amber-500 shrink-0" size={20}/> {game.name}
            </h2>
          </div>
          <button onClick={onClose}><X size={20} className="text-slate-500 hover:text-slate-900"/></button>
        </div>

        {/* Tab Headers */}
        <div className="flex border-b text-sm font-bold text-slate-600 bg-white shrink-0">
          <button 
            onClick={() => setActiveTab("log")}
            className={`flex-1 py-3 text-center border-b-2 flex items-center justify-center gap-2 ${activeTab === "log" ? "border-blue-600 text-blue-600 bg-blue-50/40" : "border-transparent hover:bg-slate-50"}`}
          >
            <Calculator size={16}/> Calculator Score Sheet
          </button>
          <button 
            onClick={() => setActiveTab("history")}
            className={`flex-1 py-3 text-center border-b-2 flex items-center justify-center gap-2 ${activeTab === "history" ? "border-blue-600 text-blue-600 bg-blue-50/40" : "border-transparent hover:bg-slate-50"}`}
          >
            <History size={16}/> Match History ({history.length})
          </button>
        </div>

        {/* Tab Content Panels */}
        <div className="p-4 overflow-y-auto flex-1 bg-slate-50">
          {activeTab === "log" ? (
            <div className="space-y-4">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                Tip: Enter calculation formats directly (e.g., <code className="bg-slate-200 px-1 text-slate-800 rounded">35+12+4</code>)
              </div>
              
              <div className="space-y-3">
                {players.map((player, idx) => (
                  <div key={idx} className="flex gap-2 items-center bg-white p-3 border border-slate-200 rounded-xl shadow-sm">
                    <input 
                      type="text"
                      placeholder="Player Name"
                      value={player.name}
                      onChange={(e) => updatePlayer(idx, "name", e.target.value)}
                      className="flex-1 min-w-[100px] border border-slate-200 p-2 text-sm rounded-lg text-slate-900 font-bold"
                    />
                    <div className="relative w-36 shrink-0">
                      <input 
                        type="text"
                        placeholder="e.g. 10+5+2"
                        value={player.scoreInput}
                        onChange={(e) => updatePlayer(idx, "scoreInput", e.target.value)}
                        className="w-full border border-slate-200 p-2 pr-10 text-sm rounded-lg text-right font-black bg-slate-50 text-slate-900 focus:bg-white"
                      />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-black text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">
                        ={calculateScoreString(player.scoreInput)}
                      </span>
                    </div>
                    {players.length > 1 && (
                      <button onClick={() => removePlayerRow(idx)} className="text-slate-400 hover:text-red-500 p-1">
                        <X size={18} />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <button 
                onClick={addPlayerRow}
                className="w-full py-2.5 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 font-bold rounded-xl text-sm flex items-center justify-center gap-2 shadow-sm transition"
              >
                <Plus size={16}/> Add Player Row
              </button>
            </div>
          ) : (
            /* Match History Log Panel */
            <div className="space-y-3">
              {history.length === 0 ? (
                <div className="text-center py-8 text-slate-500 font-medium">No recorded score metrics found for this title.</div>
              ) : (
                history.map((record) => {
                  // UPDATED: Enforce explicit casting to Number to prevent string math comparison bugs
                  const maxScore = Math.max(...record.players.map((p: any) => Number(p.score || 0)));
                  const formattedDate = record.playedAt?.toDate() 
                    ? new Date(record.playedAt.toDate()).toLocaleDateString() 
                    : "Just now";

                  // UPDATED: Enforce strong Number conversion during array sorting routines
                  const sortedPlayers = [...record.players].sort((a: any, b: any) => Number(b.score || 0) - Number(a.score || 0));

                  return (
                    <div key={record.id} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-3">
                      <div className="flex justify-between items-center text-xs text-slate-500 font-bold border-b pb-2 border-slate-100">
                        <span className="flex items-center gap-1"><Calendar size={14}/> {formattedDate}</span>
                        <span>Logged by {record.loggedBy || "Friend"}</span>
                      </div>
                      <div className="space-y-1.5">
                        {sortedPlayers.map((p: any, pIdx: number) => (
                          <div key={pIdx} className="flex justify-between items-center text-sm font-semibold">
                            <span className="text-slate-700 flex items-center gap-1.5">
                              {Number(p.score) === maxScore && maxScore > 0 && <Trophy className="text-amber-500 shrink-0" size={14} />}
                              {p.name}
                            </span>
                            <div className="text-right">
                              <span className="font-black text-slate-900">{p.score} pts</span>
                              {p.rawExpression && p.rawExpression !== String(p.score) && (
                                <span className="block text-[10px] text-slate-400 font-normal">({p.rawExpression})</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t bg-slate-50 rounded-b-xl flex justify-end gap-2 shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg font-medium transition">Close</button>
          {activeTab === "log" && (
            <button onClick={handleSavePlay} className="px-5 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition shadow-sm">
              Save Match Results
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function AssignModal({ game, onClose }: { game: any, onClose: () => void }) {
  const { userGroups } = useAuthGroup();
  const [selected, setSelected] = useState<string[]>(game.groupIds || []);

  const toggleGroup = (id: string) => {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleSave = async () => {
    try {
      await updateDoc(doc(db, "userGames", game.id), { groupIds: selected });
      toast.success("Groups updated!");
      onClose();
    } catch (err) {
      toast.error("Failed to update groups.");
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm flex flex-col border border-slate-200">
        <div className="p-4 border-b flex justify-between items-center bg-slate-50 rounded-t-xl">
          <h2 className="font-bold text-slate-900 flex items-center gap-2"><FolderPlus size={18} /> Assign Groups</h2>
          <button onClick={onClose}><X size={20} className="text-slate-500 hover:text-slate-900" /></button>
        </div>
        <div className="p-4 space-y-2 max-h-[60vh] overflow-y-auto">
          {userGroups.map(group => (
            <div
              key={group.id}
              onClick={() => toggleGroup(group.id)}
              className="flex items-center gap-3 p-3 hover:bg-slate-50 rounded-lg cursor-pointer border border-transparent hover:border-slate-200 transition"
            >
              <div className={`w-5 h-5 rounded flex items-center justify-center border transition-colors ${selected.includes(group.id) ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-300'}`}>
                {selected.includes(group.id) && <Check size={14} strokeWidth={3} />}
              </div>
              <span className="font-medium text-slate-700">{group.name}</span>
            </div>
          ))}
        </div>
        <div className="p-4 border-t bg-slate-50 rounded-b-xl flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg font-medium transition">Cancel</button>
          <button onClick={handleSave} className="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition shadow-sm">Save Changes</button>
        </div>
      </div>
    </div>
  );
}

function AddFromLibraryModal({ group, onClose }: { group: any, onClose: () => void }) {
  const { user } = useAuthGroup();
  const [myGames, setMyGames] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "userGames"), where("userId", "==", user.uid));
    const unsub = onSnapshot(q, (snap) => {
      setMyGames(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsub();
  }, [user]);

  const toggleGameInGroup = async (game: any) => {
    const inGroup = game.groupIds?.includes(group.id);
    const newGroupIds = inGroup
      ? (game.groupIds || []).filter((id: string) => id !== group.id)
      : [...(game.groupIds || []), group.id];

    try {
      await updateDoc(doc(db, "userGames", game.id), { groupIds: newGroupIds });
    } catch (err) {
      toast.error("Failed to update game.");
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md flex flex-col border border-slate-200 max-h-[85vh]">
        <div className="p-4 border-b flex justify-between items-center bg-slate-50 rounded-t-xl">
          <h2 className="font-bold text-slate-900 flex items-center gap-2"><BookOpen size={18} /> Add from Library</h2>
          <button onClick={onClose}><X size={20} className="text-slate-500 hover:text-slate-900" /></button>
        </div>
        <div className="p-2 overflow-y-auto flex-1">
          {myGames.length === 0 ? (
            <div className="text-center p-8 text-slate-500">Your library is empty.</div>
          ) : (
            myGames.map(game => {
              const inGroup = game.groupIds?.includes(group.id);
              return (
                <div
                  key={game.id}
                  onClick={() => toggleGameInGroup(game)}
                  className="flex items-center gap-3 p-3 hover:bg-slate-50 rounded-lg cursor-pointer border border-transparent hover:border-slate-200 transition"
                >
                  <div className={`shrink-0 w-6 h-6 rounded flex items-center justify-center border transition-colors ${inGroup ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-300'}`}>
                    {inGroup && <Check size={14} strokeWidth={3} />}
                  </div>
                  {game.image ? (
                    <img src={game.image} alt={game.name} className="w-10 h-10 object-cover rounded shadow-sm shrink-0" />
                  ) : (
                    <div className="w-10 h-10 bg-slate-200 rounded shrink-0 flex items-center justify-center text-xs font-bold text-slate-400">N/A</div>
                  )}
                  <span className="font-bold text-slate-700 truncate flex-1">{game.name}</span>
                </div>
              );
            })
          )}
        </div>
        <div className="p-4 border-t bg-slate-50 rounded-b-xl flex justify-end">
          <button onClick={onClose} className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition shadow-sm">Done</button>
        </div>
      </div>
    </div>
  );
}

function InviteModal({ group, onClose }: { group: any, onClose: () => void }) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    try {
      await updateDoc(doc(db, "groups", group.id), {
        members: arrayUnion(email.trim().toLowerCase())
      });
      toast.success(`Invited ${email}!`);
      onClose();
    } catch (err) {
      toast.error("Failed to invite. Ensure you are the group owner.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md flex flex-col border border-slate-200">
        <div className="p-4 border-b flex justify-between items-center bg-slate-50 rounded-t-xl">
          <h2 className="font-bold text-slate-900 flex items-center gap-2"><UserPlus size={18} /> Invite to {group.name}</h2>
          <button onClick={onClose}><X size={20} className="text-slate-500 hover:text-slate-900" /></button>
        </div>
        <form onSubmit={handleInvite} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Friend's Google Email</label>
            <input
              type="email"
              required
              placeholder="friend@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-slate-300 p-3 rounded-lg outline-none focus:ring-2 focus:ring-indigo-600 text-slate-900 placeholder-slate-400 font-medium"
            />
            <p className="text-xs text-slate-500 mt-2">They will see this group when they log in with this email.</p>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg font-medium transition">Cancel</button>
            <button type="submit" disabled={loading} className="px-5 py-2 bg-indigo-600 disabled:bg-indigo-400 text-white rounded-lg font-bold hover:bg-indigo-700 transition shadow-sm">
              {loading ? "Sending..." : "Send Invite"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// --- MAIN PAGE ---
export default function Home() {
  const { user, userNickname, loading, activeGroup, userGroups, setActiveGroup } = useAuthGroup();
  const [games, setGames] = useState<any[]>([]);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [assigningGame, setAssigningGame] = useState<any | null>(null);
  const [scoringGame, setScoringGame] = useState<any | null>(null); // NEW: Controls the Score/History modal
  const [invitingGroup, setInvitingGroup] = useState<any | null>(null);
  const [libraryModalGroup, setLibraryModalGroup] = useState<any | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    if (!user) return;

    let q;
    if (activeGroup === null) {
      q = query(collection(db, "userGames"), where("userId", "==", user.uid));
    } else {
      q = query(collection(db, "userGames"), where("groupIds", "array-contains", activeGroup.id));
    }

    const unsub = onSnapshot(q, (snap) => {
      setGames(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsub();
  }, [activeGroup, user]);

  const handleCreateGroup = async () => {
    const name = prompt("Enter a name for your new friend group (e.g., 'Game Night Crew'):");
    if (!name || !name.trim()) return;

    try {
      const identifier = user?.email || user?.uid;
      await addDoc(collection(db, "groups"), {
        name: name.trim(),
        ownerId: user?.uid,
        members: [identifier],
        isSystem: false,
        createdAt: serverTimestamp()
      });
      toast.success(`Group "${name}" created!`);
      setIsSidebarOpen(true);
    } catch (error) {
      toast.error("Failed to create group.");
    }
  };

  const handleDeleteGroup = async (e: React.MouseEvent, groupId: string, groupName: string) => {
    e.stopPropagation();
    if (!confirm(`Are you sure you want to delete the group "${groupName}"?`)) return;

    try {
      await deleteDoc(doc(db, "groups", groupId));
      if (activeGroup?.id === groupId) setActiveGroup(null);
      toast.success(`${groupName} deleted!`);
    } catch (error) {
      toast.error("Failed to delete group.");
    }
  };

  // UPDATED: Contextual game removal logic
  const handleDeleteGame = async (e: React.MouseEvent, game: any) => {
    e.stopPropagation();

    if (activeGroup === null) {
      // 1. ALL MY GAMES VIEW: Permanently remove from the entire database
      if (!confirm(`Are you sure you want to permanently delete "${game.name}" from your entire library? This will remove it from all groups too.`)) return;

      try {
        await deleteDoc(doc(db, "userGames", game.id));
        toast.success(`${game.name} deleted from library!`);
      } catch (error) {
        toast.error("Failed to remove game from library.");
      }
    } else {
      // 2. GROUP/LIST VIEW: Just untag the group ID from the game document
      if (!confirm(`Remove "${game.name}" from "${activeGroup.name}"? (It will remain safe in your master library)`)) return;

      try {
        const newGroupIds = (game.groupIds || []).filter((id: string) => id !== activeGroup.id);
        await updateDoc(doc(db, "userGames", game.id), { groupIds: newGroupIds });
        toast.success(`Removed from ${activeGroup.name}!`);
      } catch (error) {
        toast.error("Failed to remove from group.");
      }
    }
  };

  const selectGroupMobile = (group: any | null) => {
    setActiveGroup(group);
    setIsSidebarOpen(false);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-slate-700 font-bold">Loading...</div>;

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
        <div className="bg-white p-8 rounded-xl shadow-xl border border-slate-200 max-w-sm w-full text-center">
          <Library className="mx-auto text-blue-600 mb-4" size={56} />
          <h1 className="text-3xl font-black text-slate-900 mb-2">Boardgame Tracker</h1>
          <p className="text-slate-600 font-medium mb-8">Manage and share your collection.</p>
          <button onClick={() => signInWithPopup(auth, googleProvider)} className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 transition shadow-md hover:shadow-lg">
            Sign in with Google
          </button>
        </div>
      </div>
    );
  }

  const systemGroups = userGroups.filter(g => g.isSystem);
  const customGroups = userGroups.filter(g => !g.isSystem);

  return (
    <div className="h-screen flex flex-col md:flex-row bg-slate-50 overflow-hidden">

      {/* MOBILE TOP NAV */}
      <div className="md:hidden bg-white border-b border-slate-200 p-4 flex items-center justify-between shrink-0 z-20 shadow-sm">
        <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
          <Library size={24} className="text-blue-600" /> Boardgame Tracker
        </h1>
        <button onClick={() => setIsSidebarOpen(true)} className="p-2 bg-slate-100 rounded-lg text-slate-600 hover:text-slate-900 transition">
          <Menu size={24} />
        </button>
      </div>

      {/* SIDEBAR OVERLAY */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 z-30 md:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* SIDEBAR */}
      <aside className={`fixed inset-y-0 left-0 w-72 bg-white border-r border-slate-200 p-5 flex flex-col justify-between shadow-2xl md:shadow-sm z-40 transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="overflow-y-auto">
          <div className="flex items-center justify-between mb-8 md:block">
            <h1 className="hidden md:flex text-2xl font-black text-slate-900 items-center gap-3">
              <Library size={28} className="text-blue-600" /> Boardgame Tracker
            </h1>
            <button className="md:hidden p-2 text-slate-500 hover:bg-slate-100 rounded-lg" onClick={() => setIsSidebarOpen(false)}>
              <X size={24} />
            </button>
          </div>

          <div className="space-y-6">
            <div>
              <button
                onClick={() => selectGroupMobile(null)}
                className={`w-full text-left p-3 rounded-xl flex items-center gap-3 transition-colors ${activeGroup === null ? 'bg-blue-600 text-white font-bold shadow-md' : 'text-slate-700 font-bold hover:bg-slate-100'}`}
              >
                <Library size={20} className={activeGroup === null ? "text-blue-100" : "text-blue-500"} /> All My Games
              </button>
            </div>

            <div>
              <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 px-1">Personal Lists</h2>
              <div className="space-y-1">
                {systemGroups.map(group => (
                  <button
                    key={group.id}
                    onClick={() => selectGroupMobile(group)}
                    className={`w-full text-left p-2.5 rounded-xl flex items-center gap-3 transition-colors ${activeGroup?.id === group.id ? 'bg-slate-800 text-white font-bold shadow-md' : 'text-slate-700 font-medium hover:bg-slate-100'}`}
                  >
                    <FolderOpen size={18} className={activeGroup?.id === group.id ? "text-slate-300" : "text-slate-400"} /> {group.name}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 px-1">Friend Groups</h2>
              <div className="space-y-1">
                {customGroups.map(group => (
                  <div key={group.id} className="relative group/btn">
                    <button
                      onClick={() => selectGroupMobile(group)}
                      className={`w-full text-left p-2.5 pr-10 rounded-xl flex items-center gap-3 transition-colors ${activeGroup?.id === group.id ? 'bg-indigo-600 text-white font-bold shadow-md' : 'text-slate-700 font-medium hover:bg-indigo-50'}`}
                    >
                      <Users size={18} className={activeGroup?.id === group.id ? "text-indigo-200" : "text-indigo-400"} />
                      <span className="truncate">{group.name}</span>
                    </button>
                    <button
                      onClick={(e) => handleDeleteGroup(e, group.id, group.name)}
                      className={`absolute right-2 top-1/2 -translate-y-1/2 p-1.5 transition-all rounded ${activeGroup?.id === group.id ? 'text-indigo-300 hover:text-white' : 'md:opacity-0 md:group-hover/btn:opacity-100 text-slate-400 hover:text-red-500 hover:bg-slate-200'}`}
                      title="Delete Group"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
                <button onClick={handleCreateGroup} className="w-full text-left p-3 mt-2 text-sm text-indigo-600 font-bold flex items-center gap-2 hover:bg-indigo-50 border border-indigo-100 rounded-xl transition">
                  <Plus size={18} /> Create New Group
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 pt-5 mt-4 border-t border-slate-200 shrink-0">
          <img src={user.photoURL || ''} alt="Avatar" className="w-10 h-10 rounded-full bg-slate-200 border border-slate-300" />
          <div className="flex-1 truncate">
            <p className="text-sm font-bold text-slate-900 truncate">{userNickname}</p>
          </div>
          <button onClick={() => auth.signOut()} className="text-slate-400 hover:text-red-600 transition-colors p-2 rounded-lg hover:bg-red-50" title="Sign Out">
            <LogOut size={20} />
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto">
        <div className="max-w-7xl mx-auto">
          <header className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-6 gap-4">
            <div>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900">{activeGroup === null ? "All My Games" : activeGroup.name}</h2>
              <p className="text-slate-600 font-medium mt-1">
                {games.length} games {activeGroup && !activeGroup.isSystem ? `• ${activeGroup.members?.length || 1} members` : ''}
              </p>
            </div>

            <div className="flex flex-wrap w-full xl:w-auto gap-3">
              {activeGroup && !activeGroup.isSystem && activeGroup.ownerId === user.uid && (
                <button
                  onClick={() => setInvitingGroup(activeGroup)}
                  className="flex-1 sm:flex-none bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold px-4 py-3 rounded-xl flex items-center justify-center gap-2 transition border border-indigo-200"
                >
                  <UserPlus size={20} /> <span className="hidden sm:inline">Invite</span>
                </button>
              )}

              {activeGroup && (
                <button
                  onClick={() => setLibraryModalGroup(activeGroup)}
                  className="flex-1 sm:flex-none bg-white hover:bg-slate-50 text-slate-700 font-bold px-4 py-3 rounded-xl flex items-center justify-center gap-2 border border-slate-300 shadow-sm transition hover:shadow"
                >
                  <BookOpen size={20} /> <span className="hidden sm:inline">Add from Library</span>
                </button>
              )}

              <button
                onClick={() => setIsSearchOpen(true)}
                className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-3 rounded-xl flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition transform hover:-translate-y-0.5"
              >
                <Plus size={20} /> <span className="hidden sm:inline">Search New Game</span><span className="sm:hidden">Search New</span>
              </button>
            </div>
          </header>

          {games.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-600 bg-white rounded-2xl border-2 border-dashed border-slate-300 shadow-sm p-6 text-center">
              <p className="mb-4 font-semibold text-lg text-slate-700">No games here yet.</p>

              {activeGroup === null ? (
                <button onClick={() => setIsSearchOpen(true)} className="text-blue-600 font-bold hover:underline flex items-center justify-center gap-2 bg-blue-50 px-5 py-3 rounded-xl">
                  <Plus size={18} /> Search for your first game
                </button>
              ) : (
                <button onClick={() => setLibraryModalGroup(activeGroup)} className="text-blue-600 font-bold hover:underline flex items-center justify-center gap-2 bg-blue-50 px-5 py-3 rounded-xl">
                  <BookOpen size={18} /> Add from your library
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {games.map(game => (
                <div key={game.id} className="bg-white rounded-2xl shadow-sm overflow-hidden border border-slate-200 hover:shadow-md transition-shadow flex flex-col group">
                  <div className="h-48 sm:h-56 w-full overflow-hidden bg-slate-100 border-b border-slate-200 shrink-0 relative">
                    {/* UPDATED: Pass the whole game object, and dynamic title */}
                    {game.userId === user.uid && (
                      <button
                        onClick={(e) => handleDeleteGame(e, game)}
                        className="absolute top-2 right-2 p-2 bg-white/90 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-full shadow-sm md:opacity-0 group-hover:opacity-100 transition-all z-10"
                        title={activeGroup === null ? "Delete from Library" : "Remove from Group"}
                      >
                        <Trash2 size={16} />
                      </button>
                    )}

                    {game.image ? (
                      <img src={game.image} alt={game.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-400 font-bold">No Image</div>
                    )}
                  </div>
                  <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="font-bold text-lg sm:text-xl text-slate-900 leading-tight mb-1 line-clamp-2">{game.name}</h3>
                      <p className="text-sm font-semibold text-slate-500 mb-4">{game.year || 'Unknown Year'}</p>
                      <div className="flex justify-between text-xs font-bold text-slate-700 bg-slate-100 p-2.5 rounded-lg mb-4">
                        <span>{game.minPlayers || '?'}-{game.maxPlayers || '?'} Players</span>
                        <span>{game.playTime || '?'} Mins</span>
                      </div>
                    </div>

                    {/* UPDATED ACTION PANEL: Added Scores & History layout toggle buttons */}
                    <div className="space-y-2">
                      <button
                        onClick={() => setScoringGame(game)}
                        className="w-full flex items-center justify-center gap-2 py-2 bg-blue-50 text-blue-700 font-bold rounded-xl text-sm border border-blue-100 hover:bg-blue-100 transition shadow-sm"
                      >
                        <Trophy size={16} /> Scores & History
                      </button>

                      {game.userId === user.uid ? (
                        <button
                          onClick={() => setAssigningGame(game)}
                          className="w-full flex items-center justify-center gap-2 py-2 border border-slate-200 text-slate-600 font-bold rounded-xl text-sm hover:border-slate-300 hover:bg-slate-50 transition"
                        >
                          <FolderPlus size={16} /> Assign Lists
                        </button>
                      ) : (
                        <div className="w-full flex items-center justify-center gap-2 py-2 border border-transparent text-slate-500 font-medium rounded-xl text-xs bg-slate-50">
                          Shared by {game.ownerNickname || "a friend"}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* MODALS */}
      {isSearchOpen && <SearchModal onClose={() => setIsSearchOpen(false)} />}
      {assigningGame && <AssignModal game={assigningGame} onClose={() => setAssigningGame(null)} />}
      {invitingGroup && <InviteModal group={invitingGroup} onClose={() => setInvitingGroup(null)} />}
      {libraryModalGroup && <AddFromLibraryModal group={libraryModalGroup} onClose={() => setLibraryModalGroup(null)} />}
      {scoringGame && <ScoresModal game={scoringGame} onClose={() => setScoringGame(null)} />}
    </div>
  );
}