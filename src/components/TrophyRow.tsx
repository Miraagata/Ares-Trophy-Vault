import React, { memo } from "react";
import { Lock, CheckSquare, Square, EyeOff, Globe } from "lucide-react";
import { isOnlineTrophy } from "../lib/serverShutdownDb";

// OTIMIZAÇÃO: O React.memo impede que o navegador redesenhe troféus que você não editou.
export const TrophyRow = memo(({ 
  trophy, 
  onToggleUnlock, 
  onUpdateTimestamp, 
  formatLocal, 
  shutdownInfo,
  renderTypeBadge 
}: any) => {
  const isOnline = isOnlineTrophy(trophy);
  const isUnlocked = trophy.unlocked || trophy.isUnlocked;
  const isSynced = trophy.isSynced;

  const trophyTime = trophy.timestamp ? new Date(trophy.timestamp).getTime() : 0;
  const shutdownTime = shutdownInfo
    ? new Date(`${shutdownInfo.shutdownDate}T23:59:59Z`).getTime()
    : 0;
  const isShutdownViolation = isOnline && shutdownInfo && isUnlocked && trophyTime > shutdownTime;

  let rowStyle = "";
  if (isShutdownViolation) {
    rowStyle = "bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:bg-red-950/60 border-l-4 border-l-red-500";
  } else if (isSynced) {
    rowStyle = "bg-red-50/30 dark:bg-red-950/10 hover:bg-red-50/50 dark:bg-red-950/20 opacity-70";
  } else if (isUnlocked) {
    rowStyle = "bg-amber-50/50 dark:bg-amber-900/10 hover:bg-amber-100 dark:hover:bg-amber-900/20";
  } else {
    rowStyle = "bg-white dark:bg-[#111] hover:bg-zinc-200/40 dark:hover:bg-zinc-800/40";
  }

  return (
    <tr className={`transition-colors flex flex-col md:table-row p-4 md:p-0 gap-4 ${rowStyle}`}>
      {/* ID */}
      <td className="py-2 md:py-4 px-2 md:px-4 text-left md:text-center font-mono text-zinc-500 dark:text-zinc-500 font-bold flex md:table-cell items-center gap-2">
        <span className="md:hidden text-xs uppercase">ID: </span>
        #{String(trophy.id).padStart(3, "0")}
      </td>

      {/* Details */}
      <td className="py-2 md:py-4 px-2 md:px-4">
        <div className="flex items-start md:items-center gap-4">
          <div className="w-12 h-12 md:w-10 md:h-10 rounded-lg bg-zinc-100 dark:bg-[#0a0a0a] border border-zinc-300 dark:border-zinc-800 flex items-center justify-center shrink-0 overflow-hidden shadow-inner">
            {trophy.base64Image || trophy.iconDataUrl ? (
              <img
                src={trophy.base64Image || trophy.iconDataUrl}
                alt={trophy.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-zinc-400 dark:text-zinc-600 text-[10px]">Sem img</span>
            )}
          </div>
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-bold text-zinc-900 dark:text-zinc-100 text-base">{trophy.name}</span>
              {trophy.hidden && (
                <span className="inline-flex items-center gap-1 text-xs bg-zinc-200 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-600 dark:text-zinc-400 px-2 py-0.5 rounded border border-zinc-400 dark:border-zinc-700">
                  <EyeOff className="w-3 h-3" /> Oculto
                </span>
              )}
              {isOnline && (
                <span className="inline-flex items-center gap-1 text-xs bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-400 px-2 py-0.5 rounded border border-sky-300 dark:border-sky-800/50 font-medium">
                  <Globe className="w-3 h-3" /> Online
                </span>
              )}
              {isShutdownViolation && (
                <span className="inline-flex items-center gap-1 text-xs bg-red-200 dark:bg-red-900/80 text-red-700 dark:text-red-200 px-2 py-0.5 rounded border border-red-500 font-bold animate-pulse">
                  ⚠️ SERVIDOR ENCERRADO
                </span>
              )}
            </div>
            <p className="text-zinc-400 dark:text-zinc-600 dark:text-zinc-400 text-sm leading-relaxed max-w-md">
              {trophy.detail || trophy.description}
            </p>
          </div>
        </div>
      </td>

      {/* Type */}
      <td className="py-2 md:py-4 px-2 md:px-4 flex md:table-cell items-center gap-2">
        <span className="md:hidden text-xs uppercase text-zinc-500 dark:text-zinc-500 font-bold">Tipo: </span>
        {renderTypeBadge(trophy.type)}
      </td>

      {/* Status Checkbox */}
      <td className="py-2 md:py-4 px-2 md:px-4 text-center">
        <button
          onClick={() => !isSynced && onToggleUnlock(trophy.id)}
          disabled={isSynced}
          className={`inline-flex items-center justify-center gap-2 w-full md:w-auto px-4 py-2 min-h-[40px] rounded-xl text-sm font-bold border transition-all active:scale-95 ${
            isSynced
              ? "bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 border-red-200 dark:border-red-900/30 cursor-not-allowed"
              : isUnlocked
              ? "bg-amber-500/10 text-amber-600 dark:text-amber-500 border-amber-500/20 hover:bg-amber-500/20 cursor-pointer"
              : "bg-zinc-100 dark:bg-[#0a0a0a] text-zinc-500 dark:text-zinc-500 border-zinc-300 dark:border-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-800 hover:text-zinc-700 dark:hover:text-zinc-300 cursor-pointer"
          }`}
        >
          {isSynced ? (
            <>
              <Lock className="w-4 h-4" /> PSN
            </>
          ) : isUnlocked ? (
            <>
              <CheckSquare className="w-4 h-4" /> Ganho
            </>
          ) : (
            <>
              <Square className="w-4 h-4" /> Trancado
            </>
          )}
        </button>
      </td>

      {/* Timestamp Editor */}
      <td className="py-2 md:py-4 px-2 md:px-4">
        {isUnlocked ? (
          <div className="flex flex-col gap-1">
            <input
              type="datetime-local"
              disabled={isSynced}
              max={isShutdownViolation || (isOnline && shutdownInfo) ? `${shutdownInfo.shutdownDate}T23:59` : undefined}
              value={formatLocal(trophy.timestamp)}
              onChange={(e) => {
                if (e.target.value) {
                  onUpdateTimestamp(trophy.id, new Date(e.target.value).toISOString());
                }
              }}
              className={`w-full text-base px-4 py-2 min-h-[40px] rounded-xl focus:outline-none focus:ring-2 font-mono border shadow-inner ${
                isShutdownViolation
                  ? "bg-red-100 dark:bg-red-950/60 border-red-500 text-red-700 dark:text-red-200 focus:ring-red-500"
                  : isSynced
                  ? "bg-red-50/50 dark:bg-red-950/20 border-red-200 dark:border-red-900/30 text-red-600 dark:text-red-300 opacity-70 cursor-not-allowed"
                  : "bg-zinc-100 dark:bg-[#0a0a0a] border-zinc-400 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:ring-amber-500"
              }`}
            />
            {isShutdownViolation && (
              <span className="text-[11px] text-red-600 dark:text-red-400 font-bold leading-tight">
                Data posterior ao fechamento do servidor ({shutdownInfo.shutdownDate})
              </span>
            )}
          </div>
        ) : (
          <div className="w-full text-center text-zinc-400 dark:text-zinc-600 text-base italic font-mono bg-zinc-100 dark:bg-[#0a0a0a] border border-zinc-300 dark:border-zinc-800 py-2 min-h-[40px] rounded-xl flex items-center justify-center">
            --
          </div>
        )}
      </td>
    </tr>
  );
});

// Custom comparison function for React.memo to prevent unnecessary re-renders
// We only care if unlocked status, sync status, or timestamp changes.
// Other things like game shutdown state shouldn't change per trophy.
export default TrophyRow;
