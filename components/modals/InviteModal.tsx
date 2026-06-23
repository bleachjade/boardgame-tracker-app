import { useState } from "react";
import { doc, updateDoc, arrayUnion } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { UserPlus, X } from "lucide-react";
import toast from "react-hot-toast";

export function InviteModal({ group, onClose }: { group: any, onClose: () => void }) {
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