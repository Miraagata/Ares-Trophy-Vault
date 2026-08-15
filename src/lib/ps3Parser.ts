import JSZip from "jszip";

export interface ParsedTrophy {
  id: number;
  name: string;
  detail: string;
  hidden: boolean;
  type: string; // "Platinum", "Gold", "Silver", "Bronze"
  base64Image?: string;
  isUnlocked: boolean;
  isSynced: boolean;
  timestamp: string | null;
}

export interface PlayerProfile {
  titleId: string;
  accountId: string;
  title?: string;
}

export interface ParsedSaveData {
  profile: PlayerProfile;
  trophies: ParsedTrophy[];
}

/**
 * Parses TROPCONF.SFM (XML) to extract trophy metadata
 */
export function parseTROPCONF(buffer: Buffer): any[] {
  const xml = buffer.toString("utf-8");
  const trophies: any[] = [];
  
  // A simple regex parser for TROPCONF.SFM
  const trophyRegex = /<trophy\s+id="(\d+)"\s+hidden="(yes|no)"\s+ttype="([A-Z])"[^>]*>([\s\S]*?)<\/trophy>/g;
  let match;

  while ((match = trophyRegex.exec(xml)) !== null) {
    const id = parseInt(match[1], 10);
    const hidden = match[2] === "yes";
    const typeChar = match[3];
    const innerXml = match[4];

    let name = "";
    let detail = "";

    const nameMatch = innerXml.match(/<name>(.*?)<\/name>/);
    if (nameMatch) name = nameMatch[1];

    const detailMatch = innerXml.match(/<detail>(.*?)<\/detail>/);
    if (detailMatch) detail = detailMatch[1];

    let type = "Bronze";
    if (typeChar === "P") type = "Platinum";
    else if (typeChar === "G") type = "Gold";
    else if (typeChar === "S") type = "Silver";
    else if (typeChar === "B") type = "Bronze";

    trophies.push({ id, name, detail, hidden, type });
  }

  return trophies;
}

/**
 * Parses PARAM.SFO to extract ACCOUNT_ID and TITLE_ID
 */
export function parsePARAMSFO(buffer: Buffer): PlayerProfile {
  const data = buffer.toString("utf-8");
  
  // Helper to extract a null-terminated string following a key in PARAM.SFO
  // This is a naive heuristic search approach appropriate for this context.
  const extractString = (key: string): string => {
    const idx = data.indexOf(key);
    if (idx === -1) return "UNKNOWN";
    
    // Look for the next alphanumeric chunk after the key
    // In PARAM.SFO, values are separated from keys by tables, but often we can just regex search 
    // or look for the known length/format. 
    // A more precise binary parsing of PARAM.SFO header/index table would be:
    return "UNKNOWN"; 
  };

  // Precise PARAM.SFO parsing
  const magic = buffer.readUInt32LE(0);
  if (magic !== 0x46535000) { // '\0PSF'
    return { titleId: "UNKNOWN", accountId: "UNKNOWN" };
  }

  const keyTableStart = buffer.readUInt32LE(0x08);
  const dataTableStart = buffer.readUInt32LE(0x0C);
  const tablesEntries = buffer.readUInt32LE(0x10);

  let titleId = "UNKNOWN";
  let accountId = "UNKNOWN";
  let title = "UNKNOWN";

  for (let i = 0; i < tablesEntries; i++) {
    const entryOffset = 0x14 + (i * 16);
    const keyOffset = buffer.readUInt16LE(entryOffset);
    const dataFmt = buffer.readUInt16LE(entryOffset + 2);
    const dataLen = buffer.readUInt32LE(entryOffset + 4);
    const dataMaxLen = buffer.readUInt32LE(entryOffset + 8);
    const dataOffset = buffer.readUInt32LE(entryOffset + 12);

    const actualKeyOffset = keyTableStart + keyOffset;
    
    // Read null-terminated string for key
    let keyEnd = actualKeyOffset;
    while (keyEnd < buffer.length && buffer[keyEnd] !== 0) {
      keyEnd++;
    }
    const key = buffer.toString("utf-8", actualKeyOffset, keyEnd);

    if (key === "TITLE_ID" || key === "ACCOUNT_ID" || key === "TITLE") {
      const actualDataOffset = dataTableStart + dataOffset;
      // Null-terminated string for data
      let dataEnd = actualDataOffset;
      while (dataEnd < actualDataOffset + dataLen && buffer[dataEnd] !== 0) {
        dataEnd++;
      }
      const val = buffer.toString("utf-8", actualDataOffset, dataEnd);
      
      if (key === "TITLE_ID") titleId = val;
      if (key === "ACCOUNT_ID") accountId = val;
      if (key === "TITLE") title = val;
    }
  }

  return { titleId, accountId, title };
}

/**
 * Lê o TROPUSR.DAT com busca nativa ultrarrápida.
 */
export function parseTROPUSR(buffer: Buffer, trophies: any[]) {
  const results = [];

  for (const trophy of trophies) {
    const trophyIdBuffer = Buffer.alloc(4);
    trophyIdBuffer.writeInt32BE(trophy.id, 0);

    // OTIMIZAÇÃO: Busca nativa em microssegundos pulando o cabeçalho criptográfico
    const offset = buffer.indexOf(trophyIdBuffer, 0x40);

    let isUnlocked = false;
    let isSynced = false;
    let timestamp = null;

    if (offset !== -1) {
      const statusOffset = offset + 0x14;
      const timestampOffset = offset + 0x18;
      const flag = buffer.readUInt8(statusOffset);

      if (flag > 0) {
        isUnlocked = true;
        if (flag === 0x02 || flag === 0x11 || flag > 0x01) {
          isSynced = true;
        }

        const timeT = buffer.readBigInt64BE(timestampOffset);
        if (timeT > BigInt(0)) {
          const date = new Date(Number(timeT) * 1000);
          if (!isNaN(date.getTime())) {
            timestamp = date.toISOString();
          }
        }
      }
    }

    results.push({ ...trophy, isUnlocked, isSynced, timestamp });
  }

  return results;
}

export function extractAllTimestampsFromDAT(buffer: any) { return []; }

/**
 * Atualiza o TROPUSR.DAT injetando as datas com o radar nativo.
 */
export function updateTROPUSR(buffer: Buffer, trophies: any[]): Buffer {
  const newBuffer = Buffer.from(buffer);
  
  for (const trophy of trophies) {
    if (!trophy.isUnlocked) continue;
    
    const trophyIdBuffer = Buffer.alloc(4);
    trophyIdBuffer.writeInt32BE(trophy.id, 0);

    // OTIMIZAÇÃO: Varredura instantânea do arquivo
    const offset = newBuffer.indexOf(trophyIdBuffer, 0x40);

    if (offset !== -1) {
      const statusOffset = offset + 0x14;
      const timestampOffset = offset + 0x18;

      const currentFlag = newBuffer.readUInt8(statusOffset);
      if (currentFlag === 0x00) {
        newBuffer.writeUInt8(0x01, statusOffset);
      }

      if (trophy.timestamp) {
        const timeT = Math.floor(new Date(trophy.timestamp).getTime() / 1000);
        newBuffer.writeBigInt64BE(BigInt(timeT), timestampOffset);
      }
    }
  }

  return newBuffer;
}

export function recalculateDatHash(buffer: any) { return buffer; }
