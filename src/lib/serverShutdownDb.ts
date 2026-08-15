import { PS3Trophy, ValidationIssue } from "../types";

export interface ServerShutdownEntry {
  id: string;
  gameTitle: string;
  gameTitleMatches: string[];
  titleIdMatches: string[];
  shutdownDate: string; // ISO format "YYYY-MM-DD"
  description: string;
}

export const SERVER_SHUTDOWN_DATABASE: ServerShutdownEntry[] = [
  {
    id: "mgs5-phantom-pain",
    gameTitle: "Metal Gear Solid V: The Phantom Pain",
    gameTitleMatches: ["metal gear solid v", "phantom pain", "mgs v", "mgs5"],
    titleIdMatches: ["NPWR07612_00", "NPWR07613_00", "BLES02102", "BLUS31491", "NPWR08978_00"],
    shutdownDate: "2026-05-31",
    description: "Konami encerrou os serviços online de MGSV no PS3 e Xbox 360.",
  },
  {
    id: "gta-v",
    gameTitle: "Grand Theft Auto V (GTA V)",
    gameTitleMatches: ["grand theft auto v", "gta v", "gta 5", "gta online"],
    titleIdMatches: ["NPWR04856_00", "BLES01807", "BLUS31156", "NPEB01283", "NPUB31154"],
    shutdownDate: "2021-12-16",
    description: "Rockstar Games encerrou os servidores do GTA Online para PS3 e Xbox 360.",
  },
  {
    id: "the-last-of-us",
    gameTitle: "The Last of Us",
    gameTitleMatches: ["the last of us", "tlou"],
    titleIdMatches: ["NPWR04107_00", "BCUS98174", "BLES01555", "NPUA80960", "NPEA00435"],
    shutdownDate: "2019-09-03",
    description: "Naughty Dog encerrou os servidores multiplayer de The Last of Us no PS3.",
  },
  {
    id: "uncharted-2",
    gameTitle: "Uncharted 2: Among Thieves",
    gameTitleMatches: ["uncharted 2", "among thieves"],
    titleIdMatches: ["NPWR00721_00", "BCUS98123", "BLES00511", "NPUA80333"],
    shutdownDate: "2019-09-03",
    description: "Servidores multiplayer do Uncharted 2 encerrados pela Naughty Dog.",
  },
  {
    id: "uncharted-3",
    gameTitle: "Uncharted 3: Drake's Deception",
    gameTitleMatches: ["uncharted 3", "drake's deception"],
    titleIdMatches: ["NPWR02013_00", "BCUS98114", "BLES01179", "NPUA80628"],
    shutdownDate: "2019-09-03",
    description: "Servidores multiplayer do Uncharted 3 encerrados pela Naughty Dog.",
  },
  {
    id: "gran-turismo-5",
    gameTitle: "Gran Turismo 5",
    gameTitleMatches: ["gran turismo 5", "gt5"],
    titleIdMatches: ["NPWR01217_00", "BCUS98114", "BCES00569"],
    shutdownDate: "2014-05-20",
    description: "Sony Polyphony Digital encerrou os serviços online do GT5.",
  },
  {
    id: "gran-turismo-6",
    gameTitle: "Gran Turismo 6",
    gameTitleMatches: ["gran turismo 6", "gt6"],
    titleIdMatches: ["NPWR05018_00", "BCUS98296", "BCES01893"],
    shutdownDate: "2018-03-28",
    description: "Servidores online do Gran Turismo 6 encerrados.",
  },
  {
    id: "demons-souls",
    gameTitle: "Demon's Souls",
    gameTitleMatches: ["demon's souls", "demons souls"],
    titleIdMatches: ["NPWR00336_00", "BLUS30443", "BLES00932"],
    shutdownDate: "2018-02-28",
    description: "Servidores online originais do Demon's Souls encerrados pela Atlus/Bandai Namco.",
  },
  {
    id: "lbp-ps3",
    gameTitle: "LittleBigPlanet",
    gameTitleMatches: ["littlebigplanet", "lbp"],
    titleIdMatches: ["NPWR00151_00", "NPWR01402_00", "BCUS98148", "BCES00141"],
    shutdownDate: "2021-09-13",
    description: "Servidores de LittleBigPlanet 1, 2 e 3 no PS3 foram permanentemente desligados.",
  },
  {
    id: "killzone-3",
    gameTitle: "Killzone 3",
    gameTitleMatches: ["killzone 3", "killzone 2"],
    titleIdMatches: ["NPWR01382_00", "BCUS98235", "BCES01007"],
    shutdownDate: "2018-03-29",
    description: "Guerrilla Games desligou os servidores online de Killzone 2 e 3.",
  }
];

const ONLINE_KEYWORDS = [
  "online",
  "multiplayer",
  "multijogador",
  "servidor",
  "server",
  "co-op",
  "coop",
  "cooperativo",
  "versus",
  "ranked",
  "rankeada",
  "leaderboard",
  "placar",
  "clan",
  "clã",
  "public match",
  "partida pública",
  "network",
  "rede",
  "pvp",
  "psn",
  "matchmaking"
];

/**
 * Checks if a trophy description or title contains online/multiplayer keywords.
 */
export function isOnlineTrophy(trophy: { name: string; description?: string; detail?: string }): boolean {
  const text = `${trophy.name} ${trophy.description || ""} ${trophy.detail || ""}`.toLowerCase();
  return ONLINE_KEYWORDS.some((keyword) => text.includes(keyword));
}

/**
 * Gets server shutdown entry if game matches by TitleID or Title Name.
 */
export function getGameShutdownInfo(titleId?: string, gameTitle?: string): ServerShutdownEntry | null {
  if (!titleId && !gameTitle) return null;

  const cleanTitleId = (titleId || "").trim().toUpperCase();
  const cleanGameTitle = (gameTitle || "").trim().toLowerCase();

  for (const entry of SERVER_SHUTDOWN_DATABASE) {
    if (cleanTitleId && entry.titleIdMatches.some((id) => cleanTitleId.includes(id.toUpperCase()))) {
      return entry;
    }
    if (cleanGameTitle && entry.gameTitleMatches.some((match) => cleanGameTitle.includes(match.toLowerCase()))) {
      return entry;
    }
  }

  return null;
}

/**
 * Validates trophies against server shutdown dates.
 */
export function validateServerShutdown(
  trophies: PS3Trophy[],
  titleId?: string,
  gameTitle?: string
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const shutdownInfo = getGameShutdownInfo(titleId, gameTitle);

  if (!shutdownInfo) return issues;

  const shutdownTime = new Date(`${shutdownInfo.shutdownDate}T23:59:59Z`).getTime();
  const formattedShutdownDate = new Date(shutdownInfo.shutdownDate).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  trophies.forEach((t) => {
    if (!t.unlocked || !t.timestamp) return;

    const trophyTime = new Date(t.timestamp).getTime();
    const isOnline = isOnlineTrophy(t);

    if (isOnline && trophyTime > shutdownTime) {
      issues.push({
        id: `shutdown-violation-${t.id}`,
        severity: "error",
        trophyId: t.id,
        trophyName: t.name,
        title: "⚠️ SERVIDOR ENCERRADO (Risco de Banimento)",
        message: `⚠️ SERVIDOR ENCERRADO. O servidor deste jogo (${shutdownInfo.gameTitle}) foi fechado em ${formattedShutdownDate}. Troféus online após esta data causarão banimento imediato.`,
      });
    }
  });

  return issues;
}
