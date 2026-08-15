import JSZip from "jszip";
import { decodePs3Timestamp } from "./ps3Parser";

export interface ParsedProfile {
  titleId: string;
  accountId: string;
  title: string;
}

export interface ParsedTrophyItem {
  id: number;
  name: string;
  detail: string;
  hidden: boolean;
  type: string;
  base64Image?: string;
  isUnlocked: boolean;
  isSynced: boolean;
  timestamp: string | null;
}

export interface ParseResult {
  profile: ParsedProfile;
  trophies: ParsedTrophyItem[];
  originalUsrDatBase64: string;
}

/**
 * Universal browser-compatible binary search for a 4-byte big-endian integer
 */
function findInt32BE(bytes: Uint8Array, value: number, startOffset = 0x40): number {
  const b0 = (value >>> 24) & 0xff;
  const b1 = (value >>> 16) & 0xff;
  const b2 = (value >>> 8) & 0xff;
  const b3 = value & 0xff;

  const len = bytes.length - 4;
  for (let i = startOffset; i <= len; i++) {
    if (bytes[i] === b0 && bytes[i + 1] === b1 && bytes[i + 2] === b2 && bytes[i + 3] === b3) {
      return i;
    }
  }
  return -1;
}

/**
 * Parse TROPCONF.SFM from Uint8Array or string
 */
export function parseTropConfClient(bytes: Uint8Array): any[] {
  const xml = new TextDecoder("utf-8").decode(bytes);
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
 * Parse PARAM.SFO from Uint8Array
 */
export function parseParamSfoClient(bytes: Uint8Array): ParsedProfile {
  if (bytes.length < 20) {
    return { titleId: "UNKNOWN", accountId: "0000000000000000", title: "Unknown Game" };
  }

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const magic = view.getUint32(0, true);
  if (magic !== 0x46535000) { // '\0PSF'
    return { titleId: "UNKNOWN", accountId: "0000000000000000", title: "Unknown Game" };
  }

  const keyTableStart = view.getUint32(0x08, true);
  const dataTableStart = view.getUint32(0x0C, true);
  const tablesEntries = view.getUint32(0x10, true);

  let titleId = "UNKNOWN";
  let accountId = "0000000000000000";
  let title = "Unknown Game";

  const decoder = new TextDecoder("utf-8");

  for (let i = 0; i < tablesEntries; i++) {
    const entryOffset = 0x14 + (i * 16);
    if (entryOffset + 16 > bytes.length) break;

    const keyOffset = view.getUint16(entryOffset, true);
    const dataLen = view.getUint32(entryOffset + 4, true);
    const dataOffset = view.getUint32(entryOffset + 12, true);

    const actualKeyOffset = keyTableStart + keyOffset;
    let keyEnd = actualKeyOffset;
    while (keyEnd < bytes.length && bytes[keyEnd] !== 0) {
      keyEnd++;
    }
    const key = decoder.decode(bytes.subarray(actualKeyOffset, keyEnd));

    if (key === "TITLE_ID" || key === "ACCOUNT_ID" || key === "TITLE") {
      const actualDataOffset = dataTableStart + dataOffset;
      let dataEnd = actualDataOffset;
      while (dataEnd < actualDataOffset + dataLen && dataEnd < bytes.length && bytes[dataEnd] !== 0) {
        dataEnd++;
      }
      const val = decoder.decode(bytes.subarray(actualDataOffset, dataEnd));

      if (key === "TITLE_ID") titleId = val;
      if (key === "ACCOUNT_ID") accountId = val;
      if (key === "TITLE") title = val;
    }
  }

  return { titleId, accountId, title };
}

/**
 * Parse TROPUSR.DAT from Uint8Array
 */
export function parseTropUsrClient(bytes: Uint8Array, trophies: any[]): ParsedTrophyItem[] {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const results: ParsedTrophyItem[] = [];

  for (const trophy of trophies) {
    const offset = findInt32BE(bytes, trophy.id, 0x40);
    let isUnlocked = false;
    let isSynced = false;
    let timestamp: string | null = null;

    if (offset !== -1) {
      const statusOffset = offset + 0x14;
      const primaryTimestampOffset = offset + 0x18;

      if (statusOffset < bytes.length) {
        const flag = bytes[statusOffset];
        if (flag > 0) {
          isUnlocked = true;
          if (flag === 0x02 || flag === 0x11 || flag > 0x01) {
            isSynced = true;
          }

          if (primaryTimestampOffset + 8 <= bytes.length) {
            try {
              const timeT = view.getBigInt64(primaryTimestampOffset, false);
              timestamp = decodePs3Timestamp(timeT);
            } catch (e) {
              // Ignore
            }
          }

          if (!timestamp) {
            const candidateOffsets = [offset + 0x10, offset + 0x14, offset + 0x20, offset + 0x08, offset + 0x28];
            for (const cand of candidateOffsets) {
              if (cand + 8 <= bytes.length) {
                try {
                  const timeT = view.getBigInt64(cand, false);
                  const decoded = decodePs3Timestamp(timeT);
                  if (decoded) {
                    timestamp = decoded;
                    break;
                  }
                } catch (e) {
                  // Ignore
                }
              }
            }
          }

          if (!timestamp) {
            timestamp = new Date().toISOString();
          }
        }
      }
    }

    results.push({
      ...trophy,
      isUnlocked,
      isSynced,
      timestamp,
    });
  }

  return results;
}

/**
 * Convert Uint8Array to base64 string
 */
export function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = "";
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Convert base64 to Uint8Array
 */
export function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Master client-side extractor for PS3 Trophy files
 */
export async function parseTrophyFilesClient(files: File[]): Promise<ParseResult> {
  let tropconfBytes: Uint8Array | null = null;
  let paramsfoBytes: Uint8Array | null = null;
  let tropusrBytes: Uint8Array | null = null;
  const images: Record<number, string> = {};

  for (const file of files) {
    const name = file.name.toUpperCase();

    if (name.endsWith(".ZIP")) {
      const arrayBuffer = await file.arrayBuffer();
      const zip = await JSZip.loadAsync(arrayBuffer);

      for (const [relativePath, zipEntry] of Object.entries(zip.files)) {
        if (zipEntry.dir) continue;
        const upperName = relativePath.toUpperCase();

        if (upperName.endsWith("TROPCONF.SFM")) {
          tropconfBytes = await zipEntry.async("uint8array");
        } else if (upperName.endsWith("PARAM.SFO")) {
          paramsfoBytes = await zipEntry.async("uint8array");
        } else if (upperName.endsWith("TROPUSR.DAT")) {
          tropusrBytes = await zipEntry.async("uint8array");
        } else if (upperName.endsWith(".PNG")) {
          const match = upperName.match(/TROP(\d+)\.PNG/);
          if (match) {
            const imgBytes = await zipEntry.async("uint8array");
            images[parseInt(match[1], 10)] = `data:image/png;base64,${uint8ArrayToBase64(imgBytes)}`;
          }
        }
      }
    } else {
      const arrayBuffer = await file.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);

      if (name.endsWith("TROPCONF.SFM")) {
        tropconfBytes = bytes;
      } else if (name.endsWith("PARAM.SFO")) {
        paramsfoBytes = bytes;
      } else if (name.endsWith("TROPUSR.DAT")) {
        tropusrBytes = bytes;
      } else if (name.endsWith(".PNG")) {
        const match = name.match(/TROP(\d+)\.PNG/);
        if (match) {
          images[parseInt(match[1], 10)] = `data:image/png;base64,${uint8ArrayToBase64(bytes)}`;
        }
      }
    }
  }

  if (!tropconfBytes || !paramsfoBytes || !tropusrBytes) {
    throw new Error("Faltam arquivos obrigatórios do conjunto PS3 (TROPCONF.SFM, PARAM.SFO, TROPUSR.DAT).");
  }

  const profile = parseParamSfoClient(paramsfoBytes);
  const confTrophies = parseTropConfClient(tropconfBytes);
  const parsedTrophies = parseTropUsrClient(tropusrBytes, confTrophies);

  for (const trophy of parsedTrophies) {
    if (images[trophy.id]) {
      trophy.base64Image = images[trophy.id];
    }
  }

  const originalUsrDatBase64 = uint8ArrayToBase64(tropusrBytes);

  return {
    profile,
    trophies: parsedTrophies,
    originalUsrDatBase64,
  };
}

/**
 * Client-side extraction of all timestamps from a source DAT
 */
export function extractAllTimestampsFromDATClient(bytes: Uint8Array) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const timestamps = [];

  for (let id = 0; id <= 128; id++) {
    const offset = findInt32BE(bytes, id, 0x40);
    if (offset !== -1) {
      const statusOffset = offset + 0x14;
      if (statusOffset < bytes.length) {
        const flag = bytes[statusOffset];
        if (flag > 0) {
          let timestamp: string | null = null;
          const candidateOffsets = [offset + 0x18, offset + 0x10, offset + 0x14, offset + 0x20, offset + 0x08];

          for (const cand of candidateOffsets) {
            if (cand + 8 <= bytes.length) {
              try {
                const timeT = view.getBigInt64(cand, false);
                const decoded = decodePs3Timestamp(timeT);
                if (decoded) {
                  timestamp = decoded;
                  break;
                }
              } catch (e) {
                // Ignore
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
            isSynced: flag === 0x02 || flag > 0x01,
          });
        }
      }
    }
  }

  return timestamps;
}

/**
 * Client-side TROPUSR.DAT updater
 */
export function updateTropUsrClient(originalBytes: Uint8Array, trophies: any[]): Uint8Array {
  const newBytes = new Uint8Array(originalBytes.length);
  newBytes.set(originalBytes);
  const view = new DataView(newBytes.buffer, newBytes.byteOffset, newBytes.byteLength);
  const SONY_EPOCH_DIFF_US = 62135596800000000n;

  for (const trophy of trophies) {
    const isUnlocked = trophy.unlocked ?? trophy.isUnlocked;
    if (!isUnlocked) continue;

    const offset = findInt32BE(newBytes, trophy.id, 0x40);
    if (offset !== -1) {
      const statusOffset = offset + 0x14;
      const timestampOffset = offset + 0x18;

      if (statusOffset < newBytes.length) {
        const currentFlag = newBytes[statusOffset];
        if (currentFlag === 0x00) {
          newBytes[statusOffset] = 0x01;
        }
      }

      if (trophy.timestamp && timestampOffset + 8 <= newBytes.length) {
        const dateMs = new Date(trophy.timestamp).getTime();
        if (!isNaN(dateMs)) {
          const sonyRtc = BigInt(dateMs) * 1000n + SONY_EPOCH_DIFF_US;
          view.setBigInt64(timestampOffset, sonyRtc, false);
        }
      }
    }
  }

  return newBytes;
}
