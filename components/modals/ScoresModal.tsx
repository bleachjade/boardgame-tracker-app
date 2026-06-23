import { useState, useEffect } from "react";
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuthGroup } from "@/components/AuthGroupProvider";
import { Trophy, X, Calculator, History, Calendar, Plus } from "lucide-react";
import { calculateScoreString } from "@/lib/utils";
import toast from "react-hot-toast";

export function ScoresModal({ game, onClose }: { game: any; onClose: () => void }) {
  const { user, userNickname } = useAuthGroup();
  const [activeTab, setActiveTab] = useState<"log" | "history">("log");
  const [history, setHistory] = useState<any[]>([]);
  const [players, setPlayers] = useState([{ name: userNickname || "Player 1", scoreInput: "" }]);

  useEffect(() => {
    const q = query(collection(db, "gamePlays"), where("bggId", "==", game.bggId), orderBy("playedAt", "desc"));
    const unsub = onSnapshot(q, (snap) => setHistory(snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))));
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
    const finalScores = players.map(p => ({ name: p.name.trim() || "Anonymous", score: calculateScoreString(p.scoreInput), rawExpression: p.scoreInput }));
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
          <h2 className="font-black text-slate-900 text-lg flex items-center gap-2 truncate max-w-[320px]"><Trophy className="text-amber-500 shrink-0" size={20} /> {game.name}</h2>
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