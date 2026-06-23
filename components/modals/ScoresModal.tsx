"use client";

import { useState, useEffect, useRef } from "react";
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, orderBy, doc, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuthGroup } from "@/components/AuthGroupProvider";
import { Trophy, X, Calculator, History, Calendar, Plus, Users, Image as ImageIcon, CheckCircle, XCircle, Trash2, Mic, MicOff } from "lucide-react";
import { calculateScoreString } from "@/lib/utils";
import toast from "react-hot-toast";

export function ScoresModal({ game, onClose }: { game: any; onClose: () => void }) {
  const { user, userNickname } = useAuthGroup();
  const [activeTab, setActiveTab] = useState<"log" | "history">("log");
  const [history, setHistory] = useState<any[]>([]);
  
  // Advanced Logging State
  const [isCoop, setIsCoop] = useState(false);
  const [coopResult, setCoopResult] = useState<"win" | "loss">("win");
  const [teamScore, setTeamScore] = useState("");
  const [memoryPhoto, setMemoryPhoto] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [players, setPlayers] = useState([{ name: userNickname || "Player 1", scoreInput: "" }]);
  const [listeningIdx, setListeningIdx] = useState<number | null>(null);

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

  const quickIncrement = (index: number, amount: number) => {
    const currentInput = players[index].scoreInput.trim();
    if (!currentInput) {
      updatePlayer(index, "scoreInput", String(amount));
    } else if (/^\d+$/.test(currentInput)) {
      updatePlayer(index, "scoreInput", String(Number(currentInput) + amount));
    } else {
      updatePlayer(index, "scoreInput", `${currentInput}+${amount}`);
    }
  };

  // --- NEW FEATURE: WEB SPEECH VOICE-TO-MATH SMART RECOGNITION ---
  const handleVoiceInput = (index: number) => {
    const windowSupported = typeof window !== "undefined";
    const SpeechRecognition = windowSupported && ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
    
    if (!SpeechRecognition) {
      toast.error("Speech input is unsupported on this browser. Try Safari or Chrome mobile!");
      return;
    }

    if (listeningIdx === index) {
      setListeningIdx(null);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "th-TH"; // Thai language parser captures native words + basic international digits flawlessly
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setListeningIdx(index);
      toast("Listening for score numbers...", { icon: "🎙️", duration: 2000 });
    };

    recognition.onresult = (event: any) => {
      let transcript = event.results[0][0].transcript;
      
      // Smart formatting maps text language phrases into mathematical operators
      let mathExpression = transcript
        .toLowerCase()
        .replace(/บวก|และ|และก็|กับ|แถม|plus|and/g, "+")
        .replace(/ลบ|หักออก|minus/g, "-")
        .replace(/เท่ากับ|ได้|equals/g, "")
        .replace(/\s+/g, ""); // Remove trailing text space arrays
      
      // Quick fallback validation checking for mathematical sanity before processing state changes
      if (!/[0-9+\-*/]/.test(mathExpression)) {
        toast.error(`Couldn't resolve number values from: "${transcript}"`);
        return;
      }

      const currentText = players[index].scoreInput.trim();
      const updatedString = currentText 
        ? `${currentText}${mathExpression.startsWith("+") || mathExpression.startsWith("-") ? "" : "+"}${mathExpression}`
        : mathExpression;

      updatePlayer(index, "scoreInput", updatedString);
      toast.success("Voice score loaded!");
    };

    recognition.onerror = (e: any) => {
      console.error("Speech compilation runtime fault: ", e.error);
      toast.error("Audio recording timed out or failed.");
      setListeningIdx(null);
    };

    recognition.onend = () => {
      setListeningIdx(null);
    };

    recognition.start();
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_WIDTH = 800;
        const scaleSize = MAX_WIDTH / img.width;
        canvas.width = MAX_WIDTH;
        canvas.height = img.height * scaleSize;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
        setMemoryPhoto(canvas.toDataURL("image/jpeg", 0.7)); 
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSavePlay = async () => {
    if (!user) return;
    
    const finalScores = players.map(p => ({
      name: p.name.trim() || "Anonymous",
      score: isCoop ? 0 : calculateScoreString(p.scoreInput),
      rawExpression: isCoop ? "" : p.scoreInput
    }));

    try {
      await addDoc(collection(db, "gamePlays"), { 
        userId: user.uid, 
        loggedBy: userNickname, 
        gameId: game.id, 
        bggId: game.bggId, 
        gameName: game.name, 
        players: finalScores, 
        isCoop,
        coopResult: isCoop ? coopResult : null,
        teamScore: isCoop ? calculateScoreString(teamScore) : null,
        memoryPhoto,
        playedAt: serverTimestamp() 
      });
      toast.success("Game play session logged!");
      onClose();
    } catch (err) { toast.error("Failed to save match scoring details."); }
  };

  const handleDeletePlay = async (playId: string) => {
    if (!confirm("Are you sure you want to permanently delete this match record?")) return;
    try {
      await deleteDoc(doc(db, "gamePlays", playId));
      toast.success("Match record deleted!");
    } catch (err) {
      toast.error("Failed to delete match record.");
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg flex flex-col border border-slate-200 dark:border-slate-700 max-h-[85vh]">
        
        {/* Header */}
        <div className="p-4 border-b dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50 rounded-t-2xl shrink-0">
          <h2 className="font-black text-slate-900 dark:text-white text-lg flex items-center gap-2 truncate max-w-[320px]">
            <Trophy className="text-amber-500 shrink-0" size={20} /> {game.name}
          </h2>
          <button onClick={onClose}><X size={20} className="text-slate-500 hover:text-slate-900 dark:hover:text-white" /></button>
        </div>
        
        {/* Navigation Tabs */}
        <div className="flex border-b dark:border-slate-700 text-sm font-bold text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-800 shrink-0">
          <button onClick={() => setActiveTab("log")} className={`flex-1 py-3 text-center border-b-2 flex items-center justify-center gap-2 transition-colors ${activeTab === "log" ? "border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30" : "border-transparent hover:bg-slate-50 dark:hover:bg-slate-700/50"}`}><Calculator size={16} /> Log Match</button>
          <button onClick={() => setActiveTab("history")} className={`flex-1 py-3 text-center border-b-2 flex items-center justify-center gap-2 transition-colors ${activeTab === "history" ? "border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30" : "border-transparent hover:bg-slate-50 dark:hover:bg-slate-700/50"}`}><History size={16} /> History ({history.length})</button>
        </div>

        {/* Form Body */}
        <div className="p-4 overflow-y-auto flex-1 bg-slate-50 dark:bg-slate-900/50">
          {activeTab === "log" ? (
            <div className="space-y-5">
              
              <div className="flex bg-slate-200 dark:bg-slate-700 p-1 rounded-xl">
                <button onClick={() => setIsCoop(false)} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${!isCoop ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm" : "text-slate-500 dark:text-slate-400 hover:text-slate-700"}`}>Competitive</button>
                <button onClick={() => setIsCoop(true)} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${isCoop ? "bg-indigo-600 text-white shadow-sm" : "text-slate-500 dark:text-slate-400 hover:text-slate-700"}`}>Co-op Mode</button>
              </div>

              {isCoop && (
                <div className="flex gap-3">
                  <button onClick={() => setCoopResult("win")} className={`flex-1 py-3 rounded-xl border-2 font-black flex flex-col items-center justify-center gap-1.5 transition-all shadow-sm ${coopResult === "win" ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 ring-2 ring-emerald-500/20" : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-400"}`}><CheckCircle size={22} /> <span>Victory</span></button>
                  <button onClick={() => setCoopResult("loss")} className={`flex-1 py-3 rounded-xl border-2 font-black flex flex-col items-center justify-center gap-1.5 transition-all shadow-sm ${coopResult === "loss" ? "border-red-500 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 ring-2 ring-red-500/20" : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-400"}`}><XCircle size={22} /> <span>Defeat</span></button>
                </div>
              )}

              <div className="space-y-3">
                <h3 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{isCoop ? "Players Involved" : "Player Scores"}</h3>
                
                {players.map((player, idx) => (
                  <div key={idx} className="bg-white dark:bg-slate-800 p-3 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm space-y-2.5 animate-in fade-in slide-in-from-bottom-2 duration-200">
                    
                    <div className="flex gap-2 items-center">
                      <input type="text" placeholder="Player Name" value={player.name} onChange={(e) => updatePlayer(idx, "name", e.target.value)} className="flex-1 min-w-[90px] border border-slate-200 dark:border-slate-700 bg-transparent p-2 text-sm rounded-lg text-slate-900 dark:text-white font-bold outline-none focus:ring-2 focus:ring-indigo-600" />
                      
                      {!isCoop && (
                        <div className="flex gap-1.5 items-center shrink-0">
                          {/* NEW ACTION: Microphone Web-Audio Input Trigger */}
                          <button 
                            type="button"
                            onClick={() => handleVoiceInput(idx)}
                            className={`p-2 rounded-lg border text-sm transition-all shadow-xs shrink-0 ${listeningIdx === idx ? "bg-red-500 border-red-600 text-white animate-pulse" : "bg-slate-50 hover:bg-slate-100 border-slate-200 dark:bg-slate-700 dark:border-slate-600 text-slate-500 dark:text-slate-300 dark:hover:bg-slate-600"}`}
                            title="Dictate score via voice"
                          >
                            {listeningIdx === idx ? <MicOff size={16}/> : <Mic size={16} />}
                          </button>

                          <div className="relative w-32">
                            <input type="text" placeholder="Score" value={player.scoreInput} onChange={(e) => updatePlayer(idx, "scoreInput", e.target.value)} className="w-full border border-slate-200 dark:border-slate-700 p-2 pr-12 text-sm rounded-lg text-right font-black bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-800 outline-none focus:ring-2 focus:ring-indigo-600" />
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/50 px-1.5 py-0.5 rounded border border-indigo-100 dark:border-indigo-800 shadow-sm">={calculateScoreString(player.scoreInput)}</span>
                          </div>
                        </div>
                      )}
                      {players.length > 1 && <button onClick={() => removePlayerRow(idx)} className="text-slate-400 hover:text-red-500 dark:hover:text-red-400 p-1 shrink-0"><X size={18} /></button>}
                    </div>

                    {!isCoop && (
                      <div className="flex justify-end gap-1.5 pt-0.5 border-t border-slate-100 dark:border-slate-700/50">
                        {player.scoreInput.includes("+") && (
                          <span className="text-[10px] font-bold text-slate-400 mr-auto self-center truncate max-w-[140px]">Preview: {player.scoreInput}</span>
                        )}
                        <button type="button" onClick={() => quickIncrement(idx, 1)} className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 font-black text-xs rounded-md transition shadow-xs">+1</button>
                        <button type="button" onClick={() => quickIncrement(idx, 5)} className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 font-black text-xs rounded-md transition shadow-xs">+5</button>
                        <button type="button" onClick={() => quickIncrement(idx, 10)} className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 font-black text-xs rounded-md transition shadow-xs">+10</button>
                      </div>
                    )}

                  </div>
                ))}
              </div>
              
              <button onClick={addPlayerRow} className="w-full py-2.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-sm flex items-center justify-center gap-2 shadow-sm transition"><Plus size={16} /> Add Player Row</button>

              <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                <input type="file" accept="image/*" ref={fileInputRef} onChange={handlePhotoUpload} className="hidden" />
                {memoryPhoto ? (
                  <div className="relative w-full h-36 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm group">
                    <img src={memoryPhoto} alt="Memory" className="w-full h-full object-cover" />
                    <button onClick={() => setMemoryPhoto(null)} className="absolute top-2 right-2 p-1.5 bg-slate-900/70 hover:bg-red-600 text-white rounded-full shadow transition-all"><X size={16}/></button>
                  </div>
                ) : (
                  <button onClick={() => fileInputRef.current?.click()} className="w-full py-3.5 border-2 border-dashed border-slate-300 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:border-indigo-400 dark:hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition">
                    <ImageIcon size={18} /> Attach Memory Photo
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {history.length === 0 ? <div className="text-center py-8 text-slate-500 dark:text-slate-400 font-medium">No recorded matches found.</div> : history.map((record) => {
                const maxScore = Math.max(...record.players.map((p: any) => Number(p.score || 0)));
                const sortedPlayers = [...record.players].sort((a: any, b: any) => Number(b.score || 0) - Number(a.score || 0));
                
                return (
                  <div key={record.id} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 shadow-sm space-y-3 relative group/card">
                    <div className="flex justify-between items-center text-xs text-slate-500 dark:text-slate-400 font-bold border-b dark:border-slate-700 pb-2 border-slate-100">
                      <span className="flex items-center gap-1"><Calendar size={14} /> {record.playedAt?.toDate() ? new Date(record.playedAt.toDate()).toLocaleDateString() : "Just now"}</span>
                      
                      <div className="flex items-center gap-2">
                        <span>Logged by {record.loggedBy || "Friend"}</span>
                        {user && record.userId === user.uid && (
                          <button 
                            onClick={() => handleDeletePlay(record.id)} 
                            className="text-slate-400 hover:text-red-500 transition-colors p-0.5 md:opacity-0 group-hover/card:opacity-100"
                            title="Delete Match History Instance"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>

                    {record.isCoop ? (
                      <div className="text-center py-2 border-b dark:border-slate-700 border-slate-100">
                        {record.coopResult === "win" ? (
                          <span className="text-emerald-600 dark:text-emerald-400 font-black flex items-center justify-center gap-1.5"><CheckCircle size={16}/> Co-op Victory</span>
                        ) : (
                          <span className="text-red-600 dark:text-red-400 font-black flex items-center justify-center gap-1.5"><XCircle size={16}/> Co-op Defeat</span>
                        )}
                      </div>
                    ) : null}

                    <div className="space-y-1.5">
                      {record.isCoop ? (
                         <div className="text-sm font-medium text-slate-600 dark:text-slate-300 flex items-center gap-2 flex-wrap">
                           <Users size={14} /> {record.players.map((p:any) => p.name).join(", ")}
                         </div>
                      ) : (
                        sortedPlayers.map((p: any, pIdx: number) => (
                          <div key={pIdx} className="flex justify-between items-center text-sm font-semibold">
                            <span className="text-slate-700 dark:text-slate-200 flex items-center gap-1.5">{Number(p.score) === maxScore && maxScore > 0 && <Trophy className="text-amber-500 shrink-0" size={14} />} {p.name}</span>
                            <div className="text-right">
                              <span className="font-black text-slate-900 dark:text-white">{p.score} pts</span>
                              {p.rawExpression && p.rawExpression !== String(p.score) && <span className="block text-[10px] text-slate-400 dark:text-slate-500 font-normal">({p.rawExpression})</span>}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                    
                    {record.memoryPhoto && (
                      <div className="mt-3 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 max-h-40">
                        <img src={record.memoryPhoto} alt="Memory" className="w-full h-full object-cover" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
        
        {/* Footer Actions */}
        <div className="p-4 border-t dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 rounded-b-2xl flex justify-end gap-2 shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl font-medium transition">Close</button>
          {activeTab === "log" && <button onClick={handleSavePlay} className="px-5 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition shadow-sm">Save Match Log</button>}
        </div>

      </div>
    </div>
  );
}