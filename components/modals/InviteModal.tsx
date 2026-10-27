import { useState } from "react";
import { doc, updateDoc, arrayUnion } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useModalClose } from "@/lib/useModalClose";
import { UserPlus, X } from "lucide-react";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";

export function InviteModal({ group, onClose }: { group: any, onClose: () => void }) {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const { overlayProps, panelProps } = useModalClose(onClose, { backdrop: true });

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await updateDoc(doc(db, "groups", group.id), { members: arrayUnion(email.trim().toLowerCase()) });
      toast.success(t('invite.success', { email }));
      onClose();
    } catch { toast.error(t('invite.fail')); } finally { setLoading(false); }
  };

  return (
    <div {...overlayProps} className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div {...panelProps} className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-md flex flex-col border border-slate-200 dark:border-slate-700 animate-in fade-in zoom-in-95">
        <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50 rounded-t-xl"><h2 className="font-bold text-slate-900 dark:text-white flex items-center gap-2"><UserPlus size={18} className="text-indigo-600 dark:text-indigo-400" /> {t('invite.title', { name: group.name })}</h2><button onClick={onClose}><X size={20} className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white" /></button></div>
        <form onSubmit={handleInvite} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">{t('invite.emailLabel')}</label>
            <input type="email" required placeholder="friend@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 p-3 rounded-lg outline-none focus:ring-2 focus:ring-indigo-600 text-slate-900 dark:text-white font-medium" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg font-medium transition">{t('common.cancel')}</button>
            <button type="submit" disabled={loading} className="px-5 py-2 bg-indigo-600 disabled:bg-indigo-400 text-white rounded-lg font-bold hover:bg-indigo-700 transition shadow-sm">{loading ? t('invite.sending') : t('invite.send')}</button>
          </div>
        </form>
      </div>
    </div>
  );
}