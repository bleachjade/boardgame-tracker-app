import Image from "next/image";
import { Check, Trash2, Trophy, FolderPlus, Puzzle } from "lucide-react";

interface GameCardProps {
  game: any; userUid: string; isBulkMode: boolean; isSelected: boolean; iOwnIt: boolean;
  activeGroup: any; index: number;
  expansions?: any[]; // NEW
  onToggleBulk: (id: string) => void; onOpenDetails: (game: any) => void; onDelete: (e: React.MouseEvent, game: any) => void;
  onLogScore: (e: React.MouseEvent, game: any) => void; onAssign: (e: React.MouseEvent, game: any) => void;
}

export function GameCard({ game, userUid, isBulkMode, isSelected, iOwnIt, activeGroup, index, expansions = [], onToggleBulk, onOpenDetails, onDelete, onLogScore, onAssign }: GameCardProps) {
  return (
    <div 
      onClick={() => { if (isBulkMode && iOwnIt) onToggleBulk(game.id); else if (!isBulkMode) onOpenDetails(game); }} 
      className={`bg-white dark:bg-slate-800 rounded-2xl md:shadow-sm overflow-hidden border transition-all flex flex-col group relative ${!isBulkMode ? 'cursor-pointer hover:shadow-lg dark:hover:border-slate-500' : isBulkMode && iOwnIt ? 'cursor-pointer hover:shadow-md' : ''} ${isSelected ? 'border-indigo-500 ring-4 ring-indigo-500/20' : 'border-slate-200 dark:border-slate-700'}`}
    >
      {isBulkMode && iOwnIt && (
        <div className="absolute top-3 left-3 z-20 pointer-events-none">
          <div className={`w-6 h-6 rounded flex items-center justify-center border-2 transition-colors ${isSelected ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white/80 dark:bg-slate-800/80 border-slate-400 dark:border-slate-500'}`}>{isSelected && <Check size={16} strokeWidth={3} />}</div>
        </div>
      )}
      {isBulkMode && !iOwnIt && (
        <div className="absolute inset-0 bg-slate-100/60 dark:bg-slate-900/60 z-20 flex items-center justify-center backdrop-blur-[1px]">
          <span className="bg-slate-800 dark:bg-slate-700 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg">Not Owner</span>
        </div>
      )}

      <div className="h-48 sm:h-56 w-full overflow-hidden bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 shrink-0 relative">
        {!isBulkMode && game.userId === userUid && (
          <button onClick={(e) => onDelete(e, game)} className="absolute top-2 right-2 p-2 bg-white/90 dark:bg-slate-800/90 hover:bg-red-50 dark:hover:bg-red-900/30 text-slate-400 hover:text-red-500 dark:hover:text-red-400 rounded-full shadow-sm md:opacity-0 group-hover:opacity-100 transition-all z-10" title={activeGroup === null ? "Delete from Library" : "Remove from Group"}><Trash2 size={16} /></button>
        )}
        {game.image ? <Image src={game.image} alt={game.name} fill sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw" className="object-cover group-hover:scale-105 transition-transform duration-300" unoptimized priority={index < 8} /> : <div className="w-full h-full flex items-center justify-center text-slate-400 font-bold">No Image</div>}
      </div>
      
      <div className="p-2 sm:p-5 flex-1 flex flex-col justify-start md:justify-between">
        <div>
          <h3 className="font-bold text-lg sm:text-xl text-slate-900 dark:text-white leading-tight mb-1 line-clamp-2 min-h-[45px]">{game.name}</h3>
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-4">{game.year || 'Unknown Year'}</p>
          <div className="flex justify-between text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-900 p-2.5 rounded-lg md:mb-4">
            <span>{game.minPlayers || '?'}-{game.maxPlayers || '?'} Players</span>
            <span>{game.playTime || '?'} Mins</span>
          </div>
        </div>

        {!isBulkMode && (
          <div className="space-y-2">
            <button onClick={(e) => onLogScore(e, game)} className="w-full flex items-center justify-center gap-2 py-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 font-bold rounded-xl text-sm border border-indigo-100 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition shadow-sm mt-[8px] md:mt-0"><Trophy size={16} /> Log Score</button>
            {game.userId === userUid ? (
              <button onClick={(e) => onAssign(e, game)} className="w-full flex items-center justify-center gap-2 py-2 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-bold rounded-xl text-sm hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition"><FolderPlus size={16} /> Assign Lists</button>
            ) : (
              <div className="w-full flex items-center justify-center gap-2 py-2 border border-transparent text-slate-500 dark:text-slate-400 font-medium rounded-xl text-xs bg-slate-50 dark:bg-slate-900/50">Shared by friend</div>
            )}
          </div>
        )}
      </div>

      {/* NEW: Render Nested Expansions */}
      {!isBulkMode && expansions && expansions.length > 0 && (
        <div className="bg-slate-50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-700 p-3 mt-auto">
          <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-1 mb-2"><Puzzle size={12}/> Expansions ({expansions.length})</h4>
          <div className="space-y-2">
            {expansions.map(exp => (
              <div key={exp.id} onClick={(e) => { e.stopPropagation(); onOpenDetails(exp); }} className="flex items-center gap-2.5 hover:bg-slate-200 dark:hover:bg-slate-700/50 p-1.5 -mx-1.5 rounded-lg cursor-pointer transition">
                <div className="w-7 h-7 relative rounded overflow-hidden shrink-0 border border-slate-200 dark:border-slate-600">
                  {exp.image ? <Image src={exp.image} fill className="object-cover" alt="" unoptimized /> : <div className="bg-slate-200 dark:bg-slate-700 w-full h-full" />}
                </div>
                <span className="font-semibold text-sm text-slate-700 dark:text-slate-300 truncate">{exp.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}