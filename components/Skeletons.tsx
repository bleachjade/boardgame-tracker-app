"use client";

export function GameCardSkeleton() {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 animate-pulse">
      <div className="aspect-square w-full bg-slate-200 dark:bg-slate-700" />
      <div className="p-3 sm:p-5 space-y-3">
        <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-3/4" />
        <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/4" />
        <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-full" />
        <div className="h-10 bg-slate-200 dark:bg-slate-700 rounded w-full" />
        <div className="h-10 bg-slate-200 dark:bg-slate-700 rounded w-full" />
      </div>
    </div>
  );
}

export function GameGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 md:gap-5 items-start">
      {Array.from({ length: count }, (_, i) => (
        <GameCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function GameListSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="bg-white dark:bg-slate-800 p-3 border border-slate-200 dark:border-slate-700 rounded-xl animate-pulse flex items-center gap-3">
          <div className="w-12 h-12 bg-slate-200 dark:bg-slate-700 rounded-lg shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4" />
            <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/2" />
          </div>
          <div className="w-10 h-10 bg-slate-200 dark:bg-slate-700 rounded-xl shrink-0" />
        </div>
      ))}
    </div>
  );
}

export function ModalSkeleton() {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md flex flex-col border border-slate-200 dark:border-slate-700 animate-pulse p-6 space-y-4">
      <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-1/3" />
      <div className="h-40 bg-slate-200 dark:bg-slate-700 rounded-xl" />
      <div className="space-y-3">
        <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/2" />
        <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4" />
        <div className="h-10 bg-slate-200 dark:bg-slate-700 rounded w-full" />
        <div className="h-10 bg-slate-200 dark:bg-slate-700 rounded w-full" />
      </div>
    </div>
  );
}

export function SearchResultsSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50 dark:bg-slate-900/50 rounded-b-xl">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="flex gap-4 p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl items-center animate-pulse">
          <div className="w-16 h-16 bg-slate-200 dark:bg-slate-700 rounded-xl shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded w-1/2" />
            <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/3" />
          </div>
          <div className="w-10 h-10 bg-slate-200 dark:bg-slate-700 rounded-full shrink-0" />
        </div>
      ))}
    </div>
  );
}

export function SidebarSkeleton() {
  return (
    <aside className="fixed inset-y-0 right-0 w-72 bg-white dark:bg-slate-800 border-l md:border-l-0 md:border-r border-slate-200 dark:border-slate-700 p-5 flex flex-col justify-between shadow-2xl md:shadow-sm z-50 animate-pulse">
      <div className="overflow-y-auto space-y-6">
        <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-1/2 mb-8" />
        <div className="space-y-3">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="h-12 bg-slate-200 dark:bg-slate-700 rounded-xl" />
          ))}
        </div>
        <div className="space-y-3 pt-4 border-t border-slate-200 dark:border-slate-700">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="h-10 bg-slate-200 dark:bg-slate-700 rounded-xl" />
          ))}
        </div>
      </div>
      <div className="flex items-center gap-2 pt-5 mt-4 border-t border-slate-200 dark:border-slate-700">
        <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700" />
        <div className="flex-1">
          <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/3" />
        </div>
        <div className="h-10 w-10 bg-slate-200 dark:bg-slate-700 rounded-lg" />
        <div className="h-10 w-10 bg-slate-200 dark:bg-slate-700 rounded-lg" />
      </div>
    </aside>
  );
}

export function GameNightCardSkeleton() {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col md:flex-row animate-pulse">
      <div className="p-5 md:w-1/3 bg-slate-50 dark:bg-slate-900/40 border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-700 space-y-4">
        <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/4" />
        <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-3/4" />
        <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-full" />
        <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/2" />
        <div className="h-10 bg-slate-200 dark:bg-slate-700 rounded w-full" />
        <div className="h-10 bg-slate-200 dark:bg-slate-700 rounded w-full" />
        <div className="h-10 bg-slate-200 dark:bg-slate-700 rounded w-full" />
      </div>
      <div className="p-5 flex-1 space-y-4">
        <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/4" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="h-24 bg-slate-200 dark:bg-slate-700 rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}

export function RecommendationCardSkeleton() {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 animate-pulse flex flex-col">
      <div className="h-48 sm:h-56 w-full bg-slate-200 dark:bg-slate-900" />
      <div className="p-3 sm:p-5 flex-1 flex flex-col justify-between space-y-4">
        <div className="space-y-2">
          <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-3/4" />
          <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/4" />
          <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-full" />
        </div>
        <div className="h-10 bg-slate-200 dark:bg-slate-700 rounded w-full" />
      </div>
    </div>
  );
}

export function ProfileCardSkeleton() {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-5 space-y-4 animate-pulse">
      <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-1/3" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/2" />
          <div className="h-32 bg-slate-200 dark:bg-slate-700 rounded-xl" />
        </div>
        <div className="space-y-4">
          <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/2" />
          <div className="h-32 bg-slate-200 dark:bg-slate-700 rounded-xl" />
        </div>
      </div>
    </div>
  );
}