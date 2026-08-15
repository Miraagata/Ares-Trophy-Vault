export const SAMPLE_PRESET_GAMES = [
  { titleId: "BLUS31156", name: "Grand Theft Auto V" },
  { titleId: "NPWR07612_00", name: "Metal Gear Solid V: The Phantom Pain" }
];

export async function getFilesFromDataTransferItems(items: DataTransferItemList): Promise<File[]> {
  const files: File[] = [];
  const promises: Promise<void>[] = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (item.kind === 'file') {
      const entry = item.webkitGetAsEntry();
      if (entry) {
        promises.push(traverseFileTree(entry, '', files));
      } else {
        const file = item.getAsFile();
        if (file) files.push(file);
      }
    }
  }

  await Promise.all(promises);
  return files;
}

async function traverseFileTree(item: any, path: string, files: File[]): Promise<void> {
  if (item.isFile) {
    return new Promise((resolve) => {
      item.file((file: File) => {
        // preserve the relative path so that we can distinguish files if needed, but here we just push the file
        files.push(file);
        resolve();
      });
    });
  } else if (item.isDirectory) {
    const dirReader = item.createReader();
    
    const readEntriesPromise = () => new Promise<any[]>((resolve) => {
      dirReader.readEntries((entries: any[]) => {
        resolve(entries);
      });
    });

    let allEntries: any[] = [];
    let entries = await readEntriesPromise();
    while (entries.length > 0) {
      allEntries = allEntries.concat(entries);
      entries = await readEntriesPromise();
    }

    const promises = allEntries.map(entry => traverseFileTree(entry, path + item.name + '/', files));
    await Promise.all(promises);
  }
}


export function buildGameInfo(title: string, titleId: string, accountId: string, trophies: any[], groups: any[]) {
  const counts = {
    platinum: { unlocked: 0, total: 0 },
    gold: { unlocked: 0, total: 0 },
    silver: { unlocked: 0, total: 0 },
    bronze: { unlocked: 0, total: 0 }
  };

  let earnedPoints = 0;
  let totalPoints = 0;
  let unlockedTrophies = 0;

  const pointMap: Record<string, number> = {
    "Platinum": 300,
    "Gold": 90,
    "Silver": 30,
    "Bronze": 15
  };

  for (const t of trophies) {
    const typeKey = (t.type || "Bronze").toLowerCase() as keyof typeof counts;
    if (counts[typeKey]) {
      counts[typeKey].total++;
      if (t.unlocked) counts[typeKey].unlocked++;
    }

    const pts = pointMap[t.type] || 15;
    totalPoints += pts;
    if (t.unlocked) {
      unlockedTrophies++;
      earnedPoints += pts;
    }
  }

  const completionPercentage = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;
  
  let iconDataUrl = "";
  if (groups && groups.length > 0 && groups[0].iconDataUrl) {
    iconDataUrl = groups[0].iconDataUrl;
  } else if (trophies && trophies.length > 0) {
    const plat = trophies.find(t => t.type === "Platinum");
    if (plat && plat.iconDataUrl) iconDataUrl = plat.iconDataUrl;
    else iconDataUrl = trophies[0].iconDataUrl || "";
  }

  return {
    title: title || "Unknown Game",
    titleId: titleId || "NPWR00000_00",
    accountId: accountId || "0000000000000000",
    groups: groups || [],
    hasIcon: !!iconDataUrl,
    iconDataUrl,
    completionPercentage,
    unlockedTrophies,
    totalTrophies: trophies ? trophies.length : 0,
    earnedPoints,
    totalPoints,
    counts
  };
}

export function serializeTropUsrDat(trophies: any[], originalUsrDatBase64: string) { return new Uint8Array(); }
export function unpackTrophyFiles(files: File[]) { return Promise.resolve({}); }

