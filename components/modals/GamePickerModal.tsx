"use client";

import Image from "next/image";
import { X, Trophy } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Game } from "@/lib/types";
import { useModalClose } from "@/lib/useModalClose";

interface GamePickerModalProps {
  games: Game[];
  onPick: (game: Game) => void;
  onClose: () => void;
}

export function GamePickerModal({ games, onPick, onClose }: GamePickerModalProps) {
  const { t } = useTranslation();
  const { overlayProps, panelProps } = useModalClose(onClose, { backdrop: true });

  const pickableGames = games.filter((game) => !game.isExpansion && game.image);

  return (
    <div {...overlayProps} className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/60 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <div {...panelProps} className="flex max-h-[85vh] w-full max-w-lg flex-col rounded-t-2xl border border-slate-200 bg-white shadow-2xl animate-in fade-in slide-in-from-bottom-2 dark:border-slate-700 dark:bg-slate-800 sm:rounded-2xl">
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900/50 rounded-t-2xl">
          <h2 className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
            <Trophy size={18} className="text-indigo-600 dark:text-indigo-400" /> {t("scores.pickGame")}
          </h2>
          <button onClick={onClose} aria-label={t("common.cancel")} className="rounded-lg p-1 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white">
            <X size={20} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-3 custom-scrollbar">
          {pickableGames.length === 0 ? (
            <p className="py-12 text-center text-sm font-medium text-slate-400">{t("scores.pickGameEmpty")}</p>
          ) : (
            <div className="grid grid-cols-3 gap-2 min-[400px]:grid-cols-4 sm:grid-cols-5">
              {pickableGames.map((game) => (
                <button
                  key={game.id}
                  type="button"
                  onClick={() => onPick(game)}
                  title={game.name}
                  aria-label={game.name}
                  className="group relative aspect-square overflow-hidden rounded-xl border border-slate-200 bg-slate-100 shadow-xs transition active:scale-95 dark:border-slate-700 dark:bg-slate-900"
                >
                  <Image
                    src={game.image as string}
                    alt={game.name}
                    fill
                    sizes="(max-width: 640px) 33vw, 20vw"
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                    unoptimized
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
