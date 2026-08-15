import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";

export type Language = "en" | "pt-BR";

export interface Translations {
  // Header
  appTitle: string;
  appSubtitle: string;
  loadSampleGame: string;
  importFolderZip: string;
  geminiAiTimeline: string;
  smartRandomizer: string;
  jsonModal: string;
  pfdGuide: string;
  saveDat: string;
  saveZip: string;

  // Game Summary Card
  gameInfoTitle: string;
  completionProgress: string;
  unlockedTrophies: string;
  totalPoints: string;
  earnedPoints: string;
  sequenceHealth: string;
  perfectHealth: string;
  issuesFound: string;
  titleIdLabel: string;
  accountIdLabel: string;
  groupsLabel: string;
  platinum: string;
  gold: string;
  silver: string;
  bronze: string;

  // Validation Banner
  timestampSequenceCheck: string;
  sequenceErrorCount: string;
  autoFixTimestamps: string;
  sequencePerfectMessage: string;

  // Trophy Table & Filters
  allTrophies: string;
  unlockedOnly: string;
  lockedOnly: string;
  searchPlaceholder: string;
  allGroups: string;
  selectedCount: string;
  selectAll: string;
  deselectAll: string;
  batchUnlock: string;
  batchLock: string;
  setCustomDate: string;
  instantPlatinum: string;
  noTrophiesFound: string;

  // Table Headers
  colId: string;
  colType: string;
  colDetails: string;
  colGroup: string;
  colStatus: string;
  colTimestamp: string;
  colActions: string;
  hiddenBadge: string;
  unlock: string;
  lock: string;
  unlockedState: string;
  lockedState: string;

  // Randomizer Modal
  randomizerTitle: string;
  randomizerSubtitle: string;
  startDate: string;
  endDate: string;
  playstylePreset: string;
  minIntervalMins: string;
  maxIntervalMins: string;
  preserveUnlocked: string;
  ensurePlatinumLast: string;
  generateApply: string;
  cancel: string;

  // AI Timeline Modal
  aiTitle: string;
  aiSubtitle: string;
  aiCompletionSpan: string;
  aiIntensity: string;
  aiGenerating: string;
  aiGenerateBtn: string;
  aiApplyBtn: string;
  aiReasoningTitle: string;

  // JSON Modal
  jsonTitle: string;
  jsonSubtitle: string;
  copyJson: string;
  importJson: string;

  // PFD Guide Modal
  pfdTitle: string;
  pfdSubtitle: string;
  step1Title: string;
  step1Desc: string;
  step2Title: string;
  step2Desc: string;
  step3Title: string;
  step3Desc: string;
  pfdCloseBtn: string;

  // Footer
  footerText: string;
}

const translations: Record<Language, Translations> = {
  en: {
    // Header
    appTitle: "Ares Trophy Vault",
    appSubtitle: "PlayStation 3 Trophy & Timestamp Management Engine",
    loadSampleGame: "🎮 Load Sample Game...",
    importFolderZip: "Import Folder/ZIP",
    geminiAiTimeline: "Smart Timeline",
    smartRandomizer: "Smart Randomizer",
    jsonModal: "JSON",
    pfdGuide: "PFD Guide",
    saveDat: "Save .DAT",
    saveZip: "ZIP",

    // Game Summary Card
    gameInfoTitle: "Game Overview & Statistics",
    completionProgress: "Completion Progress",
    unlockedTrophies: "Unlocked Trophies",
    totalPoints: "Total Trophy Points",
    earnedPoints: "Earned Points",
    sequenceHealth: "Sequence Health",
    perfectHealth: "100% Valid Timestamps",
    issuesFound: "Timestamp Issues Detected",
    titleIdLabel: "Title ID",
    accountIdLabel: "Account ID",
    groupsLabel: "Trophy Groups / DLCs",
    platinum: "Platinum",
    gold: "Gold",
    silver: "Silver",
    bronze: "Bronze",

    // Validation Banner
    timestampSequenceCheck: "Timestamp Sequence Validation",
    sequenceErrorCount: "issues detected in trophy unlock sequence",
    autoFixTimestamps: "⚡ Auto-Fix Timestamps",
    sequencePerfectMessage: "All trophy unlock timestamps are sequentially valid and realistic!",

    // Trophy Table & Filters
    allTrophies: "All Trophies",
    unlockedOnly: "Unlocked Only",
    lockedOnly: "Locked Only",
    searchPlaceholder: "Search trophy name or description...",
    allGroups: "All Groups",
    selectedCount: "selected",
    selectAll: "Select All",
    deselectAll: "Deselect",
    batchUnlock: "Unlock Selected",
    batchLock: "Lock Selected",
    setCustomDate: "Set Custom Date",
    instantPlatinum: "⚡ Instant Platinum",
    noTrophiesFound: "No trophies match the current search filters.",

    // Table Headers
    colId: "ID",
    colType: "Type",
    colDetails: "Trophy Name & Description",
    colGroup: "Group",
    colStatus: "Status",
    colTimestamp: "Timestamp (UTC)",
    colActions: "Actions",
    hiddenBadge: "Hidden",
    unlock: "Unlock",
    lock: "Lock",
    unlockedState: "Unlocked",
    lockedState: "Locked",

    // Randomizer Modal
    randomizerTitle: "Smart Timestamp Randomizer",
    randomizerSubtitle: "Automatically distribute trophy unlock timestamps between a start and end date with realistic human play patterns.",
    startDate: "Start Date & Time",
    endDate: "End Date & Time",
    playstylePreset: "Playstyle Preset",
    minIntervalMins: "Min Interval (Minutes)",
    maxIntervalMins: "Max Interval (Minutes)",
    preserveUnlocked: "Keep already unlocked timestamps unchanged",
    ensurePlatinumLast: "Force Platinum trophy to unlock last (+3 mins buffer)",
    generateApply: "Generate & Apply Timestamps",
    cancel: "Cancel",

    // AI Timeline Modal
    aiTitle: "Gemini AI Realistic Timeline Generator",
    aiSubtitle: "Analyze game structure, trophy difficulty, and story dependencies to construct an ultra-realistic unlock schedule.",
    aiCompletionSpan: "Total Completion Timeframe (Days)",
    aiIntensity: "Gaming Intensity",
    aiGenerating: "Gemini is analyzing trophies and generating a realistic timeline...",
    aiGenerateBtn: "Generate AI Schedule",
    aiApplyBtn: "Apply AI Timestamps",
    aiReasoningTitle: "AI Chronological Strategy & Reasoning",

    // JSON Modal
    jsonTitle: "JSON Import & Export",
    jsonSubtitle: "View, copy, or update trophy data directly in raw JSON format.",
    copyJson: "Copy JSON",
    importJson: "Import & Apply JSON",

    // PFD Guide Modal
    pfdTitle: "PS3 Trophy Resigning & Sync Guide",
    pfdSubtitle: "Complete guide for resigning edited TROPUSR.DAT files using pfdtool or Apollo Save Tool for PS3 CFW / HEN.",
    step1Title: "1. Export modified TROPUSR.DAT",
    step1Desc: "Use the 'Save .DAT' or 'ZIP' button in the header to export your updated trophy files.",
    step2Title: "2. Resign with pfdtool or Apollo Save Tool",
    step2Desc: "Replace TROPUSR.DAT inside dev_hdd0/home/0000000X/trophy/NPWR... and resign the trophy database.",
    step3Title: "3. Rebuild Database & Sync with PSN",
    step3Desc: "Run 'Rebuild Database' or launch a game to register the updated trophies with your profile.",
    pfdCloseBtn: "Got It, Close Guide",

    // Footer
    footerText: "Ares Trophy Vault • PlayStation 3 Trophy Management & Backup Suite",
  },
  "pt-BR": {
    // Header
    appTitle: "Ares Trophy Vault",
    appSubtitle: "Editor e Gerenciador de Troféus do PlayStation 3",
    loadSampleGame: "🎮 Carregar Jogo de Exemplo...",
    importFolderZip: "Importar Pasta/ZIP",
    geminiAiTimeline: "Linha do Tempo Inteligente",
    smartRandomizer: "Gerador Aleatório Inteligente",
    jsonModal: "JSON",
    pfdGuide: "Guia PFD",
    saveDat: "Salvar e Exportar TROPUSR",
    saveZip: "ZIP",

    // Game Summary Card
    gameInfoTitle: "Visão Geral e Estatísticas do Jogo",
    completionProgress: "Progresso de Conclusão",
    unlockedTrophies: "Troféus Desbloqueados",
    totalPoints: "Pontuação Total dos Troféus",
    earnedPoints: "Pontos Conquistados",
    sequenceHealth: "Saúde da Sequência",
    perfectHealth: "Timestamps 100% Válidos",
    issuesFound: "Problemas de Sequência Detectados",
    titleIdLabel: "ID do Título (Title ID)",
    accountIdLabel: "ID da Conta (Account ID)",
    groupsLabel: "Grupos de Troféus / DLCs",
    platinum: "Platina",
    gold: "Ouro",
    silver: "Prata",
    bronze: "Bronze",

    // Validation Banner
    timestampSequenceCheck: "Validação da Sequência de Timestamps",
    sequenceErrorCount: "problemas detectados na ordem de desbloqueio dos troféus",
    autoFixTimestamps: "⚡ Corrigir Timestamps Automaticamente",
    sequencePerfectMessage: "Todos os horários de desbloqueio dos troféus estão sequencialmente válidos e realistas!",

    // Trophy Table & Filters
    allTrophies: "Todos os Troféus",
    unlockedOnly: "Apenas Desbloqueados",
    lockedOnly: "Apenas Bloqueados",
    searchPlaceholder: "Buscar por nome ou descrição do troféu...",
    allGroups: "Todos os Grupos",
    selectedCount: "selecionado(s)",
    selectAll: "Selecionar Todos",
    deselectAll: "Desmarcar Todos",
    batchUnlock: "Desbloquear Selecionados",
    batchLock: "Bloquear Selecionados",
    setCustomDate: "Definir Data Personalizada",
    instantPlatinum: "⚡ Platina Instantânea",
    noTrophiesFound: "Nenhum troféu encontrado para os filtros atuais.",

    // Table Headers
    colId: "ID",
    colType: "Tipo",
    colDetails: "Nome e Descrição do Troféu",
    colGroup: "Grupo",
    colStatus: "Status",
    colTimestamp: "Data e Hora (UTC)",
    colActions: "Ações",
    hiddenBadge: "Oculto",
    unlock: "Desbloquear",
    lock: "Bloquear",
    unlockedState: "Desbloqueado",
    lockedState: "Bloqueado",

    // Randomizer Modal
    randomizerTitle: "Gerador Aleatório de Timestamps",
    randomizerSubtitle: "Distribua automaticamente os horários de desbloqueio dos troféus entre uma data inicial e final simulando um padrão humano realista.",
    startDate: "Data e Hora Inicial",
    endDate: "Data e Hora Final",
    playstylePreset: "Estilo de Jogo (Preset)",
    minIntervalMins: "Intervalo Mínimo (Minutos)",
    maxIntervalMins: "Intervalo Máximo (Minutos)",
    preserveUnlocked: "Manter troféus já desbloqueados inalterados",
    ensurePlatinumLast: "Forçar troféu de Platina a desbloquear por último (+3 min)",
    generateApply: "Gerar e Aplicar Timestamps",
    cancel: "Cancelar",

    // AI Timeline Modal
    aiTitle: "Gerador de Linha do Tempo Realista com Gemini AI",
    aiSubtitle: "Analisa os troféus, a dificuldade e a ordem da história do jogo para construir um cronograma de desbloqueio hiper-realista.",
    aiCompletionSpan: "Duração Total Estimada de Jogo (Dias)",
    aiIntensity: "Intensidade do Jogador",
    aiGenerating: "O Gemini está analisando os troféus e gerando o cronograma realista...",
    aiGenerateBtn: "Gerar Cronograma IA",
    aiApplyBtn: "Aplicar Timestamps da IA",
    aiReasoningTitle: "Estratégia Cronológica e Raciocínio da IA",

    // JSON Modal
    jsonTitle: "Importação e Exportação JSON",
    jsonSubtitle: "Visualize, copie ou atualize os dados dos troféus diretamente no formato JSON.",
    copyJson: "Copiar JSON",
    importJson: "Importar e Aplicar JSON",

    // PFD Guide Modal
    pfdTitle: "Guia de Reassinatura e Sincronização de Troféus (pfdtool / Apollo)",
    pfdSubtitle: "Guia completo para reasser o arquivo TROPUSR.DAT modificado usando pfdtool ou Apollo Save Tool em consoles PS3 com CFW / HEN.",
    step1Title: "1. Exportar TROPUSR.DAT modificado",
    step1Desc: "Use o botão 'Salvar .DAT' ou 'ZIP' no cabeçalho para exportar seus arquivos de troféus atualizados.",
    step2Title: "2. Reassinar com pfdtool ou Apollo Save Tool",
    step2Desc: "Substitua o TROPUSR.DAT em dev_hdd0/home/0000000X/trophy/NPWR... e reassine o banco de dados de troféus.",
    step3Title: "3. Recriar Banco de Dados e Sincronizar com a PSN",
    step3Desc: "Execute 'Recriar Banco de Dados' (Rebuild Database) no PS3 ou inicie um jogo para registrar os troféus no seu perfil.",
    pfdCloseBtn: "Entendi, Fechar Guia",

    // Footer
    footerText: "Ares Trophy Vault • Suíte de Gerenciamento e Backup de Conquistas do PlayStation 3",
  },
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: keyof Translations) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem("ps3_trophy_lang");
    if (saved === "pt-BR" || saved === "en") return saved;
    // Default to pt-BR if user browser is pt or pt-BR, else pt-BR or en
    const navLang = navigator.language;
    if (navLang.startsWith("pt")) return "pt-BR";
    return "pt-BR"; // Set pt-BR as primary default as requested by user
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem("ps3_trophy_lang", lang);
  };

  const t = (key: keyof Translations): string => {
    return translations[language][key] || translations["en"][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
};
