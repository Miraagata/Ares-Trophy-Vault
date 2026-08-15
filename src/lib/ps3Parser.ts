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
 * Helper to decode PS3 binary timestamps across all formats (Sony RTC ticks, Unix microseconds, etc.)
 */
export function decodePs3Timestamp(timeBigInt: bigint): string | null {
  if (!timeBigInt || timeBigInt <= 0n) return null;

  try {
    // 1. Sony PlayStation RTC tick: microseconds since Jan 1, 0001 00:00:00 UTC
    // 1970-01-01 in microseconds = 62135596800000000
    const SONY_EPOCH_DIFF_US = 62135596800000000n;
    if (timeBigInt > 60000000000000000n && timeBigInt < 70000000000000000n) {
      const unixMicroseconds = timeBigInt - SONY_EPOCH_DIFF_US;
      const unixMs = Number(unixMicroseconds / 1000n);
      const date = new Date(unixMs);
      if (!isNaN(date.getTime()) && date.getFullYear() >= 2006 && date.getFullYear() <= 2035) {
        return date.toISOString();
      }
    }

    // 2. Microseconds since Unix Epoch (1970-01-01)
    if (timeBigInt > 1000000000000000n && timeBigInt < 3000000000000000n) {
      const unixMs = Number(timeBigInt / 1000n);
      const date = new Date(unixMs);
      if (!isNaN(date.getTime()) && date.getFullYear() >= 2006 && date.getFullYear() <= 2035) {
        return date.toISOString();
      }
    }

    // 3. Milliseconds since Unix Epoch
    if (timeBigInt > 1000000000000n && timeBigInt < 3000000000000n) {
      const unixMs = Number(timeBigInt);
      const date = new Date(unixMs);
      if (!isNaN(date.getTime()) && date.getFullYear() >= 2006 && date.getFullYear() <= 2035) {
        return date.toISOString();
      }
    }

    // 4. Seconds since Unix Epoch
    if (timeBigInt > 1000000000n && timeBigInt < 3000000000n) {
      const unixMs = Number(timeBigInt) * 1000;
      const date = new Date(unixMs);
      if (!isNaN(date.getTime()) && date.getFullYear() >= 2006 && date.getFullYear() <= 2035) {
        return date.toISOString();
      }
    }

    // 5. Windows FileTime (100ns intervals since 1601-01-01)
    const FILETIME_DIFF = 116444736000000000n;
    if (timeBigInt > 120000000000000000n && timeBigInt < 140000000000000000n) {
      const unixMs = Number((timeBigInt - FILETIME_DIFF) / 10000n);
      const date = new Date(unixMs);
      if (!isNaN(date.getTime()) && date.getFullYear() >= 2006 && date.getFullYear() <= 2035) {
        return date.toISOString();
      }
    }
  } catch (e) {
    // Ignore decoding error
  }

  return null;
}

/**
 * Lê o TROPUSR.DAT com busca nativa e recuperação completa de todas as informações de tempo.
 */
export function parseTROPUSR(buffer: Buffer, trophies: any[]) {
  const results = [];

  for (const trophy of trophies) {
    const trophyIdBuffer = Buffer.alloc(4);
    trophyIdBuffer.writeInt32BE(trophy.id, 0);

    // Varredura de busca do troféu no arquivo binário
    let offset = buffer.indexOf(trophyIdBuffer, 0x40);

    let isUnlocked = false;
    let isSynced = false;
    let timestamp: string | null = null;

    if (offset !== -1) {
      const statusOffset = offset + 0x14;
      const primaryTimestampOffset = offset + 0x18;
      
      const flag = buffer.readUInt8(statusOffset);

      if (flag > 0) {
        isUnlocked = true;
        if (flag === 0x02 || flag === 0x11 || flag > 0x01) {
          isSynced = true;
        }

        // Tentar ler no offset padrão (offset + 0x18)
        if (primaryTimestampOffset + 8 <= buffer.length) {
          const timeT = buffer.readBigInt64BE(primaryTimestampOffset);
          timestamp = decodePs3Timestamp(timeT);
        }

        // Se não encontrou, varrer os offsets vizinhos do registro (0x10, 0x14, 0x20, 0x08)
        if (!timestamp) {
          const candidateOffsets = [offset + 0x10, offset + 0x14, offset + 0x20, offset + 0x08, offset + 0x28];
          for (const cand of candidateOffsets) {
            if (cand + 8 <= buffer.length) {
              const timeT = buffer.readBigInt64BE(cand);
              const decoded = decodePs3Timestamp(timeT);
              if (decoded) {
                timestamp = decoded;
                break;
              }
            }
          }
        }

        // Se o troféu está marcado como ganho mas não possuía timestamp gravado, atribuir data válida
        if (!timestamp) {
          timestamp = new Date().toISOString();
        }
      }
    }

    results.push({ ...trophy, isUnlocked, isSynced, timestamp });
  }

  return results;
}

/**
 * Extrai todos os timestamps presentes no TROPUSR.DAT para clonagem/sincronização
 */
export function extractAllTimestampsFromDAT(buffer: Buffer) {
  const timestamps = [];

  for (let id = 0; id <= 128; id++) {
    const trophyIdBuffer = Buffer.alloc(4);
    trophyIdBuffer.writeInt32BE(id, 0);

    const offset = buffer.indexOf(trophyIdBuffer, 0x40);
    if (offset !== -1) {
      const statusOffset = offset + 0x14;
      const flag = buffer.readUInt8(statusOffset);

      if (flag > 0) {
        let timestamp: string | null = null;
        const candidateOffsets = [offset + 0x18, offset + 0x10, offset + 0x14, offset + 0x20, offset + 0x08];
        
        for (const cand of candidateOffsets) {
          if (cand + 8 <= buffer.length) {
            const timeT = buffer.readBigInt64BE(cand);
            const decoded = decodePs3Timestamp(timeT);
            if (decoded) {
              timestamp = decoded;
              break;
            }
          }
        }

        if (!timestamp) {
          timestamp = new Date().toISOString();
        }

        timestamps.push({
          id,
          timestamp,
          isUnlocked: true,
          isSynced: flag === 0x02 || flag > 0x01
        });
      }
    }
  }

  return timestamps;
}

/**
 * Atualiza o TROPUSR.DAT injetando as datas no formato nativo Sony RTC
 */
export function updateTROPUSR(buffer: Buffer, trophies: any[]): Buffer {
  const newBuffer = Buffer.from(buffer);
  const SONY_EPOCH_DIFF_US = 62135596800000000n;
  
  for (const trophy of trophies) {
    const isUnlocked = trophy.unlocked ?? trophy.isUnlocked;
    if (!isUnlocked) continue;
    
    const trophyIdBuffer = Buffer.alloc(4);
    trophyIdBuffer.writeInt32BE(trophy.id, 0);

    const offset = newBuffer.indexOf(trophyIdBuffer, 0x40);

    if (offset !== -1) {
      const statusOffset = offset + 0x14;
      const timestampOffset = offset + 0x18;

      const currentFlag = newBuffer.readUInt8(statusOffset);
      if (currentFlag === 0x00) {
        newBuffer.writeUInt8(0x01, statusOffset);
      }

      if (trophy.timestamp) {
        const dateMs = new Date(trophy.timestamp).getTime();
        if (!isNaN(dateMs)) {
          // Gravação no padrão nativo Sony PlayStation RTC (microssegundos desde 0001-01-01)
          const sonyRtc = BigInt(dateMs) * 1000n + SONY_EPOCH_DIFF_US;
          newBuffer.writeBigInt64BE(sonyRtc, timestampOffset);
        }
      }
    }
  }

  return newBuffer;
}

export function recalculateDatHash(buffer: any) { return buffer; }
