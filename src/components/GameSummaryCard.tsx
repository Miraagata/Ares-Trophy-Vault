import React from "react";
import { PS3GameInfo } from "../types";
import { ShieldCheck, ShieldAlert } from "lucide-react";
import { useLanguage } from "../context/LanguageContext";

interface GameSummaryCardProps {
  gameInfo: PS3GameInfo;
  healthScore: number;
}

export const GameSummaryCard: React.FC<GameSummaryCardProps> = ({ gameInfo, healthScore }) => {
  const { t } = useLanguage();

  return (
    <div className="bg-zinc-100 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 rounded-2xl p-3 shadow-xl text-zinc-900 dark:text-zinc-100 mb-3">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-center">
        
        {/* Game Info Left Column */}
        <div className="lg:col-span-5 flex items-start gap-3">
          <div className="relative group shrink-0">
            {gameInfo.iconDataUrl || gameInfo.hasIcon ? (
              <img
                src={gameInfo.iconDataUrl || "https://images.unsplash.com/photo-1538481199705-c710c4e965fc?auto=format&fit=crop&w=120&q=80"}
                alt={gameInfo.title}
                className="w-20 h-20 rounded-xl object-cover border-2 border-zinc-400 dark:border-zinc-700 shadow-md grayscale hover:grayscale-0 transition-all"
              />
            ) : (
              <div className="w-20 h-20 rounded-xl bg-white dark:bg-zinc-950 border-2 border-zinc-400 dark:border-zinc-700 flex items-center justify-center text-zinc-900 dark:text-zinc-100 font-black text-2xl shadow-md">
                PS3
              </div>
            )}
            <span className="absolute -bottom-2 -right-2 bg-white dark:bg-zinc-950 text-zinc-700 dark:text-zinc-300 border border-zinc-400 dark:border-zinc-700 text-[10px] font-mono px-1.5 py-0.5 rounded shadow">
              PS3
            </span>
          </div>

          <div className="space-y-1">
            <h2 className="text-xl font-bold tracking-tight text-black dark:text-white line-clamp-1">
              {gameInfo.title}
            </h2>
            <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-zinc-400 dark:text-zinc-600 dark:text-zinc-400">
              <span className="bg-white dark:bg-zinc-950 px-2 py-0.5 rounded border border-zinc-300 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200">
                {gameInfo.titleId}
              </span>
              <span className="bg-white dark:bg-zinc-950 px-2 py-0.5 rounded border border-zinc-300 dark:border-zinc-800 text-zinc-400 dark:text-zinc-600 dark:text-zinc-400">
                User: {gameInfo.accountId}
              </span>
            </div>

            {/* Sequence Health Status */}
            <div className="pt-2 flex items-center gap-2">
              <span className="text-xs text-zinc-400 dark:text-zinc-600 dark:text-zinc-400">{t("sequenceHealth")}:</span>
              <div
                className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                  healthScore === 100
                    ? "bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border-zinc-600"
                    : "bg-red-100 dark:bg-red-950/80 text-red-700 dark:text-red-200 border-red-700"
                }`}
              >
                {healthScore === 100 ? (
                  <ShieldCheck className="w-3.5 h-3.5 text-zinc-900 dark:text-zinc-100" />
                ) : (
                  <ShieldAlert className="w-3.5 h-3.5 text-red-600 dark:text-red-400 animate-pulse" />
                )}
                <span>{healthScore}% {healthScore === 100 ? "Válido" : "Inconsistente (Erro de Horário)"}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Completion Gauge Column */}
        <div className="lg:col-span-3 flex flex-col justify-center border-t lg:border-t-0 lg:border-l border-zinc-300 dark:border-zinc-800 pt-4 lg:pt-0 lg:pl-6">
          <div className="flex justify-between items-center text-xs text-zinc-400 dark:text-zinc-600 dark:text-zinc-400 mb-1.5 font-medium">
            <span>{t("completionProgress")}</span>
            <span className="text-black dark:text-white font-bold text-sm font-mono">{gameInfo.completionPercentage}%</span>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-white dark:bg-zinc-950 rounded-full h-3.5 overflow-hidden border border-zinc-300 dark:border-zinc-800 p-0.5">
            <div
              className="bg-zinc-100 h-full rounded-full transition-all duration-500 shadow-inner"
              style={{ width: `${gameInfo.completionPercentage}%` }}
            />
          </div>

          <div className="flex justify-between items-center text-xs text-zinc-400 dark:text-zinc-600 dark:text-zinc-400 mt-2 font-mono">
            <span>{gameInfo.unlockedTrophies} / {gameInfo.totalTrophies} {t("unlockedTrophies")}</span>
            <span>{gameInfo.earnedPoints} / {gameInfo.totalPoints} PTS</span>
          </div>
        </div>

        {/* Trophy Breakdown Pills Column */}
        <div className="lg:col-span-4 flex flex-wrap items-center justify-start lg:justify-end gap-2 border-t lg:border-t-0 lg:border-l border-zinc-300 dark:border-zinc-800 pt-4 lg:pt-0 lg:pl-6">
          
          {/* Platinum */}
          <div className="flex items-center gap-2 bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 px-3 py-1.5 rounded-xl text-xs">
            <span className="w-3 h-3 rounded-full bg-white border border-zinc-400 shadow-sm" />
            <div className="flex flex-col">
              <span className="text-[10px] text-zinc-400 dark:text-zinc-600 dark:text-zinc-400 uppercase font-semibold">{t("platinum")}</span>
              <span className="font-bold font-mono text-black dark:text-white">
                {gameInfo.counts.platinum.unlocked} / {gameInfo.counts.platinum.total}
              </span>
            </div>
          </div>

          {/* Gold */}
          <div className="flex items-center gap-2 bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 px-3 py-1.5 rounded-xl text-xs">
            <span className="w-3 h-3 rounded-full bg-zinc-300 border border-zinc-100 shadow-sm" />
            <div className="flex flex-col">
              <span className="text-[10px] text-zinc-400 dark:text-zinc-600 dark:text-zinc-400 uppercase font-semibold">{t("gold")}</span>
              <span className="font-bold font-mono text-zinc-800 dark:text-zinc-200">
                {gameInfo.counts.gold.unlocked} / {gameInfo.counts.gold.total}
              </span>
            </div>
          </div>

          {/* Silver */}
          <div className="flex items-center gap-2 bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 px-3 py-1.5 rounded-xl text-xs">
            <span className="w-3 h-3 rounded-full bg-zinc-400 border border-zinc-300 shadow-sm" />
            <div className="flex flex-col">
              <span className="text-[10px] text-zinc-400 dark:text-zinc-600 dark:text-zinc-400 uppercase font-semibold">{t("silver")}</span>
              <span className="font-bold font-mono text-zinc-700 dark:text-zinc-300">
                {gameInfo.counts.silver.unlocked} / {gameInfo.counts.silver.total}
              </span>
            </div>
          </div>

          {/* Bronze */}
          <div className="flex items-center gap-2 bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 px-3 py-1.5 rounded-xl text-xs">
            <span className="w-3 h-3 rounded-full bg-zinc-600 border border-zinc-500 shadow-sm" />
            <div className="flex flex-col">
              <span className="text-[10px] text-zinc-400 dark:text-zinc-600 dark:text-zinc-400 uppercase font-semibold">{t("bronze")}</span>
              <span className="font-bold font-mono text-zinc-400 dark:text-zinc-600 dark:text-zinc-400">
                {gameInfo.counts.bronze.unlocked} / {gameInfo.counts.bronze.total}
              </span>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};

