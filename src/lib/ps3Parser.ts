import JSZip from "jszip";

export interface ParsedTrophy {
  id: number;
  name: string;
  detail: string;
  hidden: boolean;
  type: string; // "Platinum", "Gold", "Silver", "Bronze"
  groupId?: string;
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
  groups?: any[];
}

function decodeXmlEntities(str: string): string {
  if (!str) return "";
  return str
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&trade;/gi, "™")
    .replace(/&#x2122;/gi, "™")
    .replace(/&#8482;/gi, "™")
    .trim();
}

/**
 * Parses TROPCONF.SFM (XML) to extract trophy metadata, title, and groups
 */
export function parseTROPCONF(buffer: Buffer): {
  title: string;
  npcommid: string;
  trophies: any[];
  groups: any[];
} {
  const xml = buffer.toString("utf-8");
  const trophies: any[] = [];
  const groups: any[] = [];

  let title = "";
  const titleNameMatch = xml.match(/<title-name>(.*?)<\/title-name>/is) ||
                         xml.match(/<title_name>(.*?)<\/title_name>/is) ||
                         xml.match(/<game-title>(.*?)<\/game-title>/is) ||
                         xml.match(/<title>(.*?)<\/title>/is);
  if (titleNameMatch) {
    title = decodeXmlEntities(titleNameMatch[1]);
  }

  let npcommid = "";
  const npcommidMatch = xml.match(/<npcommid>(.*?)<\/npcommid>/is);
  if (npcommidMatch) {
    npcommid = npcommidMatch[1].trim();
  }

  const groupBlockRegex = /<group\b([^>]*)>([\s\S]*?)<\/group>/gi;
  let groupMatch;
  while ((groupMatch = groupBlockRegex.exec(xml)) !== null) {
    const groupAttrs = groupMatch[1];
    const groupInner = groupMatch[2];
    const idMatch = groupAttrs.match(/\bid=["']?(\d+)["']?/i);
    const titleMatch = groupInner.match(/<title>(.*?)<\/title>/is);
    const gid = idMatch ? idMatch[1] : String(groups.length);
    const gtitle = titleMatch ? decodeXmlEntities(titleMatch[1]) : (gid === "0" ? "Base Game" : `DLC ${gid}`);
    groups.push({ id: gid === "0" ? "default" : `group_${gid}`, title: gtitle, iconDataUrl: "", numTrophies: 0 });
  }

  if (groups.length === 0) {
    groups.push({ id: "default", title: "Base Game", iconDataUrl: "", numTrophies: 0 });
  }

  const trophyBlockRegex = /<trophy\b([^>]*)>([\s\S]*?)<\/trophy>/gi;
  let blockMatch;

  while ((blockMatch = trophyBlockRegex.exec(xml)) !== null) {
    const attrStr = blockMatch[1];
    const innerXml = blockMatch[2];

    const idMatch = attrStr.match(/\bid=["']?(\d+)["']?/i);
    const hiddenMatch = attrStr.match(/\bhidden=["']?(yes|no|1|0)["']?/i);
    const ttypeMatch = attrStr.match(/\bttype=["']?([A-Z])["']?/i) || attrStr.match(/\btype=["']?([A-Z])["']?/i);
    const pidMatch = attrStr.match(/\bpid=["']?(\d+)["']?/i);

    const id = idMatch ? parseInt(idMatch[1], 10) : trophies.length;
    const hidden = hiddenMatch ? (hiddenMatch[1] === "yes" || hiddenMatch[1] === "1") : false;
    const typeChar = ttypeMatch ? ttypeMatch[1].toUpperCase() : "B";
    const pid = pidMatch ? pidMatch[1] : "0";

    let name = "";
    let detail = "";

    const nameMatch = innerXml.match(/<name>(.*?)<\/name>/is);
    if (nameMatch) name = decodeXmlEntities(nameMatch[1]);

    const detailMatch = innerXml.match(/<detail>(.*?)<\/detail>/is) || innerXml.match(/<description>(.*?)<\/description>/is);
    if (detailMatch) detail = decodeXmlEntities(detailMatch[1]);

    let type = "Bronze";
    if (typeChar === "P") type = "Platinum";
    else if (typeChar === "G") type = "Gold";
    else if (typeChar === "S") type = "Silver";
    else if (typeChar === "B") type = "Bronze";

    const groupId = pid === "0" ? "default" : `group_${pid}`;

    trophies.push({ id, name, detail, hidden, type, groupId });
  }

  return { title, npcommid, trophies, groups };
}

/**
 * Parses PARAM.SFO to extract ACCOUNT_ID and TITLE_ID
 */
export function parsePARAMSFO(buffer: Buffer): PlayerProfile {
  const magic = buffer.readUInt32LE(0);
  if (magic !== 0x46535000) { // '\0PSF'
    return { titleId: "UNKNOWN", accountId: "UNKNOWN", title: "" };
  }

  const keyTableStart = buffer.readUInt32LE(0x08);
  const dataTableStart = buffer.readUInt32LE(0x0C);
  const tablesEntries = buffer.readUInt32LE(0x10);

  let titleId = "UNKNOWN";
  let accountId = "0000000000000000";
  let title = "";

  for (let i = 0; i < tablesEntries; i++) {
    const entryOffset = 0x14 + (i * 16);
    if (entryOffset + 16 > buffer.length) break;

    const keyOffset = buffer.readUInt16LE(entryOffset);
    const dataLen = buffer.readUInt32LE(entryOffset + 4);
    const dataOffset = buffer.readUInt32LE(entryOffset + 12);

    const actualKeyOffset = keyTableStart + keyOffset;
    let keyEnd = actualKeyOffset;
    while (keyEnd < buffer.length && buffer[keyEnd] !== 0) {
      keyEnd++;
    }
    const key = buffer.toString("utf-8", actualKeyOffset, keyEnd);

    if (key === "TITLE_ID" || key === "ACCOUNT_ID" || key === "TITLE") {
      const actualDataOffset = dataTableStart + dataOffset;
      let dataEnd = actualDataOffset;
      while (dataEnd < actualDataOffset + dataLen && dataEnd < buffer.length && buffer[dataEnd] !== 0) {
        dataEnd++;
      }
      const val = buffer.toString("utf-8", actualDataOffset, dataEnd);

      if (key === "TITLE_ID") titleId = val.trim();
      if (key === "ACCOUNT_ID") accountId = val.trim();
      if (key === "TITLE") title = val.trim();
    }
  }

  return { titleId, accountId, title };
}

/**
 * Helper to decode PS3 binary timestamps across all formats
 */
export function decodePs3Timestamp(timeBigInt: bigint): string | null {
  if (!timeBigInt || timeBigInt <= 0n) return null;

  try {
    // 1. Sony PlayStation RTC tick: microseconds since Jan 1, 0001 00:00:00 UTC
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

    // 5. Windows FileTime
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

function detectTableLayout(buffer: Buffer): { start: number; stride: number } | null {
  if (buffer.length < 0x80) return null;
  const candidateStrides = [0x60, 0x80, 0x40, 0x50, 0x70, 0x90, 0xA0];
  const candidateStarts = [0x40, 0x60, 0x80, 0x100, 0x140, 0x180, 0x200, 0x300, 0x400];

  for (const stride of candidateStrides) {
    for (const start of candidateStarts) {
      if (start + stride * 3 <= buffer.length) {
        try {
          const id0 = buffer.readInt32BE(start);
          const id1 = buffer.readInt32BE(start + stride);
          const id2 = buffer.readInt32BE(start + stride * 2);
          if (id0 === 0 && id1 === 1 && id2 === 2) {
            return { start, stride };
          }
        } catch (e) {
          // ignore
        }
      }
    }
  }
  return null;
}

/**
 * Lê o TROPUSR.DAT com busca nativa e recuperação completa de todas as informações de tempo.
 */
export function parseTROPUSR(buffer: Buffer, trophies: any[]) {
  const results = [];
  const layout = detectTableLayout(buffer);

  for (const trophy of trophies) {
    let offset = -1;
    if (layout) {
      const candidateOffset = layout.start + trophy.id * layout.stride;
      if (candidateOffset + 0x20 <= buffer.length) {
        if (buffer.readInt32BE(candidateOffset) === trophy.id) {
          offset = candidateOffset;
        }
      }
    }

    if (offset === -1) {
      const trophyIdBuffer = Buffer.alloc(4);
      trophyIdBuffer.writeInt32BE(trophy.id, 0);
      offset = buffer.indexOf(trophyIdBuffer, 0x40);
    }

    let isUnlocked = false;
    let isSynced = false;
    let timestamp: string | null = null;

    if (offset !== -1) {
      const statusOffset = offset + 0x14;
      const statusOffsetAlt = offset + 0x10;
      let flag = statusOffset < buffer.length ? buffer.readUInt8(statusOffset) : 0;
      if (flag === 0 && statusOffsetAlt < buffer.length) {
        flag = buffer.readUInt8(statusOffsetAlt);
      }

      if (flag > 0) {
        isUnlocked = true;
        if (flag === 0x02 || flag === 0x11 || flag >= 0x02) {
          isSynced = true;
        }

        const primaryTimestampOffset = offset + 0x18;
        if (primaryTimestampOffset + 8 <= buffer.length) {
          const timeT = buffer.readBigInt64BE(primaryTimestampOffset);
          timestamp = decodePs3Timestamp(timeT);
        }

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
  const layout = detectTableLayout(buffer);

  for (let id = 0; id <= 128; id++) {
    let offset = -1;
    if (layout) {
      const candidateOffset = layout.start + id * layout.stride;
      if (candidateOffset + 0x20 <= buffer.length) {
        if (buffer.readInt32BE(candidateOffset) === id) {
          offset = candidateOffset;
        }
      }
    }

    if (offset === -1) {
      const trophyIdBuffer = Buffer.alloc(4);
      trophyIdBuffer.writeInt32BE(id, 0);
      offset = buffer.indexOf(trophyIdBuffer, 0x40);
    }

    if (offset !== -1) {
      const statusOffset = offset + 0x14;
      const statusOffsetAlt = offset + 0x10;
      let flag = statusOffset < buffer.length ? buffer.readUInt8(statusOffset) : 0;
      if (flag === 0 && statusOffsetAlt < buffer.length) {
        flag = buffer.readUInt8(statusOffsetAlt);
      }

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
          isSynced: flag === 0x02 || flag === 0x11 || flag >= 0x02
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
  const layout = detectTableLayout(newBuffer);
  
  for (const trophy of trophies) {
    const isUnlocked = trophy.unlocked ?? trophy.isUnlocked;
    if (!isUnlocked) continue;
    
    let offset = -1;
    if (layout) {
      const candidateOffset = layout.start + trophy.id * layout.stride;
      if (candidateOffset + 0x20 <= newBuffer.length) {
        if (newBuffer.readInt32BE(candidateOffset) === trophy.id) {
          offset = candidateOffset;
        }
      }
    }

    if (offset === -1) {
      const trophyIdBuffer = Buffer.alloc(4);
      trophyIdBuffer.writeInt32BE(trophy.id, 0);
      offset = newBuffer.indexOf(trophyIdBuffer, 0x40);
    }

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
          const sonyRtc = BigInt(dateMs) * 1000n + SONY_EPOCH_DIFF_US;
          newBuffer.writeBigInt64BE(sonyRtc, timestampOffset);
        }
      }
    }
  }

  return newBuffer;
}

export function recalculateDatHash(buffer: any) { return buffer; }
