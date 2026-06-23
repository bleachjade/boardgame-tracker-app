import { useState, useEffect } from "react";
import Image from "next/image";
import { collection, query, where, onSnapshot, doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuthGroup } from "@/components/AuthGroupProvider";
import { BookOpen, X, Check } from "lucide-react";

export function AddFromLibraryModal({ group, onClose }: { group: any, onClose: () => void }) {
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