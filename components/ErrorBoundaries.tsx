"use client";

import { ErrorBoundary } from "./ErrorBoundary";
import { GameCardSkeleton } from "./Skeletons";
import { Game } from "@/lib/types";

interface GameCardErrorBoundaryProps {
  game: Game;
  fallback?: React.ReactNode;
  children: (game: Game) => React.ReactNode;
}

export function GameCardErrorBoundary({ game, fallback, children }: GameCardErrorBoundaryProps) {
  return (
    <ErrorBoundary
      fallback={
        fallback || (
          <div className="bg-white dark:bg-slate-800 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700">
            <div className="aspect-square w-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
              <svg className="w-12 h-12 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="p-4 text-center">
              <p className="text-sm text-slate-600 dark:text-slate-400">Failed to load {game.name}</p>
            </div>
          </div>
        )
      }
    >
      {children(game)}
    </ErrorBoundary>
  );
}

interface GameGridErrorBoundaryProps {
  games: Game[];
  renderItem: (game: Game, index: number) => React.ReactNode;
  fallback?: React.ReactNode;
  className?: string;
}

export function GameGridErrorBoundary({ games, renderItem, fallback, className = "" }: GameGridErrorBoundaryProps) {
  return (
    <ErrorBoundary
      fallback={
        fallback || (
          <div className={`grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 md:gap-5 ${className}`}>
            {Array.from({ length: 8 }, (_, i) => <GameCardSkeleton key={i} />)}
          </div>
        )
      }
    >
      <div className={`grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 md:gap-5 ${className}`}>
        {games.map((game, index) => renderItem(game, index))}
      </div>
    </ErrorBoundary>
  );
}

interface ModalErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  onClose?: () => void;
}

export function ModalErrorBoundary({ children, fallback, onClose }: ModalErrorBoundaryProps) {
  return (
    <ErrorBoundary
      fallback={
        fallback || (
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md flex flex-col border border-slate-200 dark:border-slate-700 p-6 space-y-4">
            <div className="flex items-center justify-center gap-2 text-red-600 dark:text-red-400">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <h3 className="font-semibold">Failed to load modal</h3>
            </div>
            <p className="text-slate-600 dark:text-slate-400 text-center">
              Something went wrong. Please try closing and reopening.
            </p>
            {onClose && (
              <button
                onClick={onClose}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white rounded-lg font-medium hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
              >
                Close
              </button>
            )}
          </div>
        )
      }
    >
      {children}
    </ErrorBoundary>
  );
}