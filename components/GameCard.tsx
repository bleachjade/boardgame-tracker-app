import { useState } from "react";
import Image from "next/image";
import { Check, Trash2, Trophy, FolderPlus, Puzzle, Star, Pin } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Game, Group } from "@/lib/types";

function ExpansionThumb({ image }: { image?: string }) {
  const [loaded, setLoaded] = useState(false);

  return (
    <div className="w-6 h-6 relative rounded overflow-hidden shrink-0 border border-slate-200 dark:border-slate-600">
      {image ? (
        <>
          {!loaded && <div className="absolute inset-0 bg-slate-200 dark:bg-slate-700 animate-pulse" />}
          <Image
            src={image}
            fill
            className={`object-cover transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
            alt=""
            unoptimized
            onLoad={() => setLoaded(true)}
            onError={() => setLoaded(true)}
          />
        </>
      ) : (
        <div className="bg-slate-200 dark:bg-slate-700 w-full h-full" />
      )}
    </div>
  );
}

interface GameCardProps {
  game: Game; userUid: string; isBulkMode: boolean; isSelected: boolean; iOwnIt: boolean;
  activeGroup: Group | null; index: number;
  expansions?: Game[];
  userLists?: Group[]; // Added prop
  onToggleBulk: (id: string) => void; onOpenDetails: (game: Game) => void; onDelete: (e: React.MouseEvent, game: Game) => void;
  onLogScore: (e: React.MouseEvent, game: Game) => void; onAssign: (e: React.MouseEvent, game: Game) => void;
  onTogglePin: (e: React.MouseEvent, game: Game) => void;
}

export function GameCard({ game, userUid, isBulkMode, isSelected, iOwnIt, activeGroup, index, expansions = [], userLists = [], onToggleBulk, onOpenDetails, onDelete, onLogScore, onAssign, onTogglePin }: GameCardProps) {
  const { t, i18n } = useTranslation();
  const [imageLoaded, setImageLoaded] = useState(false);

  // DYNAMIC STATUS BADGE LOGIC
  let computedStatus = 'owned';
  if (userLists && game.groupIds && game.groupIds.length > 0) {
    const listNames = game.groupIds.map((id: string) => {
      const found = userLists.find(l => l.id === id);
      return found ? (found.name || "").toLowerCase() : '';
    });
    
    if (listNames.some((n: string) => n.includes('pre-order') || n.includes('preorder') || n.includes('พรีออเดอร์'))) {
      computedStatus = 'preordered';
    } else if (listNames.some((n: string) => n.includes('wishlist') || n.includes('want') || n.includes('buy') || n.includes('อยากได้'))) {
      computedStatus = 'wishlist';
    }
  }

  const statusStyles: Record<string, string> = {
    owned: "bg-emerald-100/90 text-emerald-700 border-emerald-200 dark:bg-emerald-950/80 dark:text-emerald-400 dark:border-emerald-800",
    preordered: "bg-amber-100/90 text-amber-700 border-amber-200 dark:bg-amber-950/80 dark:text-amber-400 dark:border-amber-800",
    wishlist: "bg-indigo-100/90 text-indigo-700 border-indigo-200 dark:bg-indigo-950/80 dark:text-indigo-400 dark:border-indigo-800"
  };
  
  const isThai = i18n.language.startsWith('th');
  const statusLabels: Record<string, string> = {
    owned: isThai ? "มีแล้ว" : "Owned",
    preordered: isThai ? "พรีออเดอร์" : "Pre-ordered",
    wishlist: isThai ? "อยากได้" : "Want to buy"
  };

  const ratingValue = Number.parseFloat(game.rating || "");
  const hasRating = Number.isFinite(ratingValue) && ratingValue > 0;

  return (
    <div 
      onClick={() => { if (isBulkMode && iOwnIt) onToggleBulk(game.id); else if (!isBulkMode) onOpenDetails(game); }} 
      className={`bg-white dark:bg-slate-800 rounded-2xl md:shadow-sm overflow-hidden border transition-all flex flex-col group relative ${!isBulkMode ? 'cursor-pointer hover:shadow-lg dark:hover:border-slate-500' : isBulkMode && iOwnIt ? 'cursor-pointer hover:shadow-md' : ''} ${isSelected ? 'border-indigo-500 ring-4 ring-indigo-500/20' : 'border-slate-200 dark:border-slate-700'}`}
    >
      {isBulkMode && iOwnIt && (
        <div className="absolute top-3 left-3 z-10 pointer-events-none">
          <div className={`w-6 h-6 rounded flex items-center justify-center border-2 transition-colors ${isSelected ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white/80 dark:bg-slate-800/80 border-slate-400 dark:border-slate-500'}`}>{isSelected && <Check size={16} strokeWidth={3} />}</div>
        </div>
      )}
      {isBulkMode && !iOwnIt && (
        <div className="absolute inset-0 bg-slate-100/60 dark:bg-slate-900/60 z-10 flex items-center justify-center backdrop-blur-[1px]">
          <span className="bg-slate-800 dark:bg-slate-700 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg">{t('gameCard.notOwner')}</span>
        </div>
      )}

      <div className="aspect-square w-full overflow-hidden bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 shrink-0 relative">
        {!isBulkMode && iOwnIt && (
          <button
            onClick={(e) => onTogglePin(e, game)}
            className={`absolute top-2 ${game.userId === userUid ? 'right-12' : 'right-2'} p-2 rounded-full shadow-sm transition-all z-10 ${game.isPinned ? 'bg-amber-100/90 dark:bg-amber-900/60 text-amber-600 dark:text-amber-400' : 'bg-white/90 dark:bg-slate-800/90 text-slate-400 hover:text-amber-500 dark:hover:text-amber-400 md:opacity-0 group-hover:opacity-100'}`}
            title={game.isPinned ? t('gameCard.unpin') : t('gameCard.pin')}
          >
            <Pin size={16} className={game.isPinned ? 'fill-current' : ''} />
          </button>
        )}
        {!isBulkMode && game.userId === userUid && (
          <button onClick={(e) => onDelete(e, game)} className="absolute top-2 right-2 p-2 bg-white/90 dark:bg-slate-800/90 hover:bg-red-50 dark:hover:bg-red-900/30 text-slate-400 hover:text-red-500 dark:hover:text-red-400 rounded-full shadow-sm md:opacity-0 group-hover:opacity-100 transition-all z-10" title={activeGroup === null ? t('gameCard.deleteLibrary') : t('gameCard.removeGroup')}><Trash2 size={16} /></button>
        )}
        
        {/* Status Badge */}
        <div className="absolute bottom-2 left-2 z-10 pointer-events-none">
          <span className={`text-[9px] sm:text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-md border backdrop-blur-md shadow-sm ${statusStyles[computedStatus]}`}>
            {statusLabels[computedStatus]}
          </span>
        </div>

        {game.image ? (
          <>
            {!imageLoaded && <div className="absolute inset-0 bg-slate-200 dark:bg-slate-700 animate-pulse" />}
            <Image
              src={game.image}
              alt={game.name}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 16vw"
              className={`object-cover group-hover:scale-105 transition-all duration-300 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
              unoptimized
              priority={index < 8}
              onLoad={() => setImageLoaded(true)}
              onError={() => setImageLoaded(true)}
            />
          </>
        ) : <div className="w-full h-full flex items-center justify-center text-slate-400 font-bold">{t('gameCard.noImage')}</div>}
      </div>
      
      <div className="p-2 sm:p-3 flex-1 flex flex-col justify-start md:justify-between">
        <div>
          <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white leading-tight mb-1 line-clamp-2 min-h-[38px]">{game.name}</h3>
          <div className="flex items-center justify-between gap-2 mb-2">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">{game.year || t('gameCard.unknownYear')}</p>
            {hasRating && (
              <span
                title="BoardGameGeek score"
                className="flex items-center gap-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.5 rounded-full border border-amber-200 dark:border-amber-800 shrink-0"
              >
                <Star size={10} className="fill-amber-400 text-amber-400" />
                {ratingValue.toFixed(1)}
              </span>
            )}
          </div>
          <div className="flex justify-between text-[10px] sm:text-[11px] font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-900 p-2 rounded-lg md:mb-2">
            <span>{game.minPlayers || '?'}-{game.maxPlayers || '?'} {t('gameCard.players')}</span>
            <span>{game.playTime || '?'} {t('gameCard.mins')}</span>
          </div>
        </div>

        {!isBulkMode && (
          <div className="space-y-1.5">
            <button onClick={(e) => onLogScore(e, game)} className="w-full flex items-center justify-center gap-1.5 py-1.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 font-bold rounded-lg text-xs border border-indigo-100 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition shadow-sm mt-[6px] md:mt-0"><Trophy size={14} /> {t('gameCard.logScore')}</button>
            {game.userId === userUid ? (
              <button onClick={(e) => onAssign(e, game)} className="w-full flex items-center justify-center gap-1.5 py-1.5 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-bold rounded-lg text-xs hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition"><FolderPlus size={14} /> {t('gameCard.assignLists')}</button>
            ) : (
              <div className="w-full flex items-center justify-center gap-1.5 py-1.5 border border-transparent text-slate-500 dark:text-slate-400 font-medium rounded-lg text-[11px] bg-slate-50 dark:bg-slate-900/50">{t('gameCard.sharedByFriend')}</div>
            )}
          </div>
        )}
      </div>

      {!isBulkMode && expansions && expansions.length > 0 && (
        <div className="bg-slate-50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-700 p-2 mt-auto">
          <h4 className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-1 mb-1.5"><Puzzle size={11}/> {t('gameCard.expansions')} ({expansions.length})</h4>
          <div className="space-y-1.5">
            {expansions.map(exp => (
              <div key={exp.id} onClick={(e) => { e.stopPropagation(); onOpenDetails(exp); }} className="flex items-center gap-2 hover:bg-slate-200 dark:hover:bg-slate-700/50 p-1 -mx-1 rounded-lg cursor-pointer transition">
                <ExpansionThumb image={exp.image} />                <span className="font-semibold text-xs text-slate-700 dark:text-slate-300 truncate">{exp.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}