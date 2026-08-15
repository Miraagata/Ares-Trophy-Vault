import React, { useState, useMemo, Suspense, lazy } from "react";
import JSZip from "jszip";
import { Header } from "./components/Header";
import { GameSummaryCard } from "./components/GameSummaryCard";
import { TrophyTable } from "./components/TrophyTable";

const RandomizerModal = lazy(() => import("./components/RandomizerModal").then(module => ({ default: module.RandomizerModal })));
const JsonImportExportModal = lazy(() => import("./components/JsonImportExportModal").then(module => ({ default: module.JsonImportExportModal })));
const PfdToolGuideModal = lazy(() => import("./components/PfdToolGuideModal").then(module => ({ default: module.PfdToolGuideModal })));
const SmartCalculatorModal = lazy(() => import("./components/SmartCalculatorModal").then(module => ({ default: module.SmartCalculatorModal })));
const ParamSfoModal = lazy(() => import("./components/ParamSfoModal").then(module => ({ default: module.ParamSfoModal })));
const VaultStatsModal = lazy(() => import("./components/VaultStatsModal").then(module => ({ default: module.VaultStatsModal })));
const DifficultyWarningModal = lazy(() => import("./components/DifficultyWarningModal").then(module => ({ default: module.DifficultyWarningModal })));
const AboutAppModal = lazy(() => import("./components/AboutAppModal").then(module => ({ default: module.AboutAppModal })));

import {
  PS3GameInfo,
  PS3Trophy,
  PS3TrophyGroup,
  PresetGame,
  RandomizeConfig,
} from "./types";

import {
  buildGameInfo,
  SAMPLE_PRESET_GAMES,
  serializeTropUsrDat,
  unpackTrophyFiles,
  getFilesFromDataTransferItems,
} from "./lib/trophyParser";

import { validateTrophySequence } from "./lib/sequenceValidator";
import { useLanguage } from "./context/LanguageContext";
import { isHighDifficultyTrophy, MIN_DIFFICULTY_GAP_MS } from "./lib/difficultyHelper";
import { parseTrophyFilesClient, updateTropUsrClient, base64ToUint8Array } from "./lib/ps3ClientParser";

export default function App() {
  const { t } = useLanguage();

  // Start with an empty application state
  const initialPreset = {
    title: "Nenhum Jogo Carregado",
    titleId: "-",
    accountId: "-",
    groups: [],
    trophies: []
  };

  const [gameTitle, setGameTitle] = useState(initialPreset.title);
  const [titleId, setTitleId] = useState(initialPreset.titleId);
  const [accountId, setAccountId] = useState(initialPreset.accountId);
  const [groups, setGroups] = useState<PS3TrophyGroup[]>(initialPreset.groups);
  const [trophies, setTrophies] = useState<PS3Trophy[]>(initialPreset.trophies);
  const [originalUsrDatBase64, setOriginalUsrDatBase64] = useState<string | undefined>();
  
  const [isDragging, setIsDragging] = useState(false);

  // Selection State
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  // Modal States
  const [isRandomizerOpen, setIsRandomizerOpen] = useState(false);
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
  const [isJsonModalOpen, setIsJsonModalOpen] = useState(false);
  const [isPfdGuideOpen, setIsPfdGuideOpen] = useState(false);
  const [isParamSfoOpen, setIsParamSfoOpen] = useState(false);
  const [isVaultStatsOpen, setIsVaultStatsOpen] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false);

  // Difficulty Warning Modal State
  const [diffWarningOpen, setDiffWarningOpen] = useState(false);
  const [pendingDiffTrophies, setPendingDiffTrophies] = useState<PS3Trophy[]>([]);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  // Computed Game Info
  const gameInfo = useMemo(() => {
    return buildGameInfo(gameTitle, titleId, accountId, trophies, groups);
  }, [gameTitle, titleId, accountId, trophies, groups]);

  // Computed Sequence Validation Health
  const { issues, healthScore } = useMemo(() => {
    return validateTrophySequence(trophies, titleId, gameTitle);
  }, [trophies, titleId, gameTitle]);

  // Handlers: Load Preset Game
  const handleSelectPreset = (preset: PresetGame) => {
    setGameTitle(preset.title);
    setTitleId(preset.titleId);
    setAccountId(preset.accountId);
    setGroups(preset.groups);
    setTrophies(preset.trophies);
    setOriginalUsrDatBase64(undefined);
    setSelectedIds(new Set());
  };

  const handleFetchAiTrophies = async () => {
    try {
      const response = await fetch("/api/gemini/fetch-trophies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ titleId, gameTitle, numTrophies: trophies.length }),
      });
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || "Falha ao conectar com a IA");
      }
      
      const newTrophies = [...trophies];
      data.trophies.forEach((aiTrophy: any) => {
        const t = newTrophies.find(x => x.id === aiTrophy.id);
        if (t) {
          t.name = aiTrophy.name;
          t.description = aiTrophy.description;
          t.type = aiTrophy.type || t.type;
        }
      });
      setTrophies(newTrophies);
      alert("Nomes dos troféus recuperados com sucesso usando a Inteligência Artificial!");
    } catch (err: any) {
      alert("Erro ao buscar nomes via IA: " + err.message + "\n\n(Nota: Se você baixou o código para usar localmente, você precisa ter uma GEMINI_API_KEY no seu arquivo .env para que a IA funcione)");
    }
  };

  // Handlers: Upload Files (Client-side instant parsing with server fallback)
  const handleUploadFiles = async (files: File[]) => {
    try {
      if (!files || files.length === 0) return;

      let data: any = null;

      // 1. Try instant client-side parsing (0ms latency, works offline, never fails on network)
      try {
        const clientResult = await parseTrophyFilesClient(files);
        data = {
          profile: clientResult.profile,
          trophies: clientResult.trophies,
          originalUsrDat: clientResult.originalUsrDatBase64,
        };
      } catch (clientErr) {
        console.warn("Client parser notice, attempting server parser:", clientErr);
      }

      // 2. Fallback to server endpoint if client parsing didn't complete
      if (!data) {
        const formData = new FormData();
        for (const file of files) {
          formData.append("files", file);
        }

        const response = await fetch("/api/upload-trophy-files", {
          method: "POST",
          body: formData,
        });

        const contentType = response.headers.get("content-type") || "";
        if (!response.ok || !contentType.includes("application/json")) {
          const errText = await response.text();
          throw new Error(errText || "Falha ao processar arquivos no servidor.");
        }

        data = await response.json();
      }

      if (!data || !data.trophies || !data.profile) {
        throw new Error("Não foi possível extrair a lista de troféus dos arquivos enviados.");
      }

      setGameTitle(data.profile.title && data.profile.title !== "UNKNOWN" ? data.profile.title : data.profile.titleId);
      setTitleId(data.profile.titleId);
      setAccountId(data.profile.accountId);

      const parsedTrophies = data.trophies.map((t: any) => {
        let ts = t.timestamp;
        if (t.isUnlocked && !ts) {
          ts = new Date().toISOString();
        } else if (ts && typeof ts !== "string") {
          ts = new Date(ts).toISOString();
        }
        return {
          id: t.id,
          name: t.name,
          description: t.detail || t.description || "",
          hidden: Boolean(t.hidden),
          type: t.type || "Bronze",
          unlocked: Boolean(t.isUnlocked ?? t.unlocked),
          synced: Boolean(t.isSynced ?? t.synced),
          timestamp: ts || null,
          iconDataUrl: t.base64Image || t.iconDataUrl,
          groupId: "default",
        };
      });

      setGroups([{ id: "default", title: "Base Game", iconDataUrl: "", numTrophies: parsedTrophies.length }]);
      setTrophies(parsedTrophies);
      setOriginalUsrDatBase64(data.originalUsrDat);
      setSelectedIds(new Set());
    } catch (err: any) {
      console.error("Failed to upload files:", err);
      alert("Erro ao processar os arquivos. Certifique-se de selecionar a pasta do jogo contendo TROPCONF.SFM, PARAM.SFO e TROPUSR.DAT (ou o arquivo .ZIP do conjunto).");
    }
  };

  // Drag and Drop Handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    // Only set to false if we're leaving the main container
    if (e.currentTarget === e.target) {
      setIsDragging(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.items) {
      // Use DataTransferItemList interface to access the file(s) and folders recursively
      const files = await getFilesFromDataTransferItems(e.dataTransfer.items);
      if (files.length > 0) {
        handleUploadFiles(files);
      }
    } else if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      // Fallback for older browsers
      handleUploadFiles(Array.from(e.dataTransfer.files));
    }
  };

  // Handlers: Selection Toggles
  const handleToggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAll = () => {
    setSelectedIds(new Set(trophies.map((t) => t.id)));
  };

  const handleDeselectAll = () => {
    setSelectedIds(new Set());
  };

  // Handlers: Trophy Status Updates
  const executeToggleUnlock = React.useCallback((id: number) => {
    setTrophies((prev) => {
      const startMs = Date.now() - MIN_DIFFICULTY_GAP_MS - 3600000;
      return prev.map((t) => {
        if (t.id === id) {
          const nextUnlocked = !t.unlocked;
          let ts = t.timestamp;
          if (nextUnlocked) {
            if (isHighDifficultyTrophy(t)) {
              // Enforce 24 hour campaign interval
              const unlockedMsList = prev
                .filter((p) => p.unlocked && p.timestamp)
                .map((p) => new Date(p.timestamp!).getTime());
              const earliestUnlockedMs = unlockedMsList.length > 0 ? Math.min(...unlockedMsList) : startMs;
              const minRequiredMs = Math.max(Date.now(), earliestUnlockedMs + MIN_DIFFICULTY_GAP_MS);
              ts = new Date(minRequiredMs).toISOString();
            } else {
              ts = t.timestamp || new Date().toISOString();
            }
          } else {
            ts = null;
          }
          return { ...t, unlocked: nextUnlocked, timestamp: ts };
        }
        return t;
      });
    });
  }, []);

  const handleToggleUnlock = React.useCallback((id: number) => {
    const trophy = trophiesRef.current.find((t) => t.id === id);
    if (trophy && !trophy.unlocked && isHighDifficultyTrophy(trophy)) {
      setPendingDiffTrophies([trophy]);
      setPendingAction(() => () => executeToggleUnlock(id));
      setDiffWarningOpen(true);
    } else {
      executeToggleUnlock(id);
    }
  }, [executeToggleUnlock]);

  const handleUpdateTimestamp = React.useCallback((id: number, timestamp: string | null) => {
    setTrophies((prev) =>
      prev.map((t) => (t.id === id ? { ...t, timestamp, unlocked: Boolean(timestamp) } : t))
    );
  }, []);

  // Handlers: Batch Actions
  const executeBatchUnlock = React.useCallback(() => {
    const now = Date.now();
    const startMs = now - 2 * 24 * 3600 * 1000;

    const selectedList = trophies
      .filter((t) => selectedIds.has(t.id))
      .sort((a, b) => (isHighDifficultyTrophy(a) ? 1 : 0) - (isHighDifficultyTrophy(b) ? 1 : 0));

    const tsMap = new Map<number, string>();
    let currentMs = startMs;

    selectedList.forEach((t) => {
      if (isHighDifficultyTrophy(t)) {
        currentMs = Math.max(currentMs + 3600000, startMs + MIN_DIFFICULTY_GAP_MS);
      } else {
        currentMs += 15 * 60 * 1000;
      }
      tsMap.set(t.id, new Date(currentMs).toISOString());
    });

    setTrophies((prev) =>
      prev.map((t) => {
        if (selectedIds.has(t.id)) {
          return {
            ...t,
            unlocked: true,
            timestamp: tsMap.get(t.id) || new Date().toISOString(),
          };
        }
        return t;
      })
    );
  }, []);

  const handleBatchUnlock = () => {
    const selectedHighDiff = trophies.filter(
      (t) => selectedIds.has(t.id) && !t.unlocked && isHighDifficultyTrophy(t)
    );
    if (selectedHighDiff.length > 0) {
      setPendingDiffTrophies(selectedHighDiff);
      setPendingAction(() => () => executeBatchUnlock());
      setDiffWarningOpen(true);
    } else {
      executeBatchUnlock();
    }
  };

  const handleBatchLock = () => {
    setTrophies((prev) =>
      prev.map((t) => (selectedIds.has(t.id) ? { ...t, unlocked: false, timestamp: null } : t))
    );
  };

  const handleBatchSetDate = (timestamp: string) => {
    setTrophies((prev) =>
      prev.map((t) => (selectedIds.has(t.id) ? { ...t, unlocked: true, timestamp } : t))
    );
  };

  // Handlers: Instant Platinum (Sets Platinum timestamp to be LAST + 3 mins)
  const handleInstantPlatinum = () => {
    const plat = trophies.find((t) => t.type === "Platinum");
    if (!plat) {
      alert("No Platinum trophy found in this game's trophy set.");
      return;
    }

    // Find max unlocked timestamp among non-platinum trophies
    const nonPlatUnlocked = trophies.filter((t) => t.id !== plat.id && t.unlocked && t.timestamp);
    let lastTime = Date.now();

    if (nonPlatUnlocked.length > 0) {
      const timestamps = nonPlatUnlocked.map((t) => new Date(t.timestamp!).getTime());
      lastTime = Math.max(...timestamps);
    }

    const platTime = new Date(lastTime + 30 * 1000).toISOString(); // +30 seconds buffer for PSN compliance

    setTrophies((prev) =>
      prev.map((t) => (t.id === plat.id ? { ...t, unlocked: true, timestamp: platTime } : t))
    );
  };

  // Handlers: Smart Randomizer Application
  const handleApplyRandomizer = (config: RandomizeConfig) => {
    const startMs = new Date(config.startDate).getTime();
    const endMs = new Date(config.endDate).getTime();
    const totalTimeSpan = Math.max(10000, endMs - startMs);

    const targetTrophies = trophies
      .filter((t) => t.type !== "Platinum")
      .sort((a, b) => (isHighDifficultyTrophy(a) ? 1 : 0) - (isHighDifficultyTrophy(b) ? 1 : 0));

    let currentPointer = startMs;

    const updatedMap = new Map<number, string>();

    targetTrophies.forEach((t) => {
      if (config.preserveUnlocked && t.unlocked && t.timestamp) {
        updatedMap.set(t.id, t.timestamp);
        return;
      }

      // Random jitter
      const minJitter = config.minIntervalMins * 60 * 1000;
      const maxJitter = config.maxIntervalMins * 60 * 1000;
      const jitter = Math.floor(Math.random() * (maxJitter - minJitter)) + minJitter;

      currentPointer += jitter;

      // Enforce 24 hour campaign rule for high difficulty trophies
      if (isHighDifficultyTrophy(t)) {
        currentPointer = Math.max(currentPointer, startMs + MIN_DIFFICULTY_GAP_MS);
      }

      if (currentPointer > endMs) currentPointer = endMs - 60000;
      updatedMap.set(t.id, new Date(currentPointer).toISOString());
    });

    const updated = trophies.map((t) => {
      if (t.type === "Platinum") return t;
      if (updatedMap.has(t.id)) {
        return {
          ...t,
          unlocked: true,
          timestamp: updatedMap.get(t.id)!,
        };
      }
      return t;
    });

    // Ensure Platinum last if requested
    if (config.ensurePlatinumLast) {
      const plat = updated.find((t) => t.type === "Platinum");
      if (plat) {
        const otherTimes = updated
          .filter((t) => t.id !== plat.id && t.unlocked && t.timestamp)
          .map((t) => new Date(t.timestamp!).getTime());

        const maxOther = otherTimes.length > 0 ? Math.max(...otherTimes) : currentPointer;
        const platTime = new Date(maxOther + 30 * 1000).toISOString();

        plat.unlocked = true;
        plat.timestamp = platTime;
      }
    }

    setTrophies(updated);
  };

  // Handlers: Auto-Fix Sequence Errors
  const handleAutoFixSequence = () => {
    const plat = trophies.find((t) => t.type === "Platinum");
    const unlockedNonPlat = trophies
      .filter((t) => t.type !== "Platinum" && t.unlocked)
      .map((t) => ({
        ...t,
        timeMs: t.timestamp ? new Date(t.timestamp).getTime() : 0,
      }));

    if (unlockedNonPlat.length === 0 && (!plat || !plat.unlocked)) return;

    const now = Date.now();
    const ps3Release = new Date("2006-11-11").getTime();

    // Filter valid timestamps to find anchor point
    const validTimes = unlockedNonPlat
      .map((t) => t.timeMs)
      .filter((ms) => ms >= ps3Release && ms <= now);

    // Sort non-platinum trophies: Normal first, High Difficulty LAST
    unlockedNonPlat.sort((a, b) => {
      const aHigh = isHighDifficultyTrophy(a) ? 1 : 0;
      const bHigh = isHighDifficultyTrophy(b) ? 1 : 0;
      if (aHigh !== bHigh) return aHigh - bHigh;
      return a.timeMs - b.timeMs;
    });

    let firstAnchorMs =
      validTimes.length > 0
        ? Math.min(...validTimes)
        : now - Math.max(1, unlockedNonPlat.length) * 20 * 60 * 1000;

    if (firstAnchorMs < ps3Release || firstAnchorMs > now) {
      firstAnchorMs = now - Math.max(1, unlockedNonPlat.length) * 20 * 60 * 1000;
    }

    let currentPointer = firstAnchorMs;
    const fixedMap = new Map<number, string>();

    unlockedNonPlat.forEach((t, idx) => {
      if (idx === 0) {
        // Set first trophy timestamp
        fixedMap.set(t.id, new Date(currentPointer).toISOString());
      } else {
        const prevMs = currentPointer;
        const rawMs = t.timeMs;

        // If raw timestamp is out of order, < 15s from previous, in future, or before ps3 release, adjust it!
        if (rawMs <= prevMs || rawMs < prevMs + 15000 || rawMs > now || rawMs < ps3Release) {
          // Add 10 to 30 minutes gap between trophies
          currentPointer = prevMs + 1000 * 60 * (10 + Math.floor(Math.random() * 20));
        } else {
          currentPointer = rawMs;
        }

        // ENFORCE RULE: High difficulty trophies MUST be unlocked AT LEAST 24 Hours after start
        if (isHighDifficultyTrophy(t)) {
          currentPointer = Math.max(currentPointer, firstAnchorMs + MIN_DIFFICULTY_GAP_MS);
        }

        // Clamp if exceeded current time
        if (currentPointer > now) {
          currentPointer = now - Math.max(1, unlockedNonPlat.length - idx) * 60 * 1000;
        }

        fixedMap.set(t.id, new Date(currentPointer).toISOString());
      }
    });

    // Platinum MUST always be last, unlocked AFTER all other base game trophies with a safe 30s buffer
    if (plat && plat.unlocked) {
      currentPointer = Math.max(currentPointer + 30000, Date.now() - 5000);
      fixedMap.set(plat.id, new Date(currentPointer).toISOString());
    }

    setTrophies((prev) =>
      prev.map((t) => {
        const fixedTime = fixedMap.get(t.id);
        if (fixedTime) {
          return {
            ...t,
            unlocked: true,
            timestamp: fixedTime,
          };
        }
        return t;
      })
    );
  };

  // Handlers: Binary TROPUSR.DAT Export
  const performExport = async () => {
    if (!originalUsrDatBase64) {
      alert("Nenhum arquivo TROPUSR original encontrado.");
      return;
    }
    try {
      // 1. Try instant client-side binary generation
      try {
        const originalBytes = base64ToUint8Array(originalUsrDatBase64);
        const updatedBytes = updateTropUsrClient(originalBytes, trophies);
        const blob = new Blob([updatedBytes], { type: "application/octet-stream" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "TROPUSR.DAT";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        return;
      } catch (clientExportErr) {
        console.warn("Client export failed, falling back to server:", clientExportErr);
      }

      // 2. Fallback to server API
      const payloadTrophies = trophies.map(t => ({
        id: t.id,
        isUnlocked: t.unlocked,
        isSynced: t.synced,
        timestamp: t.timestamp ? new Date(t.timestamp).toISOString() : null,
      }));

      const response = await fetch("/api/export-tropusr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tropUsrBase64: originalUsrDatBase64,
          trophies: payloadTrophies
        }),
      });

      if (!response.ok) throw new Error(await response.text());
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "TROPUSR.DAT";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert("Erro ao exportar o TROPUSR.DAT");
    }
  };

  const handleGlobalSave = () => {
    const hardKeywords = ["hard", "difícil", "crushing", "insane", "professional", "veteran", "nightmare"];
    const easyKeywords = ["easy", "fácil", "normal", "casual", "beginner"];

    const unlocked = trophies.filter(t => t.unlocked && t.timestamp);
    const hards = unlocked.filter(t => hardKeywords.some(kw => t.name.toLowerCase().includes(kw) || t.description.toLowerCase().includes(kw)));
    const easys = unlocked.filter(t => easyKeywords.some(kw => t.name.toLowerCase().includes(kw) || t.description.toLowerCase().includes(kw)));

    let hasViolation = false;
    for (const h of hards) {
      for (const e of easys) {
        if (h.timestamp!.getTime() < e.timestamp!.getTime()) {
          hasViolation = true;
          break;
        }
      }
      if (hasViolation) break;
    }

    if (hasViolation) {
      setPendingDiffTrophies(hards);
      setDiffWarningOpen(true);
      setPendingAction(() => () => performExport());
    } else {
      performExport();
    }
  };

  // Handlers: Full Repackaged ZIP Export
  const handleExportZip = async () => {
    const zip = new JSZip();
    const folder = zip.folder(titleId) || zip;

    // Add modified binary DAT
    const bytes = serializeTropUsrDat(trophies, originalUsrDatBase64);
    folder.file("TROPUSR.DAT", bytes);

    // Generate text/XML SFM representation
    const sfmText = `<?xml version="1.0" encoding="UTF-8"?>
<trophyconf title="${gameTitle}" titleid="${titleId}">
${trophies
  .map(
    (t) =>
      `  <trophy id="${String(t.id).padStart(3, "0")}" type="${t.type[0]}" hidden="${
        t.hidden ? "yes" : "no"
      }">\n    <name>${t.name}</name>\n    <detail>${t.description}</detail>\n  </trophy>`
  )
  .join("\n")}
</trophyconf>`;

    folder.file("TROPCONF.SFM", sfmText);

    // Generate zip blob
    const content = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(content);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${titleId}_Trophies.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div 
      className="min-h-screen bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans selection:bg-zinc-800 dark:selection:bg-zinc-100 selection:text-white dark:selection:text-zinc-950 flex flex-col relative"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      
      {/* Drop Zone Overlay */}
      {isDragging && (
        <div className="absolute inset-0 z-50 bg-amber-500/10 backdrop-blur-sm border-4 border-amber-500 border-dashed rounded-lg flex flex-col items-center justify-center pointer-events-none transition-all duration-200">
          <div className="bg-zinc-100 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 p-8 rounded-2xl shadow-2xl flex flex-col items-center text-center max-w-sm">
            <div className="w-16 h-16 bg-zinc-200 dark:bg-zinc-800 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-black dark:text-white mb-2">Solte seus arquivos aqui</h2>
            <p className="text-sm text-zinc-400 dark:text-zinc-600 dark:text-zinc-400">Arraste a pasta inteira do troféu, o TROPUSR.DAT ou um arquivo ZIP para carregar.</p>
          </div>
        </div>
      )}

      {/* Header */}
      <Header
        gameInfo={gameInfo}
        onSelectPreset={handleSelectPreset}
        onUploadZip={handleUploadFiles}
        onExportDat={handleGlobalSave}
        onExportZip={handleExportZip}
        onOpenJsonModal={() => setIsJsonModalOpen(true)}
        onOpenPfdGuide={() => setIsPfdGuideOpen(true)}
        onOpenRandomizer={() => setIsRandomizerOpen(true)}
        onOpenCalculator={() => setIsCalculatorOpen(true)}
        onOpenParamSfo={() => setIsParamSfoOpen(true)}
        onOpenVaultStats={() => setIsVaultStatsOpen(true)}
        onOpenAbout={() => setIsAboutOpen(true)}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-4">
        
        {/* Game Stats Dashboard Card */}
        <GameSummaryCard gameInfo={gameInfo} healthScore={healthScore} />

        {/* Validation Issues Banner if any */}

        {trophies.length > 0 && trophies[0].name.includes("Oculto") && (
          <div className="bg-indigo-50 dark:bg-indigo-900/40 border border-indigo-500/50 rounded-xl p-4 mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-indigo-700 dark:text-indigo-300 font-semibold flex items-center gap-2">
                <span className="text-xl">✨</span> Descoberta por Inteligência Artificial
              </h3>
              <p className="text-indigo-600 dark:text-indigo-200/80 text-sm mt-1">
                Como o arquivo TROPCONF.SFM não foi encontrado na pasta, os nomes reais não puderam ser lidos. Deseja que a IA descubra e preencha a lista original para você?
              </p>
            </div>
            <button
              onClick={handleFetchAiTrophies}
              className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-black dark:text-white rounded-lg shadow-lg font-medium whitespace-nowrap transition-colors"
            >
              Descobrir Nomes (IA)
            </button>
          </div>
        )}

        {/* Interactive Trophy Table */}
        <TrophyTable
          trophies={trophies}
          titleId={titleId}
          gameTitle={gameTitle}
          onToggleUnlock={handleToggleUnlock}
          onUpdateTimestamp={handleUpdateTimestamp}
          onApplyRoutineDistribution={(updated) => setTrophies(updated)}
        />

      </main>

      {/* Footer */}
      <footer className="bg-zinc-100 dark:bg-zinc-900 border-t border-zinc-300 dark:border-zinc-800 text-zinc-500 dark:text-zinc-500 py-4 text-center text-xs mt-12 font-medium">
        <div className="max-w-7xl mx-auto px-4">
          {t("footerText")}
        </div>
      </footer>

      {/* Modals */}
      <Suspense fallback={null}>
        <SmartCalculatorModal
          isOpen={isCalculatorOpen}
          onClose={() => setIsCalculatorOpen(false)}
          gameInfo={gameInfo}
          trophies={trophies}
          onApplyCalculatedTimestamps={(updatedTrophies) => setTrophies(updatedTrophies)}
        />
        <RandomizerModal
          isOpen={isRandomizerOpen}
          onClose={() => setIsRandomizerOpen(false)}
          onApply={handleApplyRandomizer}
        />
        <JsonImportExportModal
          isOpen={isJsonModalOpen}
          gameInfo={gameInfo}
          trophies={trophies}
          onClose={() => setIsJsonModalOpen(false)}
          onImportJson={(newTrophies) => setTrophies(newTrophies)}
        />
        <PfdToolGuideModal
          isOpen={isPfdGuideOpen}
          titleId={titleId}
          onClose={() => setIsPfdGuideOpen(false)}
        />
        <ParamSfoModal
          isOpen={isParamSfoOpen}
          onClose={() => setIsParamSfoOpen(false)}
          gameInfo={gameInfo}
          onUpdateGameInfo={(updated) => {
            if (updated.titleId) setTitleId(updated.titleId);
            if (updated.title) setGameTitle(updated.title);
            if (updated.accountId) setAccountId(updated.accountId);
          }}
        />
        <VaultStatsModal
          isOpen={isVaultStatsOpen}
          onClose={() => setIsVaultStatsOpen(false)}
          currentGame={gameInfo}
          trophies={trophies}
          onBatchApplyTrophies={(newTrophies) => setTrophies(newTrophies)}
        />
        <DifficultyWarningModal
          isOpen={diffWarningOpen}
          highDiffTrophies={pendingDiffTrophies}
          onConfirm={() => {
            if (pendingAction) pendingAction();
            setDiffWarningOpen(false);
            setPendingDiffTrophies([]);
            setPendingAction(null);
          }}
          onCancel={() => {
            setDiffWarningOpen(false);
            setPendingDiffTrophies([]);
            setPendingAction(null);
          }}
        />
        <AboutAppModal
          isOpen={isAboutOpen}
          onClose={() => setIsAboutOpen(false)}
        />
      </Suspense>
    </div>
  );
}
