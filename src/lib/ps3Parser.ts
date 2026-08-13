import crypto from "crypto";
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
  const magic = buffer.readUInt32LE(0);
  if (magic !== 0x46535000) { 
    return { titleId: "UNKNOWN", accountId: "UNKNOWN" };
  }

  const keyTableStart = buffer.readUInt32LE(0x08);
  const dataTableStart = buffer.readUInt32LE(0x0C);
  const tablesEntries = buffer.readUInt32LE(0x10);

  let titleId = "UNKNOWN";
  let accountId = "UNKNOWN";

  for (let i = 0; i < tablesEntries; i++) {
    const entryOffset = 0x14 + (i * 16);
    const keyOffset = buffer.readUInt16LE(entryOffset);
    const dataLen = buffer.readUInt32LE(entryOffset + 4);
    const dataOffset = buffer.readUInt32LE(entryOffset + 12);

    const actualKeyOffset = keyTableStart + keyOffset;
    
    let keyEnd = actualKeyOffset;
    while (keyEnd < buffer.length && buffer[keyEnd] !== 0) {
      keyEnd++;
    }
    const key = buffer.toString("utf-8", actualKeyOffset, keyEnd);

    if (key === "TITLE_ID" || key === "ACCOUNT_ID") {
      const actualDataOffset = dataTableStart + dataOffset;
      let dataEnd = actualDataOffset;
      while (dataEnd < actualDataOffset + dataLen && buffer[dataEnd] !== 0) {
        dataEnd++;
      }
      const val = buffer.toString("utf-8", actualDataOffset, dataEnd);
      
      if (key === "TITLE_ID") titleId = val;
      if (key === "ACCOUNT_ID") accountId = val;
    }
  }

  return { titleId, accountId };
}

/**
 * Parses TROPUSR.DAT to extract unlock flags and timestamps
 */
export function parseTROPUSR(buffer: Buffer, trophies: any[]) {
  const results = [];

  for (const trophy of trophies) {
    const trophyIdBuffer = Buffer.alloc(4);
    trophyIdBuffer.writeInt32BE(trophy.id, 0);

    let offset = -1;
    for (let i = 0x40; i < buffer.length - 0x20; i++) {
      if (buffer.subarray(i, i + 4).equals(trophyIdBuffer)) {
        offset = i;
        break;
      }
    }

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
          timestamp = date.toISOString().slice(0, 16);
        }
      }
    }

    results.push({
      ...trophy,
      isUnlocked,
      isSynced,
      timestamp
    });
  }

  return results;
}


export function updateTROPUSR(buffer: Buffer, trophies: any[]): Buffer {
  const newBuffer = Buffer.from(buffer);
  
  for (const trophy of trophies) {
    if (!trophy.isUnlocked) continue; // Only update if unlocked
    
    const trophyIdBuffer = Buffer.alloc(4);
    trophyIdBuffer.writeInt32BE(trophy.id, 0);

    let offset = -1;
    for (let i = 0x40; i < newBuffer.length - 0x20; i++) {
      if (newBuffer.subarray(i, i + 4).equals(trophyIdBuffer)) {
        offset = i;
        break;
      }
    }

    if (offset !== -1) {
      const statusOffset = offset + 0x14;
      const timestampOffset = offset + 0x18;

      // Set Unlocked flag (0x01)
      const currentFlag = newBuffer.readUInt8(statusOffset);
      if (currentFlag === 0x00) {
        newBuffer.writeUInt8(0x01, statusOffset); // Set to unlocked
      }

      // Write timestamp in Big-Endian 64-bit int (Time_T seconds)
      if (trophy.timestamp) {
        const timeT = Math.floor(new Date(trophy.timestamp).getTime() / 1000);
        newBuffer.writeBigInt64BE(BigInt(timeT), timestampOffset);
      }
    }
  }

  return newBuffer;
}

export function recalculateDatHash(buffer: Buffer): Buffer {
  const newBuffer = Buffer.from(buffer);
  
  // Zero out the first 20 bytes (SHA-1 hash location)
  newBuffer.fill(0, 0, 20);
  
  // Calculate SHA-1 of the entire buffer
  const hash = crypto.createHash("sha1").update(newBuffer).digest();
  
  // Write the hash back to the first 20 bytes
  hash.copy(newBuffer, 0, 0, 20);
  
  return newBuffer;
}

export function extractAllTimestampsFromDAT(buffer: Buffer): { id: number, timestamp: string }[] {
  const dummyTrophies = Array.from({ length: 256 }, (_, i) => ({ id: i }));
  const parsed = parseTROPUSR(buffer, dummyTrophies);
  return parsed
    .filter(t => t.isUnlocked && t.timestamp)
    .map(t => ({ id: t.id, timestamp: t.timestamp as string }));
}
