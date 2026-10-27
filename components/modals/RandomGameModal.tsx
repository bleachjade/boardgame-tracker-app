import Image from "next/image";
import { Shuffle, X } from "lucide-react";
import { useModalClose } from "@/lib/useModalClose";
import { useTranslation } from "react-i18next";

export function RandomGameModal({ game, onClose }: { game: any; onClose: () => void }) {
  const { t } = useTranslation();
  const { overlayProps, panelProps } = useModalClose(onClose, { backdrop: true });

  return (
    <div {...overlayProps} className="fixed inset-0 bg-slate-900/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in zoom-in duration-300">
      <div {...panelProps} className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-sm flex flex-col overflow-hidden text-center">
        <div className="bg-indigo-600 p-6 text-white relative">
          <button onClick={onClose} className="absolute top-4 right-4 text-white/70 hover:text-white"><X size={24} /></button>
          <Shuffle size={40} className="mx-auto mb-2 text-indigo-200" />
          <h2 className="text-2xl font-black">{t('random.title')}</h2>
        </div>
        <div className="p-8 flex flex-col items-center">
          <div className="w-40 h-40 relative rounded-xl overflow-hidden shadow-lg mb-6 border border-slate-200 dark:border-slate-700">
            {game.image ? <Image src={game.image} alt={game.name} fill className="object-cover" unoptimized /> : <div className="w-full h-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-400 font-bold">N/A</div>}
          </div>
          <h3 className="text-2xl font-black text-slate-900 dark:text-white leading-tight mb-2">{game.name}</h3>
          <div className="flex justify-center gap-4 text-sm font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-900 px-4 py-2 rounded-full">
            <span>{game.minPlayers || '?'}-{game.maxPlayers || '?'} {t('search.players')}</span>
            <span>{game.playTime || '?'} {t('search.mins')}</span>
          </div>
        </div>
        <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-700">
          <button onClick={onClose} className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition shadow-sm">{t('random.letsGo')}</button>
        </div>
      </div>
    </div>
  );
}