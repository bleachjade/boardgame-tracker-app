import { useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuthGroup } from "@/components/AuthGroupProvider";
import { FolderPlus, X, Check } from "lucide-react";
import toast from "react-hot-toast";

export function AssignModal({ game, onClose }: { game: any, onClose: () => void }) {
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