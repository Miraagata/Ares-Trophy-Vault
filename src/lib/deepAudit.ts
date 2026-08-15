export interface AuditReport {
  isValid: boolean;
  criticalErrors: string[];
  warnings: string[];
}

export const runDeepAudit = (trophies: any[]): AuditReport => {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Ordena a timeline do mais antigo para o mais novo
  const unlocked = trophies
    .filter(t => t.isUnlocked || t.unlocked)
    .filter(t => t.timestamp)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  if (unlocked.length === 0) return { isValid: true, criticalErrors: [], warnings: [] };

  // Dicionário Heurístico: Mapeia palavras-chave (Português e Inglês) para categorias lógicas
  const REGEX = {
    TUTORIAL: /(tutorial|prologue|chapter 1|first|primeiro|prólogo|capítulo 1|início|begin)/i,
    STORY_END: /(complete the game|finish the story|zere o jogo|final boss|créditos|credits|campaign complete)/i,
    POST_GAME: /(new game\+|ng\+|true ending|final verdadeiro|hard mode|hardcore|speedrun)/i,
    SECRET_BOSS: /(secret boss|chefe secreto|ultimate|superboss|weapon|arma secreta|hidden)/i,
    MAX_GRIND: /(level 99|level 100|max level|all skills|todas as armas|all weapons|100%|colete todos|collect all)/i
  };

  // Variáveis para rastrear os "marcos" da linha do tempo
  let firstTrophyTime = new Date(unlocked[0].timestamp).getTime();
  let storyEndTime: number | null = null;
  let hasTutorial = false;

  // 1. CHECAGEM DE PLATINA
  const platinum = unlocked.find(t => t.id === 0 || t.type === "Platinum");
  if (platinum && platinum.id !== unlocked[unlocked.length - 1].id) {
    errors.push(`ERRO CRÍTICO: A Platina ('${platinum.name}') deve obrigatoriamente ser o último troféu da linha do tempo.`);
  }

  // 2. VARREDURA SEMÂNTICA (Análise de Texto e Lógica de Game Design)
  for (const trophy of unlocked) {
    const textToAnalyze = `${trophy.name} ${trophy.detail || trophy.description}`.toLowerCase();
    const trophyTime = new Date(trophy.timestamp).getTime();
    
    // Identifica se passou pelo fim do jogo
    if (REGEX.STORY_END.test(textToAnalyze)) {
      storyEndTime = trophyTime;
    }

    // Identifica se passou pelo tutorial
    if (REGEX.TUTORIAL.test(textToAnalyze)) {
      hasTutorial = true;
      // Se um troféu de tutorial ocorreu 5 horas DEPOIS do primeiro troféu ganho, é bizarro.
      const hoursSinceStart = (trophyTime - firstTrophyTime) / (1000 * 60 * 60);
      if (hoursSinceStart > 5) {
        warnings.push(`Revisão de Lore: O troféu de Introdução/Tutorial ('${trophy.name}') foi desbloqueado muito tempo após o início da gameplay.`);
      }
    }

    // 🚨 REGRA: Post-Game / NG+ não pode vir ANTES de zerar a campanha normal
    if (REGEX.POST_GAME.test(textToAnalyze)) {
      if (!storyEndTime || trophyTime <= storyEndTime) {
        errors.push(`ERRO CRÍTICO: Paradoxo de New Game+. O troféu ('${trophy.name}') exige zerar o jogo, mas foi desbloqueado ANTES ou DURANTE a campanha principal.`);
      }
    }

    // 🚨 REGRA: Chefes Secretos e Grind Absurdo exigem TEMPO
    if (REGEX.SECRET_BOSS.test(textToAnalyze) || REGEX.MAX_GRIND.test(textToAnalyze)) {
      const hoursSinceStart = (trophyTime - firstTrophyTime) / (1000 * 60 * 60);
      
      // Matar um Superboss ou pegar Level 99 com menos de 2 horas de save é humanamente impossível (exceto jogos muito curtos)
      if (hoursSinceStart < 2) {
         errors.push(`ERRO CRÍTICO: Grind Impossível. O troféu de alto nível ('${trophy.name}') foi ganho com menos de 2h de gameplay total. Isso acusa injeção de save.`);
      }

      // Se existir o marco de Fim de Jogo, chefes secretos costumam vir depois
      if (storyEndTime && trophyTime < storyEndTime && REGEX.SECRET_BOSS.test(textToAnalyze)) {
         warnings.push(`Aviso de Risco: Você derrotou um chefe secreto ('${trophy.name}') antes de terminar a campanha. Certifique-se de que o jogo permite isso (ex: chefes não bloqueados por pós-game).`);
      }
    }
  }

  // 3. CHECAGEM DE COLISÃO DE TEMPO (Proteção contra injeção em massa)
  let simultaneousCount = 0;
  for (let i = 0; i < unlocked.length - 1; i++) {
    const timeA = new Date(unlocked[i].timestamp).getTime();
    const timeB = new Date(unlocked[i + 1].timestamp).getTime();
    
    if (Math.abs(timeB - timeA) < 1000) simultaneousCount++;
    else simultaneousCount = 0;

    if (simultaneousCount > 3) {
      errors.push(`ERRO CRÍTICO: Rajada Robótica. Mais de 3 troféus desbloqueados no mesmo segundo. Use a função de Smart Spacing.`);
      break;
    }
  }

  return {
    isValid: errors.length === 0,
    criticalErrors: errors,
    warnings: warnings
  };
};
