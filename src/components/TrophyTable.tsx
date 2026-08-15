import React, { useState, useRef } from "react";
import { Search, EyeOff, Lock, CheckSquare, Square, Upload, Copy, Minus, Plus, Clock, ShieldAlert, Sparkles, Globe } from "lucide-react";
import { ValidationBanner } from "./ValidationBanner";
import { TrophyRow } from "./TrophyRow";
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


const formatLocal = (isoString: string) => {
  if (!isoString) return "";
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return "";
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};


const renderTypeBadge = (type: string) => {
  switch (type) {
    case "Platinum":
      return (
        <span className="bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-700/50 px-2 py-1 rounded-md text-xs font-bold font-mono">
          🏆 PLATINA
        </span>
      );
    case "Gold":
      return (
        <span className="bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 border border-yellow-300 dark:border-yellow-700/50 px-2 py-1 rounded-md text-xs font-bold font-mono">
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
        <span className="bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-500 border border-amber-300 dark:border-amber-700/50 px-2 py-1 rounded-md text-xs font-bold font-mono">
          🥉 BRONZE
        </span>
      );
    default:
      return null;
  }
};

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

  

  return (
    <div className="flex flex-col h-full bg-zinc-50 dark:bg-[#111111] rounded-2xl border border-zinc-300 dark:border-zinc-800 shadow-2xl overflow-hidden">
      {/* Header & Search */}
      <div className="bg-zinc-100 dark:bg-[#151515] p-4 sm:p-6 border-b border-zinc-300 dark:border-zinc-800 flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
        <div>
          <h2 className="text-zinc-900 dark:text-zinc-100 font-bold text-lg sm:text-xl flex items-center gap-2">
            Modo de Edição Manual
            
          </h2>
          
        </div>

        <div className="flex flex-col sm:flex-row w-full md:w-auto gap-3">
          <button
            onClick={() => setShowRoutinePanel(!showRoutinePanel)}
            className="flex items-center justify-center gap-2 bg-gradient-to-r from-purple-900/40 to-indigo-900/40 hover:from-purple-800/60 hover:to-indigo-800/60 border border-purple-500/40 text-purple-200 font-bold text-sm px-4 py-2 rounded-xl min-h-[40px] transition-all"
          >
            <Clock className="w-4 h-4 text-purple-400" />
            Simulador de Rotina
          </button>

          <div className="relative flex-1 md:w-64">
            <Search className="w-5 h-5 text-zinc-500 dark:text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar troféu..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-zinc-100 dark:bg-[#0a0a0a] border border-zinc-400 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 text-base pl-10 pr-4 py-2 min-h-[40px] rounded-xl focus:outline-none focus:ring-1 focus:ring-amber-500 w-full"
            />
          </div>
        </div>
      </div>

      {/* Routine Simulator Panel (Collapsible) */}
      {showRoutinePanel && (
        <div className="bg-purple-50 dark:bg-[#181222] p-4 sm:p-6 border-b border-purple-900/40 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-400" />
              <h3 className="text-purple-200 font-bold text-base">
                Simulador de Rotina Humana (Anti-Ban Jitter)
              </h3>
            </div>
            <span className="text-xs text-purple-700 dark:text-purple-400/80 bg-purple-50 dark:bg-purple-950/60 border border-purple-300 dark:border-purple-800/40 px-3 py-1 rounded-full">
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
                className="w-full bg-purple-100 dark:bg-[#0d0a14] border border-purple-800/50 text-purple-100 text-sm px-3 py-2.5 rounded-lg font-mono focus:outline-none focus:ring-1 focus:ring-purple-400"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-purple-300 block mb-1">Sono (Início - Fim)</label>
              <div className="flex items-center gap-1">
                <input
                  type="time"
                  value={routineConfig.sleepStart}
                  onChange={(e) => setRoutineConfig({ ...routineConfig, sleepStart: e.target.value })}
                  className="w-full bg-purple-100 dark:bg-[#0d0a14] border border-purple-800/50 text-purple-100 text-sm px-2 py-2.5 rounded-lg font-mono"
                />
                <span className="text-purple-400">-</span>
                <input
                  type="time"
                  value={routineConfig.sleepEnd}
                  onChange={(e) => setRoutineConfig({ ...routineConfig, sleepEnd: e.target.value })}
                  className="w-full bg-purple-100 dark:bg-[#0d0a14] border border-purple-800/50 text-purple-100 text-sm px-2 py-2.5 rounded-lg font-mono"
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
                  className="w-full bg-purple-100 dark:bg-[#0d0a14] border border-purple-800/50 text-purple-100 text-sm px-2 py-2.5 rounded-lg font-mono"
                />
                <span className="text-purple-400">-</span>
                <input
                  type="time"
                  value={routineConfig.workEnd}
                  onChange={(e) => setRoutineConfig({ ...routineConfig, workEnd: e.target.value })}
                  className="w-full bg-purple-100 dark:bg-[#0d0a14] border border-purple-800/50 text-purple-100 text-sm px-2 py-2.5 rounded-lg font-mono"
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
                  className="w-full bg-purple-100 dark:bg-[#0d0a14] border border-purple-800/50 text-purple-100 text-sm px-2 py-2.5 rounded-lg font-mono"
                />
                <span className="text-purple-400">-</span>
                <input
                  type="number"
                  min={5}
                  value={routineConfig.maxIntervalMins || 60}
                  onChange={(e) =>
                    setRoutineConfig({ ...routineConfig, maxIntervalMins: parseInt(e.target.value, 10) || 60 })
                  }
                  className="w-full bg-purple-100 dark:bg-[#0d0a14] border border-purple-800/50 text-purple-100 text-sm px-2 py-2.5 rounded-lg font-mono"
                />
              </div>
            </div>

            <div className="flex items-end">
              <button
                onClick={handleRunRoutineSimulator}
                className="w-full bg-purple-600 hover:bg-purple-500 text-black dark:text-white font-bold text-sm py-2 px-4 rounded-xl shadow-lg transition-colors min-h-[40px] flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                Aplicar Rotina Humana
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cross-Region Sync Toolbar */}
      <div className="bg-zinc-200 dark:bg-[#1a1a1a] p-4 border-b border-zinc-300 dark:border-zinc-800 flex flex-col sm:flex-row items-center gap-4 justify-between">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Copy className="w-5 h-5 text-amber-600 dark:text-amber-500 shrink-0" />
          <div className="flex flex-col">
            <span className="text-sm font-bold text-zinc-800 dark:text-zinc-200">Sincronizador Cross-Region</span>
            <span className="text-xs text-zinc-500 dark:text-zinc-500">Clone datas de outro TROPUSR.DAT</span>
          </div>
        </div>

        <div className="flex items-center gap-4 w-full sm:w-auto">
          <div className="flex items-center bg-zinc-100 dark:bg-[#0a0a0a] border border-zinc-400 dark:border-zinc-700 rounded-xl overflow-hidden shrink-0">
            <button
              onClick={() => setOffsetHours((h) => h - 1)}
              className="p-3 hover:bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 min-w-[48px] min-h-[40px] flex justify-center items-center active:bg-zinc-700 transition-colors"
            >
              <Minus className="w-4 h-4" />
            </button>
            <div className="px-4 py-2 font-mono text-sm text-zinc-800 dark:text-zinc-200 font-bold flex flex-col items-center justify-center min-w-[80px]">
              <span>{offsetHours > 0 ? `+${offsetHours}` : offsetHours}h</span>
              <span className="text-[10px] text-zinc-500 dark:text-zinc-500 font-sans leading-none">Offset</span>
            </div>
            <button
              onClick={() => setOffsetHours((h) => h + 1)}
              className="p-3 hover:bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 min-w-[48px] min-h-[40px] flex justify-center items-center active:bg-zinc-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <input type="file" ref={fileInputRef} onChange={handleCloneUpload} className="hidden" accept=".dat" />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isCloning}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-500 text-black dark:text-white font-bold text-sm px-4 py-2 rounded-xl min-h-[40px] shadow-lg transition-colors disabled:opacity-50"
          >
            <Upload className="w-4 h-4" />
            {isCloning ? "Clonando..." : "Importar DAT"}
          </button>
        </div>
      </div>

      {/* Server Shutdown Guard Banner */}
      {shutdownInfo && (
        <div className="bg-red-50 dark:bg-red-950/40 border-b border-red-500/50 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-red-700 dark:text-red-200">
          <div className="flex items-center gap-3">
            <ShieldAlert className="w-6 h-6 text-red-600 dark:text-red-400 shrink-0" />
            <div>
              <div className="font-bold text-sm text-red-100 flex items-center gap-2">
                <span>RADAR DE SERVIDORES FECHADOS:</span>
                <span className="bg-red-200 dark:bg-red-900/60 text-red-600 dark:text-red-300 border border-red-700/50 px-2 py-0.5 rounded text-xs">
                  {shutdownInfo.gameTitle}
                </span>
              </div>
              <p className="text-xs text-red-600 dark:text-red-300/90 mt-0.5">
                ⚠️ SERVIDOR ENCERRADO. O servidor deste jogo ({shutdownInfo.gameTitle}) foi fechado em{" "}
                <strong className="underline">{formattedShutdownDate}</strong>. Troféus online após esta data causarão banimento imediato.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="p-4"><ValidationBanner trophies={trophies} message={validationError} /></div>

      {/* Table (Handheld Optimized) */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-left border-collapse">
          <thead className="bg-white dark:bg-[#111] sticky top-0 z-10 border-b border-zinc-300 dark:border-zinc-800 hidden md:table-header-group">
            <tr className="text-zinc-400 dark:text-zinc-600 dark:text-zinc-400 text-xs uppercase font-bold tracking-wider">
              <th className="py-2 px-4 w-16 text-center">ID</th>
              <th className="py-2 px-4">Detalhes</th>
              <th className="py-2 px-4 w-32">Tipo</th>
              <th className="py-2 px-4 w-40 text-center">Estado</th>
              <th className="py-2 px-4 w-64">Data / Hora</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-300/50 dark:divide-zinc-800/50 flex flex-col md:table-row-group">
            {filteredTrophies.length === 0 ? (
              <tr className="flex md:table-row">
                <td colSpan={5} className="py-16 text-center text-zinc-500 dark:text-zinc-500 w-full block md:table-cell">
                  {trophies.length === 0 ? "Nenhum arquivo ZIP ou TROPUSR carregado." : "Nenhum troféu encontrado."}
                </td>
              </tr>
            ) : (
              filteredTrophies.map((trophy) => (
                <TrophyRow 
                  key={trophy.id}
                  trophy={trophy}
                  onToggleUnlock={onToggleUnlock}
                  onUpdateTimestamp={onUpdateTimestamp}
                  formatLocal={formatLocal}
                  shutdownInfo={shutdownInfo}
                  renderTypeBadge={renderTypeBadge}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
