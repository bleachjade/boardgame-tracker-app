"use client";

import { useAuthGroup } from "@/components/AuthGroupProvider";
import { signInWithPopup, googleProvider, auth, db } from "@/lib/firebase";
import { useState, useEffect, useRef } from "react";
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, doc, updateDoc, deleteDoc, arrayUnion, orderBy, writeBatch, getDocs } from "firebase/firestore";
import { SearchModal } from "@/components/SearchModal";
import { LogOut, Plus, Users, Library, FolderPlus, FolderOpen, Check, X, Trash2, Menu, UserPlus, BookOpen, Trophy, Calendar, Calculator, History, Download, Upload, ListChecks, Filter, Shuffle, ArrowDownAZ, Sparkles, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import Image from "next/image";

// --- HELPERS ---
const calculateScoreString = (input: string): number => {
  let sanitized = input.replace(/[^0-9+\-*/().]/g, "");
  sanitized = sanitized.replace(/\b0+(?=\d)/g, "");
  if (!sanitized) return 0;
  try {
    const total = new Function(`return ${sanitized}`)();
    return typeof total === "number" && !isNaN(total) ? total : 0;
  } catch {
    return 0;
  }
};

// --- MODALS ---

function RandomGameModal({ game, onClose }: { game: any; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-slate-900/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in zoom-in duration-300">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm flex flex-col overflow-hidden text-center">
        <div className="bg-indigo-600 p-6 text-white relative">
          <button onClick={onClose} className="absolute top-4 right-4 text-white/70 hover:text-white"><X size={24} /></button>
          <Shuffle size={40} className="mx-auto mb-2 text-indigo-200" />
          <h2 className="text-2xl font-black">You should play...</h2>
        </div>
        <div className="p-8 flex flex-col items-center">
          <div className="w-40 h-40 relative rounded-xl overflow-hidden shadow-lg mb-6 border border-slate-200">
            {game.image ? (
              <Image src={game.image} alt={game.name} fill className="object-cover" unoptimized />
            ) : (
              <div className="w-full h-full bg-slate-200 flex items-center justify-center text-slate-400 font-bold">N/A</div>
            )}
          </div>
          <h3 className="text-2xl font-black text-slate-900 leading-tight mb-2">{game.name}</h3>
          <div className="flex justify-center gap-4 text-sm font-bold text-slate-500 bg-slate-100 px-4 py-2 rounded-full">
            <span>{game.minPlayers || '?'}-{game.maxPlayers || '?'} Players</span>
            <span>{game.playTime || '?'} Mins</span>
          </div>
        </div>
        <div className="p-4 bg-slate-50 border-t border-slate-100">
          <button onClick={onClose} className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition shadow-sm">
            Let's Go!
          </button>
        </div>
      </div>
    </div>
  );
}

function ScoresModal({ game, onClose }: { game: any; onClose: () => void }) {
  const { user, userNickname } = useAuthGroup();
  const [activeTab, setActiveTab] = useState<"log" | "history">("log");
  const [history, setHistory] = useState<any[]>([]);
  const [players, setPlayers] = useState<Array<{ name: string; scoreInput: string }>>([
    { name: userNickname || "Player 1", scoreInput: "" }
  ]);

  useEffect(() => {
    const q = query(collection(db, "gamePlays"), where("bggId", "==", game.bggId), orderBy("playedAt", "desc"));
    const unsub = onSnapshot(q, (snap) => setHistory(snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))), () => { });
    return () => unsub();
  }, [game.bggId]);

  const addPlayerRow = () => setPlayers([...players, { name: `Player ${players.length + 1}`, scoreInput: "" }]);
  const removePlayerRow = (index: number) => setPlayers(players.filter((_, i) => i !== index));
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
      await addDoc(collection(db, "gamePlays"), { userId: user.uid, loggedBy: userNickname, gameId: game.id, bggId: game.bggId, gameName: game.name, players: finalScores, playedAt: serverTimestamp() });
      toast.success("Game play session logged!");
      onClose();
    } catch (err) { toast.error("Failed to save match scoring details."); }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg flex flex-col border border-slate-200 max-h-[85vh]">
        <div className="p-4 border-b flex justify-between items-center bg-slate-50 rounded-t-xl shrink-0">
          <h2 className="font-black text-slate-900 text-lg flex items-center gap-2 truncate max-w-[320px]">
            <Trophy className="text-amber-500 shrink-0" size={20} /> {game.name}
          </h2>
          <button onClick={onClose}><X size={20} className="text-slate-500 hover:text-slate-900" /></button>
        </div>
        <div className="flex border-b text-sm font-bold text-slate-600 bg-white shrink-0">
          <button onClick={() => setActiveTab("log")} className={`flex-1 py-3 text-center border-b-2 flex items-center justify-center gap-2 ${activeTab === "log" ? "border-blue-600 text-blue-600 bg-blue-50/40" : "border-transparent hover:bg-slate-50"}`}><Calculator size={16} /> Calculator</button>
          <button onClick={() => setActiveTab("history")} className={`flex-1 py-3 text-center border-b-2 flex items-center justify-center gap-2 ${activeTab === "history" ? "border-blue-600 text-blue-600 bg-blue-50/40" : "border-transparent hover:bg-slate-50"}`}><History size={16} /> History ({history.length})</button>
        </div>
        <div className="p-4 overflow-y-auto flex-1 bg-slate-50">
          {activeTab === "log" ? (
            <div className="space-y-4">
              <div className="space-y-3">
                {players.map((player, idx) => (
                  <div key={idx} className="flex gap-2 items-center bg-white p-3 border border-slate-200 rounded-xl shadow-sm">
                    <input type="text" placeholder="Player Name" value={player.name} onChange={(e) => updatePlayer(idx, "name", e.target.value)} className="flex-1 min-w-[100px] border border-slate-200 p-2 text-sm rounded-lg text-slate-900 font-bold" />
                    <div className="relative w-36 shrink-0">
                      <input type="text" placeholder="e.g. 10+5+2" value={player.scoreInput} onChange={(e) => updatePlayer(idx, "scoreInput", e.target.value)} className="w-full border border-slate-200 p-2 pr-10 text-sm rounded-lg text-right font-black bg-slate-50 text-slate-900 focus:bg-white" />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-black text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">={calculateScoreString(player.scoreInput)}</span>
                    </div>
                    {players.length > 1 && <button onClick={() => removePlayerRow(idx)} className="text-slate-400 hover:text-red-500 p-1"><X size={18} /></button>}
                  </div>
                ))}
              </div>
              <button onClick={addPlayerRow} className="w-full py-2.5 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 font-bold rounded-xl text-sm flex items-center justify-center gap-2 shadow-sm transition"><Plus size={16} /> Add Player Row</button>
            </div>
          ) : (
            <div className="space-y-3">
              {history.length === 0 ? <div className="text-center py-8 text-slate-500 font-medium">No recorded scores found.</div> : history.map((record) => {
                const maxScore = Math.max(...record.players.map((p: any) => Number(p.score || 0)));
                const sortedPlayers = [...record.players].sort((a: any, b: any) => Number(b.score || 0) - Number(a.score || 0));
                return (
                  <div key={record.id} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-3">
                    <div className="flex justify-between items-center text-xs text-slate-500 font-bold border-b pb-2 border-slate-100">
                      <span className="flex items-center gap-1"><Calendar size={14} /> {record.playedAt?.toDate() ? new Date(record.playedAt.toDate()).toLocaleDateString() : "Just now"}</span>
                      <span>Logged by {record.loggedBy || "Friend"}</span>
                    </div>
                    <div className="space-y-1.5">
                      {sortedPlayers.map((p: any, pIdx: number) => (
                        <div key={pIdx} className="flex justify-between items-center text-sm font-semibold">
                          <span className="text-slate-700 flex items-center gap-1.5">{Number(p.score) === maxScore && maxScore > 0 && <Trophy className="text-amber-500 shrink-0" size={14} />} {p.name}</span>
                          <div className="text-right">
                            <span className="font-black text-slate-900">{p.score} pts</span>
                            {p.rawExpression && p.rawExpression !== String(p.score) && <span className="block text-[10px] text-slate-400 font-normal">({p.rawExpression})</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <div className="p-4 border-t bg-slate-50 rounded-b-xl flex justify-end gap-2 shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg font-medium transition">Close</button>
          {activeTab === "log" && <button onClick={handleSavePlay} className="px-5 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition shadow-sm">Save Match Results</button>}
        </div>
      </div>
    </div>
  );
}

function AssignModal({ game, onClose }: { game: any, onClose: () => void }) {
  const { userGroups } = useAuthGroup();
  const [selected, setSelected] = useState<string[]>(game.groupIds || []);

  const handleSave = async () => {
    try {
      await updateDoc(doc(db, "userGames", game.id), { groupIds: selected });
      toast.success("Groups updated!");
      onClose();
    } catch (err) { toast.error("Failed to update groups."); }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm flex flex-col border border-slate-200">
        <div className="p-4 border-b flex justify-between items-center bg-slate-50 rounded-t-xl"><h2 className="font-bold text-slate-900 flex items-center gap-2"><FolderPlus size={18} /> Assign Groups</h2><button onClick={onClose}><X size={20} className="text-slate-500 hover:text-slate-900" /></button></div>
        <div className="p-4 space-y-2 max-h-[60vh] overflow-y-auto">
          {userGroups.map(group => (
            <div key={group.id} onClick={() => setSelected(p => p.includes(group.id) ? p.filter(x => x !== group.id) : [...p, group.id])} className="flex items-center gap-3 p-3 hover:bg-slate-50 rounded-lg cursor-pointer border border-transparent hover:border-slate-200 transition">
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

function BulkAssignModal({ gameIds, onClose, onClearSelection }: { gameIds: string[], onClose: () => void, onClearSelection: () => void }) {
  const { userGroups } = useAuthGroup();
  const [selected, setSelected] = useState<string[]>([]);

  const handleBulkSave = async () => {
    if (selected.length === 0) return toast.error("Select at least one group.");
    try {
      const batch = writeBatch(db);
      gameIds.forEach(id => batch.update(doc(db, "userGames", id), { groupIds: arrayUnion(...selected) }));
      await batch.commit();
      toast.success(`Assigned ${gameIds.length} games to selected lists!`);
      onClearSelection();
      onClose();
    } catch (err) { toast.error("Failed to bulk update."); }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm flex flex-col border border-slate-200">
        <div className="p-4 border-b flex justify-between items-center bg-slate-50 rounded-t-xl"><h2 className="font-bold text-slate-900 flex items-center gap-2"><ListChecks size={18} /> Bulk Assign ({gameIds.length})</h2><button onClick={onClose}><X size={20} className="text-slate-500 hover:text-slate-900" /></button></div>
        <div className="p-4 space-y-2 max-h-[60vh] overflow-y-auto">
          <p className="text-sm text-slate-500 mb-3">Add selected games to:</p>
          {userGroups.map(group => (
            <div key={group.id} onClick={() => setSelected(p => p.includes(group.id) ? p.filter(x => x !== group.id) : [...p, group.id])} className="flex items-center gap-3 p-3 hover:bg-slate-50 rounded-lg cursor-pointer border border-transparent hover:border-slate-200 transition">
              <div className={`w-5 h-5 rounded flex items-center justify-center border transition-colors ${selected.includes(group.id) ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-300'}`}>
                {selected.includes(group.id) && <Check size={14} strokeWidth={3} />}
              </div>
              <span className="font-medium text-slate-700">{group.name}</span>
            </div>
          ))}
        </div>
        <div className="p-4 border-t bg-slate-50 rounded-b-xl flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg font-medium transition">Cancel</button>
          <button onClick={handleBulkSave} className="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition shadow-sm">Apply Bulk</button>
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
    setLoading(true);
    try {
      await updateDoc(doc(db, "groups", group.id), { members: arrayUnion(email.trim().toLowerCase()) });
      toast.success(`Invited ${email}!`);
      onClose();
    } catch (err) { toast.error("Failed to invite."); } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md flex flex-col border border-slate-200">
        <div className="p-4 border-b flex justify-between items-center bg-slate-50 rounded-t-xl"><h2 className="font-bold text-slate-900 flex items-center gap-2"><UserPlus size={18} /> Invite to {group.name}</h2><button onClick={onClose}><X size={20} className="text-slate-500 hover:text-slate-900" /></button></div>
        <form onSubmit={handleInvite} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Friend's Google Email</label>
            <input type="email" required placeholder="friend@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full border border-slate-300 p-3 rounded-lg outline-none focus:ring-2 focus:ring-indigo-600 text-slate-900 font-medium" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg font-medium transition">Cancel</button>
            <button type="submit" disabled={loading} className="px-5 py-2 bg-indigo-600 disabled:bg-indigo-400 text-white rounded-lg font-bold hover:bg-indigo-700 transition shadow-sm">{loading ? "Sending..." : "Send Invite"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AddFromLibraryModal({ group, onClose }: { group: any, onClose: () => void }) {
  const { user } = useAuthGroup();
  const [myGames, setMyGames] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(query(collection(db, "userGames"), where("userId", "==", user.uid)), (snap) => setMyGames(snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))));
    return () => unsub();
  }, [user]);

  const toggleGameInGroup = async (game: any) => {
    const inGroup = game.groupIds?.includes(group.id);
    const newGroupIds = inGroup ? (game.groupIds || []).filter((id: string) => id !== group.id) : [...(game.groupIds || []), group.id];
    try { await updateDoc(doc(db, "userGames", game.id), { groupIds: newGroupIds }); } catch (err) { }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md flex flex-col border border-slate-200 max-h-[85vh]">
        <div className="p-4 border-b flex justify-between items-center bg-slate-50 rounded-t-xl"><h2 className="font-bold text-slate-900 flex items-center gap-2"><BookOpen size={18} /> Add from Library</h2><button onClick={onClose}><X size={20} className="text-slate-500 hover:text-slate-900" /></button></div>
        <div className="p-2 overflow-y-auto flex-1">
          {myGames.length === 0 ? <div className="text-center p-8 text-slate-500">Your library is empty.</div> : myGames.map(game => {
            const inGroup = game.groupIds?.includes(group.id);
            return (
              <div key={game.id} onClick={() => toggleGameInGroup(game)} className="flex items-center gap-3 p-3 hover:bg-slate-50 rounded-lg cursor-pointer border border-transparent hover:border-slate-200 transition">
                <div className={`shrink-0 w-6 h-6 rounded flex items-center justify-center border transition-colors ${inGroup ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-300'}`}>
                  {inGroup && <Check size={14} strokeWidth={3} />}
                </div>
                {game.image ? <div className="relative w-10 h-10 shrink-0"><Image src={game.image} alt={game.name} fill className="object-cover rounded shadow-sm" unoptimized /></div> : <div className="w-10 h-10 bg-slate-200 rounded shrink-0 flex items-center justify-center text-xs font-bold text-slate-400">N/A</div>}
                <span className="font-bold text-slate-700 truncate flex-1">{game.name}</span>
              </div>
            );
          })}
        </div>
        <div className="p-4 border-t bg-slate-50 rounded-b-xl flex justify-end"><button onClick={onClose} className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition shadow-sm">Done</button></div>
      </div>
    </div>
  );
}

// NEW COMPONENT: Smart Recommendations Tab
function RecommendationsTab({ userGames }: { userGames: any[] }) {
  const { user, userNickname } = useAuthGroup();
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingId, setAddingId] = useState<string | null>(null);

  // Profile averages for dynamic UI text
  const [avgPlayers, setAvgPlayers] = useState(4);
  const [avgTime, setAvgTime] = useState(60);

  useEffect(() => {
    async function buildRecommendations() {
      setLoading(true);
      try {
        const times = userGames.map(g => parseInt(g.playTime)).filter(n => !isNaN(n) && n > 0);
        const maxPs = userGames.map(g => parseInt(g.maxPlayers)).filter(n => !isNaN(n) && n > 0);

        const myAvgTime = times.length ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : 60;
        const myAvgMax = maxPs.length ? Math.round(maxPs.reduce((a, b) => a + b, 0) / maxPs.length) : 4;

        setAvgTime(myAvgTime);
        setAvgPlayers(myAvgMax);

        const res = await fetch("/api/bgg-hot");
        const xmlText = await res.text();

        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, "text/xml");
        const items = Array.from(xmlDoc.getElementsByTagName("item"));

        const hotIds = items.slice(0, 20).map(item => item.getAttribute("id")).filter(Boolean);

        if (hotIds.length === 0) {
          throw new Error("BoardGameGeek's trending list is temporarily unavailable. Please try again later.");
        }

        const enrichRes = await fetch(`/api/bgg?ids=${hotIds.join(',')}`);
        const hotGames = await enrichRes.json();

        if (!Array.isArray(hotGames)) {
          console.error("BGG API Error:", hotGames);
          throw new Error(hotGames.error || "Failed to load trending games.");
        }

        const ownedIds = new Set(userGames.map(g => g.bggId));
        const scoredGames = hotGames
          .filter((g: any) => !ownedIds.has(g.bggId))
          .map((g: any) => {
            const time = parseInt(g.playTime) || 60;
            const maxP = parseInt(g.maxPlayers) || 4;
            const penalty = Math.abs(time - myAvgTime) + (Math.abs(maxP - myAvgMax) * 20);
            return { ...g, penalty };
          });

        scoredGames.sort((a: any, b: any) => a.penalty - b.penalty);
        setRecommendations(scoredGames.slice(0, 12));
      } catch (err) {
        console.error("Failed to build recommendations", err);
      } finally {
        setLoading(false);
      }
    }

    buildRecommendations();
  }, [userGames]);

  const handleAddRec = async (game: any) => {
    if (!user) return;
    setAddingId(game.bggId);
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
        addedAt: serverTimestamp()
      });
      toast.success(`${game.name} added to your library!`);
      setRecommendations(prev => prev.filter(g => g.bggId !== game.bggId));
    } catch (err) {
      toast.error("Failed to add game.");
    } finally {
      setAddingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-slate-500 space-y-4">
        <Loader2 size={32} className="animate-spin text-indigo-600" />
        <p className="font-bold">Analyzing your library and checking global trends...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-indigo-600 to-blue-500 rounded-2xl p-6 md:p-8 text-white shadow-lg relative overflow-hidden">
        <Sparkles size={120} className="absolute -right-6 -top-6 text-white/10" />
        <h2 className="text-2xl font-black mb-2 relative z-10">Smart Discover</h2>
        <p className="text-indigo-100 font-medium max-w-xl relative z-10">
          We analyzed your library. Because you tend to play games that accommodate around <strong className="text-white">{avgPlayers} players</strong> and last <strong className="text-white">~{avgTime} minutes</strong>, here are the current trending hot games on BGG that perfectly match your style.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 md:gap-5">
        {recommendations.map(game => (
          <div key={game.bggId} className="bg-white rounded-2xl md:shadow-sm overflow-hidden border border-slate-200 hover:shadow-md transition-shadow flex flex-col group">
            <div className="h-48 sm:h-56 w-full overflow-hidden bg-slate-100 border-b border-slate-200 shrink-0 relative">
              {game.image ? (
                <Image src={game.image} alt={game.name} fill sizes="(max-width: 768px) 50vw, 33vw" className="object-cover group-hover:scale-105 transition-transform duration-300" unoptimized />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-400 font-bold">No Image</div>
              )}
            </div>
            <div className="p-3 sm:p-5 flex-1 flex flex-col justify-between">
              <div>
                <h3 className="font-bold text-lg sm:text-xl text-slate-900 leading-tight mb-1 line-clamp-2 min-h-[45px]">{game.name}</h3>
                <p className="text-sm font-semibold text-slate-500 mb-4">{game.year || 'Unknown Year'}</p>
                <div className="flex justify-between text-xs font-bold text-slate-700 bg-slate-100 p-2.5 rounded-lg mb-4">
                  <span>{game.minPlayers || '?'}-{game.maxPlayers || '?'} Players</span>
                  <span>{game.playTime || '?'} Mins</span>
                </div>
              </div>

              <button
                onClick={() => handleAddRec(game)}
                disabled={addingId === game.bggId}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-indigo-50 text-indigo-700 font-bold rounded-xl text-sm border border-indigo-100 hover:bg-indigo-100 transition shadow-sm disabled:opacity-50"
              >
                {addingId === game.bggId ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                Add to Library
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// --- MAIN PAGE ---
export default function Home() {
  const { user, userNickname, loading, activeGroup, userGroups, setActiveGroup } = useAuthGroup();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [games, setGames] = useState<any[]>([]);

  // VIEW & FILTER STATE
  const [currentView, setCurrentView] = useState<"library" | "recommendations">("library");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOption, setSortOption] = useState<"recent" | "alpha" | "year">("recent");
  const [playerFilter, setPlayerFilter] = useState<string>("");

  // FIX 1: Track scroll position state
  const [isScrolled, setIsScrolled] = useState(false);

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [assigningGame, setAssigningGame] = useState<any | null>(null);
  const [scoringGame, setScoringGame] = useState<any | null>(null);
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

  const selectGroupMobile = (group: any | null) => {
    setActiveGroup(group);
    setCurrentView("library");
    setIsSidebarOpen(false);
  };

  const selectRecommendations = () => {
    setActiveGroup(null);
    setCurrentView("recommendations");
    setIsSidebarOpen(false);
  };

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
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `boardgames-export.json`; a.click(); toast.success("Exported!");
    } catch (err) { }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const imported = JSON.parse(event.target?.result as string);
        const batch = writeBatch(db);
        imported.forEach((game: any) => {
          if (!game.bggId) return;
          batch.set(doc(collection(db, "userGames")), { ...game, userId: user.uid, ownerNickname: userNickname, groupIds: [], addedAt: serverTimestamp() });
        });
        await batch.commit();
        toast.success("Import successful!");
      } catch (err) { toast.error("Failed to import."); }
      if (fileInputRef.current) fileInputRef.current.value = "";
    };
    reader.readAsText(file);
  };

  // --- FILTER & SORT ENGINE ---
  let processedGames = [...games];

  if (searchQuery.trim()) {
    processedGames = processedGames.filter(g => g.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }
  if (playerFilter) {
    const targetPlayers = parseInt(playerFilter);
    processedGames = processedGames.filter(g => {
      const min = parseInt(g.minPlayers || "0");
      const max = parseInt(g.maxPlayers || "99");
      return targetPlayers >= min && targetPlayers <= max;
    });
  }

  processedGames.sort((a, b) => {
    if (sortOption === "alpha") return a.name.localeCompare(b.name);
    if (sortOption === "year") return parseInt(b.year || "0") - parseInt(a.year || "0");
    return (b.addedAt?.seconds || 0) - (a.addedAt?.seconds || 0);
  });

  const pickRandomGame = () => {
    if (processedGames.length === 0) return toast.error("No games match your current filters!");
    const randomIndex = Math.floor(Math.random() * processedGames.length);
    setRandomGameOpen(processedGames[randomIndex]);
  };


  if (loading) return <div className="min-h-screen flex items-center justify-center text-slate-700 font-bold">Loading...</div>;

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
        <div className="bg-white p-8 rounded-xl shadow-xl border border-slate-200 max-w-sm w-full text-center">
          <Library className="mx-auto text-indigo-600 mb-4" size={56} />
          <h1 className="text-3xl font-black text-slate-900 mb-2">Boardgame Tracker</h1>
          <p className="text-slate-600 font-medium mb-8">Manage and share your collection.</p>
          <button onClick={() => signInWithPopup(auth, googleProvider)} className="w-full bg-indigo-600 text-white font-bold py-3 rounded-lg hover:bg-indigo-700 transition shadow-md hover:shadow-lg">
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

      {/* MOBILE NAV */}
      <div className="md:hidden bg-white border-b border-slate-200 p-4 flex items-center justify-between shrink-0 z-20 shadow-sm">
        <h1 className="text-xl font-black text-slate-900 flex items-center gap-2"><Library size={24} className="text-indigo-600" /> Boardgame Tracker</h1>
        <button onClick={() => setIsSidebarOpen(true)} className="p-2 bg-slate-100 rounded-lg text-slate-600 hover:text-slate-900 transition"><Menu size={24} /></button>
      </div>
      {isSidebarOpen && <div className="fixed inset-0 bg-slate-900/50 z-40 md:hidden backdrop-blur-sm transition-opacity" onClick={() => setIsSidebarOpen(false)} />}

      {/* SIDEBAR: FIX 3 - Opening from the right on mobile */}
      <aside className={`fixed inset-y-0 right-0 w-72 bg-white border-l md:border-l-0 md:border-r border-slate-200 p-5 flex flex-col justify-between shadow-2xl md:shadow-sm z-50 transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="overflow-y-auto">
          <div className="flex items-center justify-between mb-8 md:block">
            <h1 className="hidden md:flex text-2xl font-black text-slate-900 items-center gap-3"><Library size={28} className="text-indigo-600" /> Boardgame Tracker</h1>
            <button className="md:hidden p-2 text-slate-500 hover:bg-slate-100 rounded-lg" onClick={() => setIsSidebarOpen(false)}><X size={24} /></button>
          </div>

          <div className="space-y-6">
            <div className="space-y-1">
              <button onClick={() => selectGroupMobile(null)} className={`w-full text-left p-3 rounded-xl flex items-center gap-3 transition-colors ${activeGroup === null && currentView === "library" ? 'bg-indigo-600 text-white font-bold shadow-md' : 'text-slate-700 font-bold hover:bg-slate-100'}`}>
                <Library size={20} className={activeGroup === null && currentView === "library" ? "text-indigo-100" : "text-indigo-500"} /> All My Games
              </button>
              <button onClick={selectRecommendations} className={`w-full text-left p-3 rounded-xl flex items-center gap-3 transition-colors ${currentView === "recommendations" ? 'bg-indigo-600 text-white font-bold shadow-md' : 'text-slate-700 font-bold hover:bg-slate-100'}`}>
                <Sparkles size={20} className={currentView === "recommendations" ? "text-indigo-100" : "text-indigo-500"} /> For You
              </button>
            </div>

            <div>
              <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 px-1">Personal Lists</h2>
              <div className="space-y-1">
                {systemGroups.map(group => (
                  <button key={group.id} onClick={() => selectGroupMobile(group)} className={`w-full text-left p-2.5 rounded-xl flex items-center gap-3 transition-colors ${activeGroup?.id === group.id && currentView === "library" ? 'bg-slate-800 text-white font-bold shadow-md' : 'text-slate-700 font-medium hover:bg-slate-100'}`}>
                    <FolderOpen size={18} className={activeGroup?.id === group.id && currentView === "library" ? "text-slate-300" : "text-slate-400"} /> {group.name}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 px-1">Friend Groups</h2>
              <div className="space-y-1">
                {customGroups.map(group => (
                  <div key={group.id} className="relative group/btn">
                    <button onClick={() => selectGroupMobile(group)} className={`w-full text-left p-2.5 pr-10 rounded-xl flex items-center gap-3 transition-colors ${activeGroup?.id === group.id && currentView === "library" ? 'bg-indigo-600 text-white font-bold shadow-md' : 'text-slate-700 font-medium hover:bg-indigo-50'}`}>
                      <Users size={18} className={activeGroup?.id === group.id && currentView === "library" ? "text-indigo-200" : "text-indigo-400"} /> <span className="truncate">{group.name}</span>
                    </button>
                    <button onClick={(e) => handleDeleteGroup(e, group.id, group.name)} className={`absolute right-2 top-1/2 -translate-y-1/2 p-1.5 transition-all rounded ${activeGroup?.id === group.id && currentView === "library" ? 'text-indigo-300 hover:text-white' : 'md:opacity-0 md:group-hover/btn:opacity-100 text-slate-400 hover:text-red-500 hover:bg-slate-200'}`} title="Delete Group"><Trash2 size={16} /></button>
                  </div>
                ))}
                <button onClick={handleCreateGroup} className="w-full text-left p-3 mt-2 text-sm text-indigo-600 font-bold flex items-center gap-2 hover:bg-indigo-50 border border-indigo-100 rounded-xl transition"><Plus size={18} /> Create New Group</button>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200">
              <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 px-1">Library Tools</h2>
              <button onClick={handleExport} className="w-full text-left p-2.5 rounded-xl flex items-center gap-3 transition-colors text-slate-700 font-medium hover:bg-slate-100">
                <Download size={18} className="text-slate-400" /> Export JSON
              </button>
              <input type="file" accept=".json" ref={fileInputRef} onChange={handleImport} className="hidden" />
              <button onClick={() => fileInputRef.current?.click()} className="w-full text-left p-2.5 rounded-xl flex items-center gap-3 transition-colors text-slate-700 font-medium hover:bg-slate-100">
                <Upload size={18} className="text-slate-400" /> Import JSON
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 pt-5 mt-4 border-t border-slate-200 shrink-0">
          <div className="relative w-10 h-10 rounded-full bg-slate-200 border border-slate-300 overflow-hidden">
            {user.photoURL && <Image src={user.photoURL} alt="Avatar" fill className="object-cover" unoptimized />}
          </div>
          <div className="flex-1 truncate"><p className="text-sm font-bold text-slate-900 truncate">{userNickname}</p></div>
          <button onClick={() => auth.signOut()} className="text-slate-400 hover:text-red-600 transition-colors p-2 rounded-lg hover:bg-red-50" title="Sign Out"><LogOut size={20} /></button>
        </div>
      </aside>

      {/* MAIN CONTENT: FIX 1 - Attached onScroll listener here */}
      <main className="flex-1 overflow-y-auto flex flex-col relative" onScroll={(e) => setIsScrolled(e.currentTarget.scrollTop > 15)}>

        {currentView === "recommendations" ? (
          <div className="p-4 md:p-8 max-w-7xl mx-auto w-full">
            <RecommendationsTab userGames={activeGroup === null ? games : []} />
          </div>
        ) : (
          <>
            {/* STICKY HEADER & TOOLBAR: Dynamically shrinks padding based on isScrolled */}
            <div className={`bg-slate-50/95 backdrop-blur z-20 sticky top-0 border-b border-slate-200 transition-all duration-300 ${isScrolled ? "p-3 shadow-sm" : "p-4 md:p-8 pb-4 md:pb-6"}`}>
              <div className="max-w-7xl mx-auto flex flex-col gap-3">

                {/* Dynamically fold and hide the Title on mobile when scrolling down */}
                <header className={`flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 transition-all duration-300 overflow-hidden ${isScrolled ? "max-h-0 opacity-0 mb-0 md:max-h-[200px] md:opacity-100 md:mb-2" : "max-h-[500px] opacity-100 mb-2"}`}>
                  <div>
                    <h2 className="text-2xl sm:text-3xl font-black text-slate-900">{activeGroup === null ? "All My Games" : activeGroup.name}</h2>
                    <p className="text-slate-600 font-medium mt-1">
                      {processedGames.length} games {activeGroup && !activeGroup.isSystem ? `• ${activeGroup.members?.length || 1} members` : ''}
                    </p>
                  </div>

                  <div className="flex flex-wrap w-full xl:w-auto gap-3">
                    {isBulkMode ? (
                      <>
                        <button onClick={() => setIsBulkMode(false)} className="flex-1 sm:flex-none bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold px-4 py-3 rounded-xl transition">Cancel Bulk</button>
                        <button disabled={selectedGameIds.length === 0} onClick={() => setIsBulkAssignModalOpen(true)} className="flex-1 sm:flex-none bg-indigo-600 disabled:bg-indigo-300 text-white font-bold px-4 py-3 rounded-xl flex items-center justify-center gap-2 shadow-sm transition">
                          <ListChecks size={20} /> Assign ({selectedGameIds.length})
                        </button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => setIsBulkMode(true)} className="flex-1 sm:flex-none bg-white hover:bg-slate-50 text-slate-700 font-bold px-4 py-3 rounded-xl flex items-center justify-center gap-2 border border-slate-300 shadow-sm transition">
                          <ListChecks size={20} /> <span className="hidden sm:inline">Bulk Edit</span>
                        </button>
                        {activeGroup && !activeGroup.isSystem && activeGroup.ownerId === user.uid && (
                          <button onClick={() => setInvitingGroup(activeGroup)} className="flex-1 sm:flex-none bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold px-4 py-3 rounded-xl flex items-center justify-center gap-2 transition border border-indigo-200">
                            <UserPlus size={20} /> <span className="hidden sm:inline">Invite</span>
                          </button>
                        )}
                        {activeGroup && (
                          <button onClick={() => setLibraryModalGroup(activeGroup)} className="flex-1 sm:flex-none bg-white hover:bg-slate-50 text-slate-700 font-bold px-4 py-3 rounded-xl flex items-center justify-center gap-2 border border-slate-300 shadow-sm transition hover:shadow">
                            <BookOpen size={20} /> <span className="hidden sm:inline">Add from Library</span>
                          </button>
                        )}
                        <button onClick={() => setIsSearchOpen(true)} className="flex-1 sm:flex-none bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-3 rounded-xl flex items-center justify-center gap-2 shadow-md transition transform hover:-translate-y-0.5">
                          <Plus size={20} /> <span className="hidden sm:inline">Search New Game</span><span className="sm:hidden">Search New</span>
                        </button>
                      </>
                    )}
                  </div>
                </header>

                {games.length > 0 && !isBulkMode && (
                  <div className="flex flex-wrap items-center gap-3 bg-white p-2 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex-1 min-w-[200px] relative">
                      <Filter size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                      <input type="text" placeholder="Filter by name..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-indigo-600 outline-none" />
                    </div>
                    <div className="w-32 relative">
                      <Users size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                      <input type="number" placeholder="Players" value={playerFilter} onChange={(e) => setPlayerFilter(e.target.value)} min="1" max="99" className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-indigo-600 outline-none" />
                    </div>
                    <div className="w-44 relative">
                      <ArrowDownAZ size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                      <select value={sortOption} onChange={(e: any) => setSortOption(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium text-slate-900 focus:ring-2 focus:ring-indigo-600 outline-none appearance-none cursor-pointer">
                        <option value="recent">Recently Added</option>
                        <option value="alpha">Alphabetical</option>
                        <option value="year">Release Year</option>
                      </select>
                    </div>
                    <button onClick={pickRandomGame} className="bg-amber-100 hover:bg-amber-200 text-amber-800 border border-amber-200 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition">
                      <Shuffle size={16} /> What to Play?
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* MAIN GRID */}
            <div className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full">
              {processedGames.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-slate-500 font-medium">
                  {games.length === 0 ? "No games here yet." : "No games match your current filters."}
                </div>
              ) : (
                <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 md:gap-5">
                  {processedGames.map(game => {
                    const isSelected = selectedGameIds.includes(game.id);
                    const iOwnIt = game.userId === user.uid;

                    return (
                      <div key={game.id} onClick={() => isBulkMode && iOwnIt && toggleBulkSelection(game.id)} className={`bg-white rounded-2xl md:shadow-sm overflow-hidden border transition-all flex flex-col group relative ${isBulkMode && iOwnIt ? 'cursor-pointer hover:shadow-md' : ''} ${isSelected ? 'border-indigo-500 ring-4 ring-indigo-500/20' : 'border-slate-200'}`}>

                        {isBulkMode && iOwnIt && (
                          <div className="absolute top-3 left-3 z-20 pointer-events-none">
                            <div className={`w-6 h-6 rounded flex items-center justify-center border-2 transition-colors ${isSelected ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white/80 border-slate-400'}`}>
                              {isSelected && <Check size={16} strokeWidth={3} />}
                            </div>
                          </div>
                        )}
                        {isBulkMode && !iOwnIt && (
                          <div className="absolute inset-0 bg-slate-100/60 z-20 flex items-center justify-center backdrop-blur-[1px]">
                            <span className="bg-slate-800 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg">Not Owner</span>
                          </div>
                        )}

                        <div className="h-48 sm:h-56 w-full overflow-hidden bg-slate-100 border-b border-slate-200 shrink-0 relative">
                          {/* Changed z-30 back down to z-10 so it slides safely under the toolbar! */}
                          {!isBulkMode && game.userId === user.uid && (
                            <button
                              onClick={(e) => handleDeleteGame(e, game)}
                              className="absolute top-2 right-2 p-2 bg-white/90 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-full shadow-sm md:opacity-0 group-hover:opacity-100 transition-all z-10"
                              title={activeGroup === null ? "Delete from Library" : "Remove from Group"}
                            >
                              <Trash2 size={16} />
                            </button>
                          )}

                          {game.image ? (
                            <Image src={game.image} alt={game.name} fill sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw" className="object-cover group-hover:scale-105 transition-transform duration-300" unoptimized />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-400 font-bold">No Image</div>
                          )}
                        </div>
                        <div className="p-2 sm:p-5 flex-1 flex flex-col justify-start md:justify-between">
                          <div>
                            <h3 className="font-bold text-lg sm:text-xl text-slate-900 leading-tight mb-1 line-clamp-2 min-h-[45px]">{game.name}</h3>
                            <p className="text-sm font-semibold text-slate-500 mb-4">{game.year || 'Unknown Year'}</p>
                            <div className="flex justify-between text-xs font-bold text-slate-700 bg-slate-100 p-2.5 rounded-lg md:mb-4">
                              <span>{game.minPlayers || '?'}-{game.maxPlayers || '?'} Players</span>
                              <span>{game.playTime || '?'} Mins</span>
                            </div>
                          </div>

                          {!isBulkMode && (
                            <div className="space-y-2">
                              <button onClick={(e) => { e.stopPropagation(); setScoringGame(game); }} className="w-full flex items-center justify-center gap-2 py-2 bg-indigo-50 text-indigo-700 font-bold rounded-xl text-sm border border-indigo-100 hover:bg-indigo-100 transition shadow-sm mt-[8px] md:mt-0">
                                <Trophy size={16} /> Scores & History
                              </button>

                              {game.userId === user.uid ? (
                                <button onClick={(e) => { e.stopPropagation(); setAssigningGame(game); }} className="w-full flex items-center justify-center gap-2 py-2 border border-slate-200 text-slate-600 font-bold rounded-xl text-sm hover:border-slate-300 hover:bg-slate-50 transition">
                                  <FolderPlus size={16} /> Assign Lists
                                </button>
                              ) : (
                                <div className="w-full flex items-center justify-center gap-2 py-2 border border-transparent text-slate-500 font-medium rounded-xl text-xs bg-slate-50">
                                  Shared by {game.ownerNickname || "a friend"}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
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
    </div>
  );
}