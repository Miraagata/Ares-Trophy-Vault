import React, { useState, useRef } from "react";
import { Search, EyeOff, Lock, CheckSquare, Square, Upload, Copy, Minus, Plus, Clock, ShieldAlert, Sparkles, Globe } from "lucide-react";
import { ValidationBanner } from "./ValidationBanner";
import { getGameShutdownInfo, isOnlineTrophy } from "../lib/serverShutdownDb";
import { distributeTrophies, DEFAULT_ROUTINE_CONFIG, RoutineConfig } from "../lib/routineSimulator";

interface TrophyTableProps {
  trophies: any[];
  titleId?: string;
  gameTitle?: string;
  onToggleUnlock: (id: number) => void;
  onUpdateTimestamp: (id: number, timestamp: string) => void;
  onApplyRoutineDistribution?: (updatedTrophies: any[]) => void;
  validationError?: string;
}

export const TrophyTable: React.FC<TrophyTableProps> = ({
  trophies,
  titleId,
  gameTitle,
  onToggleUnlock,
  onUpdateTimestamp,
  onApplyRoutineDistribution,
  validationError,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [isCloning, setIsCloning] = useState(false);
  const [offsetHours, setOffsetHours] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Routine Simulator State
  const [showRoutinePanel, setShowRoutinePanel] = useState(false);
  const [routineConfig, setRoutineConfig] = useState<RoutineConfig>(DEFAULT_ROUTINE_CONFIG);
  const [routineStartDate, setRoutineStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 3);
    return d.toISOString().slice(0, 16);
  });

  // Server Shutdown Info
  const shutdownInfo = getGameShutdownInfo(titleId, gameTitle);
  const formattedShutdownDate = shutdownInfo
    ? new Date(shutdownInfo.shutdownDate).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    : "";

  const filteredTrophies = trophies.filter((t) =>
    t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (t.detail || t.description || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCloneUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsCloning(true);
    try {
      const formData = new FormData();
      formData.append("sourceDat", file);

      const res = await fetch("/api/parse-source-dat", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error(await res.text());

      const data = await res.json();
      if (data.success && data.timestamps) {
        let applied = 0;
        for (const sourceTrophy of data.timestamps) {
          const targetTrophy = trophies.find((t) => t.id === sourceTrophy.id);
          if (targetTrophy && !targetTrophy.isSynced) {
            const sourceDate = new Date(sourceTrophy.timestamp);
            sourceDate.setHours(sourceDate.getHours() + offsetHours);

            if (!targetTrophy.isUnlocked && !targetTrophy.unlocked) {
              onToggleUnlock(targetTrophy.id);
            }
            onUpdateTimestamp(targetTrophy.id, sourceDate.toISOString());
            applied++;
          }
        }
        alert(
          `Sincronização concluída! ${applied} timestamps aplicados com um offset de ${
            offsetHours > 0 ? "+" : ""
          }${offsetHours} horas.`
        );
      }
    } catch (err) {
      console.error(err);
      alert("Erro ao clonar o TROPUSR.DAT");
    } finally {
      setIsCloning(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRunRoutineSimulator = () => {
    const updated = distributeTrophies(trophies, routineStartDate, routineConfig);
    if (onApplyRoutineDistribution) {
      onApplyRoutineDistribution(updated);
    } else {
      updated.forEach((t) => {
        if (t.timestamp) {
          onUpdateTimestamp(t.id, t.timestamp);
        }
      });
    }
    alert(
      `Rotina Humana Aplicada! Timestamps distribuídos fora dos horários de sono (${routineConfig.sleepStart}-${routineConfig.sleepEnd}) e trabalho (${routineConfig.workStart}-${routineConfig.workEnd}).`
    );
  };

  const renderTypeBadge = (type: string) => {
    switch (type) {
      case "Platinum":
        return (
          <span className="bg-blue-900/30 text-blue-300 border border-blue-700/50 px-2 py-1 rounded-md text-xs font-bold font-mono">
            🏆 PLATINA
          </span>
        );
      case "Gold":
        return (
          <span className="bg-yellow-900/30 text-yellow-300 border border-yellow-700/50 px-2 py-1 rounded-md text-xs font-bold font-mono">
            🥇 OURO
          </span>
        );
      case "Silver":
        return (
          <span className="bg-gray-700/30 text-gray-300 border border-gray-500/50 px-2 py-1 rounded-md text-xs font-bold font-mono">
            🥈 PRATA
          </span>
        );
      case "Bronze":
        return (
          <span className="bg-amber-900/30 text-amber-500 border border-amber-700/50 px-2 py-1 rounded-md text-xs font-bold font-mono">
            🥉 BRONZE
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#111111] rounded-2xl border border-zinc-800 shadow-2xl overflow-hidden">
      {/* Header & Search */}
      <div className="bg-[#151515] p-4 sm:p-6 border-b border-zinc-800 flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
        <div>
          <h2 className="text-zinc-100 font-bold text-lg sm:text-xl flex items-center gap-2">
            Modo de Edição Manual
            <span className="text-xs bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full">
              Handheld Touch
            </span>
          </h2>
          <p className="text-zinc-500 text-sm mt-1">Interface otimizada para toque (min-h-[48px])</p>
        </div>

        <div className="flex flex-col sm:flex-row w-full md:w-auto gap-3">
          <button
            onClick={() => setShowRoutinePanel(!showRoutinePanel)}
            className="flex items-center justify-center gap-2 bg-gradient-to-r from-purple-900/40 to-indigo-900/40 hover:from-purple-800/60 hover:to-indigo-800/60 border border-purple-500/40 text-purple-200 font-bold text-sm px-4 py-3 rounded-xl min-h-[48px] transition-all"
          >
            <Clock className="w-4 h-4 text-purple-400" />
            Simulador de Rotina
          </button>

          <div className="relative flex-1 md:w-64">
            <Search className="w-5 h-5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar troféu..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-[#0a0a0a] border border-zinc-700 text-zinc-200 text-base pl-10 pr-4 py-3 min-h-[48px] rounded-xl focus:outline-none focus:ring-1 focus:ring-amber-500 w-full"
            />
          </div>
        </div>
      </div>

      {/* Routine Simulator Panel (Collapsible) */}
      {showRoutinePanel && (
        <div className="bg-[#181222] p-4 sm:p-6 border-b border-purple-900/40 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-400" />
              <h3 className="text-purple-200 font-bold text-base">
                Simulador de Rotina Humana (Anti-Ban Jitter)
              </h3>
            </div>
            <span className="text-xs text-purple-400/80 bg-purple-950/60 border border-purple-800/40 px-3 py-1 rounded-full">
              Pula zonas de sono e trabalho automaticamente
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <label className="text-xs font-bold text-purple-300 block mb-1">Início da Jornada</label>
              <input
                type="datetime-local"
                value={routineStartDate}
                onChange={(e) => setRoutineStartDate(e.target.value)}
                className="w-full bg-[#0d0a14] border border-purple-800/50 text-purple-100 text-sm px-3 py-2.5 rounded-lg font-mono focus:outline-none focus:ring-1 focus:ring-purple-400"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-purple-300 block mb-1">Sono (Início - Fim)</label>
              <div className="flex items-center gap-1">
                <input
                  type="time"
                  value={routineConfig.sleepStart}
                  onChange={(e) => setRoutineConfig({ ...routineConfig, sleepStart: e.target.value })}
                  className="w-full bg-[#0d0a14] border border-purple-800/50 text-purple-100 text-sm px-2 py-2.5 rounded-lg font-mono"
                />
                <span className="text-purple-400">-</span>
                <input
                  type="time"
                  value={routineConfig.sleepEnd}
                  onChange={(e) => setRoutineConfig({ ...routineConfig, sleepEnd: e.target.value })}
                  className="w-full bg-[#0d0a14] border border-purple-800/50 text-purple-100 text-sm px-2 py-2.5 rounded-lg font-mono"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-purple-300 block mb-1">Trabalho (Início - Fim)</label>
              <div className="flex items-center gap-1">
                <input
                  type="time"
                  value={routineConfig.workStart}
                  onChange={(e) => setRoutineConfig({ ...routineConfig, workStart: e.target.value })}
                  className="w-full bg-[#0d0a14] border border-purple-800/50 text-purple-100 text-sm px-2 py-2.5 rounded-lg font-mono"
                />
                <span className="text-purple-400">-</span>
                <input
                  type="time"
                  value={routineConfig.workEnd}
                  onChange={(e) => setRoutineConfig({ ...routineConfig, workEnd: e.target.value })}
                  className="w-full bg-[#0d0a14] border border-purple-800/50 text-purple-100 text-sm px-2 py-2.5 rounded-lg font-mono"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-purple-300 block mb-1">Intervalo (Min/Max Mins)</label>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min={1}
                  value={routineConfig.minIntervalMins || 15}
                  onChange={(e) =>
                    setRoutineConfig({ ...routineConfig, minIntervalMins: parseInt(e.target.value, 10) || 15 })
                  }
                  className="w-full bg-[#0d0a14] border border-purple-800/50 text-purple-100 text-sm px-2 py-2.5 rounded-lg font-mono"
                />
                <span className="text-purple-400">-</span>
                <input
                  type="number"
                  min={5}
                  value={routineConfig.maxIntervalMins || 60}
                  onChange={(e) =>
                    setRoutineConfig({ ...routineConfig, maxIntervalMins: parseInt(e.target.value, 10) || 60 })
                  }
                  className="w-full bg-[#0d0a14] border border-purple-800/50 text-purple-100 text-sm px-2 py-2.5 rounded-lg font-mono"
                />
              </div>
            </div>

            <div className="flex items-end">
              <button
                onClick={handleRunRoutineSimulator}
                className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold text-sm py-3 px-4 rounded-xl shadow-lg transition-colors min-h-[48px] flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                Aplicar Rotina Humana
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cross-Region Sync Toolbar */}
      <div className="bg-[#1a1a1a] p-4 border-b border-zinc-800 flex flex-col sm:flex-row items-center gap-4 justify-between">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Copy className="w-5 h-5 text-amber-500 shrink-0" />
          <div className="flex flex-col">
            <span className="text-sm font-bold text-zinc-200">Sincronizador Cross-Region</span>
            <span className="text-xs text-zinc-500">Clone datas de outro TROPUSR.DAT</span>
          </div>
        </div>

        <div className="flex items-center gap-4 w-full sm:w-auto">
          <div className="flex items-center bg-[#0a0a0a] border border-zinc-700 rounded-xl overflow-hidden shrink-0">
            <button
              onClick={() => setOffsetHours((h) => h - 1)}
              className="p-3 hover:bg-zinc-800 text-zinc-300 min-w-[48px] min-h-[48px] flex justify-center items-center active:bg-zinc-700 transition-colors"
            >
              <Minus className="w-4 h-4" />
            </button>
            <div className="px-4 py-2 font-mono text-sm text-zinc-200 font-bold flex flex-col items-center justify-center min-w-[80px]">
              <span>{offsetHours > 0 ? `+${offsetHours}` : offsetHours}h</span>
              <span className="text-[10px] text-zinc-500 font-sans leading-none">Offset</span>
            </div>
            <button
              onClick={() => setOffsetHours((h) => h + 1)}
              className="p-3 hover:bg-zinc-800 text-zinc-300 min-w-[48px] min-h-[48px] flex justify-center items-center active:bg-zinc-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <input type="file" ref={fileInputRef} onChange={handleCloneUpload} className="hidden" accept=".dat" />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isCloning}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-500 text-white font-bold text-sm px-4 py-3 rounded-xl min-h-[48px] shadow-lg transition-colors disabled:opacity-50"
          >
            <Upload className="w-4 h-4" />
            {isCloning ? "Clonando..." : "Importar DAT"}
          </button>
        </div>
      </div>

      {/* Server Shutdown Guard Banner */}
      {shutdownInfo && (
        <div className="bg-red-950/40 border-b border-red-500/50 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-red-200">
          <div className="flex items-center gap-3">
            <ShieldAlert className="w-6 h-6 text-red-400 shrink-0" />
            <div>
              <div className="font-bold text-sm text-red-100 flex items-center gap-2">
                <span>RADAR DE SERVIDORES FECHADOS:</span>
                <span className="bg-red-900/60 text-red-300 border border-red-700/50 px-2 py-0.5 rounded text-xs">
                  {shutdownInfo.gameTitle}
                </span>
              </div>
              <p className="text-xs text-red-300/90 mt-0.5">
                ⚠️ SERVIDOR ENCERRADO. O servidor deste jogo ({shutdownInfo.gameTitle}) foi fechado em{" "}
                <strong className="underline">{formattedShutdownDate}</strong>. Troféus online após esta data causarão banimento imediato.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="p-4">{validationError && <ValidationBanner message={validationError} />}</div>

      {/* Table (Handheld Optimized) */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-left border-collapse">
          <thead className="bg-[#111] sticky top-0 z-10 border-b border-zinc-800 hidden md:table-header-group">
            <tr className="text-zinc-400 text-xs uppercase font-bold tracking-wider">
              <th className="py-3 px-4 w-16 text-center">ID</th>
              <th className="py-3 px-4">Detalhes</th>
              <th className="py-3 px-4 w-32">Tipo</th>
              <th className="py-3 px-4 w-40 text-center">Estado</th>
              <th className="py-3 px-4 w-64">Data / Hora</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/50 flex flex-col md:table-row-group">
            {filteredTrophies.length === 0 ? (
              <tr className="flex md:table-row">
                <td colSpan={5} className="py-16 text-center text-zinc-500 w-full block md:table-cell">
                  {trophies.length === 0 ? "Nenhum arquivo ZIP ou TROPUSR carregado." : "Nenhum troféu encontrado."}
                </td>
              </tr>
            ) : (
              filteredTrophies.map((trophy) => {
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
                  rowStyle = "bg-red-950/40 hover:bg-red-950/60 border-l-4 border-l-red-500";
                } else if (isSynced) {
                  rowStyle = "bg-red-950/10 hover:bg-red-950/20 opacity-70";
                } else if (isUnlocked) {
                  rowStyle = "bg-amber-900/10 hover:bg-amber-900/20";
                } else {
                  rowStyle = "bg-[#111] hover:bg-zinc-800/40";
                }

                return (
                  <tr key={trophy.id} className={`transition-colors flex flex-col md:table-row p-4 md:p-0 gap-4 ${rowStyle}`}>
                    {/* ID */}
                    <td className="py-2 md:py-4 px-2 md:px-4 text-left md:text-center font-mono text-zinc-500 font-bold flex md:table-cell items-center gap-2">
                      <span className="md:hidden text-xs uppercase">ID: </span>
                      #{String(trophy.id).padStart(3, "0")}
                    </td>

                    {/* Details */}
                    <td className="py-2 md:py-4 px-2 md:px-4">
                      <div className="flex items-start md:items-center gap-4">
                        <div className="w-12 h-12 md:w-10 md:h-10 rounded-lg bg-[#0a0a0a] border border-zinc-800 flex items-center justify-center shrink-0 overflow-hidden shadow-inner">
                          {trophy.base64Image || trophy.iconDataUrl ? (
                            <img
                              src={trophy.base64Image || trophy.iconDataUrl}
                              alt={trophy.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-zinc-600 text-[10px]">Sem img</span>
                          )}
                        </div>
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-bold text-zinc-100 text-base">{trophy.name}</span>
                            {trophy.hidden && (
                              <span className="inline-flex items-center gap-1 text-xs bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded border border-zinc-700">
                                <EyeOff className="w-3 h-3" /> Oculto
                              </span>
                            )}
                            {isOnline && (
                              <span className="inline-flex items-center gap-1 text-xs bg-sky-950/60 text-sky-400 px-2 py-0.5 rounded border border-sky-800/50 font-medium">
                                <Globe className="w-3 h-3" /> Online
                              </span>
                            )}
                            {isShutdownViolation && (
                              <span className="inline-flex items-center gap-1 text-xs bg-red-900/80 text-red-200 px-2 py-0.5 rounded border border-red-500 font-bold animate-pulse">
                                ⚠️ SERVIDOR ENCERRADO
                              </span>
                            )}
                          </div>
                          <p className="text-zinc-400 text-sm leading-relaxed max-w-md">
                            {trophy.detail || trophy.description}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Type */}
                    <td className="py-2 md:py-4 px-2 md:px-4 flex md:table-cell items-center gap-2">
                      <span className="md:hidden text-xs uppercase text-zinc-500 font-bold">Tipo: </span>
                      {renderTypeBadge(trophy.type)}
                    </td>

                    {/* Status Checkbox */}
                    <td className="py-2 md:py-4 px-2 md:px-4 text-center">
                      <button
                        onClick={() => !isSynced && onToggleUnlock(trophy.id)}
                        disabled={isSynced}
                        className={`inline-flex items-center justify-center gap-2 w-full md:w-auto px-4 py-3 min-h-[48px] rounded-xl text-sm font-bold border transition-all active:scale-95 ${
                          isSynced
                            ? "bg-red-950/30 text-red-400 border-red-900/30 cursor-not-allowed"
                            : isUnlocked
                            ? "bg-amber-500/10 text-amber-500 border-amber-500/20 hover:bg-amber-500/20 cursor-pointer"
                            : "bg-[#0a0a0a] text-zinc-500 border-zinc-800 hover:bg-zinc-800 hover:text-zinc-300 cursor-pointer"
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
                            value={trophy.timestamp ? new Date(trophy.timestamp).toISOString().slice(0, 16) : ""}
                            onChange={(e) => {
                              if (e.target.value) {
                                onUpdateTimestamp(trophy.id, new Date(e.target.value).toISOString());
                              }
                            }}
                            className={`w-full text-base px-4 py-3 min-h-[48px] rounded-xl focus:outline-none focus:ring-2 font-mono border shadow-inner ${
                              isShutdownViolation
                                ? "bg-red-950/60 border-red-500 text-red-200 focus:ring-red-500"
                                : isSynced
                                ? "bg-red-950/20 border-red-900/30 text-red-300 opacity-70 cursor-not-allowed"
                                : "bg-[#0a0a0a] border-zinc-700 text-zinc-100 focus:ring-amber-500"
                            }`}
                          />
                          {isShutdownViolation && (
                            <span className="text-[11px] text-red-400 font-bold leading-tight">
                              Data posterior ao fechamento do servidor ({formattedShutdownDate})
                            </span>
                          )}
                        </div>
                      ) : (
                        <div className="w-full text-center text-zinc-600 text-base italic font-mono bg-[#0a0a0a] border border-zinc-800 py-3 min-h-[48px] rounded-xl flex items-center justify-center">
                          --
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
