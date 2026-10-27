import { useState } from "react";
import { doc, writeBatch, arrayUnion } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuthGroup } from "@/components/AuthGroupProvider";
import { useModalClose } from "@/lib/useModalClose";
import { ListChecks, X, Check } from "lucide-react";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";

export function BulkAssignModal({ gameIds, onClose, onClearSelection }: { gameIds: string[], onClose: () => void, onClearSelection: () => void }) {
  const { userGroups } = useAuthGroup();
  const { t } = useTranslation();
  const [selected, setSelected] = useState<string[]>([]);
  const { overlayProps, panelProps } = useModalClose(onClose, { backdrop: true });

  const handleBulkSave = async () => {
    if (selected.length === 0) return toast.error(t('bulk.selectOne'));
    try {
      const batch = writeBatch(db);
      gameIds.forEach(id => batch.update(doc(db, "userGames", id), { groupIds: arrayUnion(...selected) }));
      await batch.commit();
      toast.success(t('bulk.success', { count: gameIds.length }));
      onClearSelection();
      onClose();
    } catch { toast.error(t('bulk.fail')); }
  };

  return (
    <div {...overlayProps} className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div {...panelProps} className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-sm flex flex-col border border-slate-200 dark:border-slate-700 animate-in fade-in zoom-in-95">
        <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50 rounded-t-xl"><h2 className="font-bold text-slate-900 dark:text-white flex items-center gap-2"><ListChecks size={18} className="text-indigo-600 dark:text-indigo-400" /> {t('bulk.title', { count: gameIds.length })}</h2><button onClick={onClose}><X size={20} className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white" /></button></div>
        <div className="p-4 space-y-2 max-h-[60vh] overflow-y-auto">
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">{t('bulk.hint')}</p>
          {userGroups.map(group => (
            <div key={group.id} onClick={() => setSelected(p => p.includes(group.id) ? p.filter(x => x !== group.id) : [...p, group.id])} className="flex items-center gap-3 p-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-lg cursor-pointer border border-transparent hover:border-slate-200 dark:hover:border-slate-600 transition">
              <div className={`w-5 h-5 rounded flex items-center justify-center border transition-colors ${selected.includes(group.id) ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300 dark:border-slate-500'}`}>
                {selected.includes(group.id) && <Check size={14} strokeWidth={3} />}
              </div>
              <span className="font-medium text-slate-700 dark:text-slate-300">{group.name}</span>
            </div>
          ))}
        </div>
        <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 rounded-b-xl flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg font-medium transition">{t('common.cancel')}</button>
          <button onClick={handleBulkSave} className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 transition shadow-sm">{t('bulk.apply')}</button>
        </div>
      </div>
    </div>
  );
}