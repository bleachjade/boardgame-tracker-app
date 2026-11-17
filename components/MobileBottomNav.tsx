"use client";

import { Library, Sparkles, BarChart3, UserCheck, Trophy } from "lucide-react";
import { useTranslation } from "react-i18next";

type MobileTab = "library" | "recommendations" | "analytics" | "friends" | "events";

interface MobileBottomNavProps {
  currentView: MobileTab;
  onSelect: (tab: MobileTab) => void;
  onLogScore: () => void;
}

export function MobileBottomNav({ currentView, onSelect, onLogScore }: MobileBottomNavProps) {
  const { t } = useTranslation();

  const items = [
    { tab: "library" as const, label: t("sidebar.allGames"), icon: Library },
    { tab: "recommendations" as const, label: t("sidebar.forYou"), icon: Sparkles },
  ];
  const rightItems = [
    { tab: "analytics" as const, label: t("sidebar.analytics"), icon: BarChart3 },
    { tab: "friends" as const, label: t("sidebar.friends"), icon: UserCheck },
  ];

  const renderItem = ({ tab, label, icon: Icon }: { tab: MobileTab; label: string; icon: typeof Library }) => {
    const active = currentView === tab;
    return (
      <button
        key={tab}
        onClick={() => onSelect(tab)}
        className={`flex min-w-0 flex-col items-center gap-0.5 px-1 pb-1.5 pt-2 transition-colors ${active ? "text-indigo-600 dark:text-indigo-400" : "text-slate-500 dark:text-slate-400"}`}
      >
        <Icon size={20} strokeWidth={active ? 2.5 : 2} />
        <span className="w-full truncate text-center text-[9px] font-bold">{label}</span>
      </button>
    );
  };

  return (
    <nav className="md:hidden fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 backdrop-blur dark:border-slate-700 dark:bg-slate-800/95 pb-[calc(env(safe-area-inset-bottom)+12px)]">
      <div className="mx-auto grid max-w-lg grid-cols-5 items-end">
        {items.map(renderItem)}

        <button
          onClick={onLogScore}
          className="flex min-w-0 flex-col items-center gap-0.5 px-1 pb-1"
          aria-label={t("gameCard.logScore")}
        >
          <span className="-mt-5 flex h-14 w-14 items-center justify-center rounded-full bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 ring-4 ring-white transition active:scale-95 dark:ring-slate-800">
            <Trophy size={24} />
          </span>
          <span className="w-full truncate text-center text-[9px] font-black text-indigo-600 dark:text-indigo-400">
            {t("gameCard.logScore")}
          </span>
        </button>

        {rightItems.map(renderItem)}
      </div>
    </nav>
  );
}
