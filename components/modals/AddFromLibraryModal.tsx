import { useState, useEffect } from "react";
import Image from "next/image";
import { collection, query, where, onSnapshot, doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuthGroup } from "@/components/AuthGroupProvider";
import { useModalClose } from "@/lib/useModalClose";
import { BookOpen, X, Check } from "lucide-react";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";

export function AddFromLibraryModal({ group, onClose }: { group: any, onClose: () => void }) {
  const { user } = useAuthGroup();
  const { t } = useTranslation();
  const [myGames, setMyGames] = useState<any[]>([]);
  const { overlayProps, panelProps } = useModalClose(onClose, { backdrop: true });

  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(
      query(collection(db, "userGames"), where("userId", "==", user.uid)),
      (snap) => setMyGames(snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))),
      (error) => {
        console.error("Failed to load library:", error);
        toast.error(t('home.failed'));
      }
    );
    return () => unsub();
  }, [user, t]);

  const toggleGameInGroup = async (game: any) => {
    const inGroup = game.groupIds?.includes(group.id);
    const newGroupIds = inGroup ? (game.groupIds || []).filter((id: string) => id !== group.id) : [...(game.groupIds || []), group.id];
    try { await updateDoc(doc(db, "userGames", game.id), { groupIds: newGroupIds }); } catch { toast.error(t('home.failed')); }
  };

  return (
    <div {...overlayProps} className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div {...panelProps} className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-md flex flex-col border border-slate-200 dark:border-slate-700 max-h-[85vh] animate-in fade-in zoom-in-95">
        <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50 rounded-t-xl"><h2 className="font-bold text-slate-900 dark:text-white flex items-center gap-2"><BookOpen size={18} className="text-indigo-600 dark:text-indigo-400" /> {t('addFromLibrary.title')}</h2><button onClick={onClose}><X size={20} className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white" /></button></div>
        <div className="p-2 overflow-y-auto flex-1">
          {myGames.length === 0 ? <div className="text-center p-8 text-slate-500 dark:text-slate-400">{t('addFromLibrary.empty')}</div> : myGames.map(game => {
            const inGroup = game.groupIds?.includes(group.id);
            return (
              <div key={game.id} onClick={() => toggleGameInGroup(game)} className="flex items-center gap-3 p-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-lg cursor-pointer border border-transparent hover:border-slate-200 dark:hover:border-slate-600 transition">
                <div className={`shrink-0 w-6 h-6 rounded flex items-center justify-center border transition-colors ${inGroup ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300 dark:border-slate-500'}`}>
                  {inGroup && <Check size={14} strokeWidth={3} />}
                </div>
                {game.image ? <div className="relative w-10 h-10 shrink-0"><Image src={game.image} alt={game.name} fill className="object-cover rounded shadow-sm" unoptimized /></div> : <div className="w-10 h-10 bg-slate-200 dark:bg-slate-700 rounded shrink-0 flex items-center justify-center text-xs font-bold text-slate-400">N/A</div>}
                <span className="font-bold text-slate-700 dark:text-slate-300 truncate flex-1">{game.name}</span>
              </div>
            );
          })}
        </div>
        <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 rounded-b-xl flex justify-end"><button onClick={onClose} className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 transition shadow-sm">{t('addFromLibrary.done')}</button></div>
      </div>
    </div>
  );
}