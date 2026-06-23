import Image from "next/image";
import { auth } from "@/lib/firebase";
import { useAuthGroup } from "@/components/AuthGroupProvider";
import { Library, Sparkles, BarChart3, FolderOpen, Users, Trash2, Plus, Copy, ClipboardPaste, LogOut, X } from "lucide-react";

interface SidebarProps {
  currentView: string;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
  selectGroupMobile: (group: any | null) => void;
  selectTab: (tab: "recommendations" | "analytics" | "library") => void;
  handleCreateGroup: () => void;
  handleDeleteGroup: (e: React.MouseEvent, groupId: string, groupName: string) => void;
  handleExport: () => void;
  handleImport: () => void;
}

export function Sidebar({
  currentView, isSidebarOpen, setIsSidebarOpen, selectGroupMobile, selectTab,
  handleCreateGroup, handleDeleteGroup, handleExport, handleImport
}: SidebarProps) {
  const { user, userNickname, activeGroup, userGroups } = useAuthGroup();

  if (!user) return null;

  const systemGroups = userGroups.filter(g => g.isSystem);
  const customGroups = userGroups.filter(g => !g.isSystem);

  return (
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
            <button onClick={() => selectTab("recommendations")} className={`w-full text-left p-3 rounded-xl flex items-center gap-3 transition-colors ${currentView === "recommendations" ? 'bg-indigo-600 text-white font-bold shadow-md' : 'text-slate-700 font-bold hover:bg-slate-100'}`}>
              <Sparkles size={20} className={currentView === "recommendations" ? "text-indigo-100" : "text-indigo-500"} /> For You
            </button>
            <button onClick={() => selectTab("analytics")} className={`w-full text-left p-3 rounded-xl flex items-center gap-3 transition-colors ${currentView === "analytics" ? 'bg-indigo-600 text-white font-bold shadow-md' : 'text-slate-700 font-bold hover:bg-slate-100'}`}>
              <BarChart3 size={20} className={currentView === "analytics" ? "text-indigo-100" : "text-indigo-500"} /> Leaderboards
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
            <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 px-1">App Tools</h2>
            <button onClick={handleExport} className="w-full text-left p-2.5 rounded-xl flex items-center gap-3 transition-colors text-slate-700 font-medium hover:bg-slate-100">
              <Copy size={18} className="text-slate-400" /> Copy Export Data
            </button>
            <button onClick={handleImport} className="w-full text-left p-2.5 rounded-xl flex items-center gap-3 transition-colors text-slate-700 font-medium hover:bg-slate-100">
              <ClipboardPaste size={18} className="text-slate-400" /> Import from Clipboard
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
  );
}