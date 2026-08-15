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
  groupId: string;
  base64Image?: string;
  isUnlocked: boolean;
  isSynced: boolean;
  timestamp: string | null;
}

export interface ParseResult {
  profile: ParsedProfile;
  trophies: ParsedTrophyItem[];
  groups: any[];
  originalUsrDatBase64: string;
}

/**
 * Decode XML entities in text (e.g. &amp;, &quot;, &#39;, &trade;, etc.)
 */
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
 * Robust detection of TROPUSR.DAT structured table
 */
export function detectTrophyTableLayout(bytes: Uint8Array): { start: number; stride: number } | null {
  if (bytes.length < 0x80) return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

  const candidateStrides = [0x60, 0x80, 0x40, 0x50, 0x70, 0x90, 0xA0];
  const candidateStarts = [0x40, 0x60, 0x80, 0x100, 0x140, 0x180, 0x200, 0x300, 0x400];

  for (const stride of candidateStrides) {
    for (const start of candidateStarts) {
      if (start + stride * 3 <= bytes.length) {
        try {
          const id0 = view.getInt32(start, false);
          const id1 = view.getInt32(start + stride, false);
          const id2 = view.getInt32(start + stride * 2, false);

          if (id0 === 0 && id1 === 1 && id2 === 2) {
            return { start, stride };
          }
        } catch (e) {
          // ignore out of bounds
        }
      }
    }
  }

  // Fallback check for games where trophy table starts with ID 1
  for (const stride of candidateStrides) {
    for (const start of candidateStarts) {
      if (start + stride * 2 <= bytes.length) {
        try {
          const id1 = view.getInt32(start, false);
          const id2 = view.getInt32(start + stride, false);

          if (id1 === 1 && id2 === 2) {
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
 * Extracts title-name, groups, and all trophy entries
 */
export function parseTropConfClient(bytes: Uint8Array): {
  title: string;
  npcommid: string;
  trophies: any[];
  groups: any[];
} {
  const xml = new TextDecoder("utf-8").decode(bytes);
  const trophies: any[] = [];
  const groups: any[] = [];

  // 1. Extract Game Title
  let title = "";
  const titleNameMatch = xml.match(/<title-name>(.*?)<\/title-name>/is) ||
                         xml.match(/<title_name>(.*?)<\/title_name>/is) ||
                         xml.match(/<game-title>(.*?)<\/game-title>/is) ||
                         xml.match(/<title>(.*?)<\/title>/is);
  if (titleNameMatch) {
    title = decodeXmlEntities(titleNameMatch[1]);
  }

  // 2. Extract NPCOMMID (Title ID)
  let npcommid = "";
  const npcommidMatch = xml.match(/<npcommid>(.*?)<\/npcommid>/is);
  if (npcommidMatch) {
    npcommid = npcommidMatch[1].trim();
  }

  // 3. Extract Groups (BaseGame, DLCs, etc.)
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

  // 4. Extract Trophy definitions
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
 * Parse PARAM.SFO from Uint8Array
 */
export function parseParamSfoClient(bytes: Uint8Array): ParsedProfile {
  if (bytes.length < 20) {
    return { titleId: "UNKNOWN", accountId: "0000000000000000", title: "" };
  }

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const magic = view.getUint32(0, true);
  if (magic !== 0x46535000) { // '\0PSF'
    return { titleId: "UNKNOWN", accountId: "0000000000000000", title: "" };
  }

  const keyTableStart = view.getUint32(0x08, true);
  const dataTableStart = view.getUint32(0x0C, true);
  const tablesEntries = view.getUint32(0x10, true);

  let titleId = "UNKNOWN";
  let accountId = "0000000000000000";
  let title = "";

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

      if (key === "TITLE_ID") titleId = val.trim();
      if (key === "ACCOUNT_ID") accountId = val.trim();
      if (key === "TITLE") title = val.trim();
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
  const layout = detectTrophyTableLayout(bytes);

  for (const trophy of trophies) {
    let isUnlocked = false;
    let isSynced = false;
    let timestamp: string | null = null;
    let offset = -1;

    if (layout) {
      const candidateOffset = layout.start + trophy.id * layout.stride;
      if (candidateOffset + 0x20 <= bytes.length) {
        const idAtPos = view.getInt32(candidateOffset, false);
        if (idAtPos === trophy.id) {
          offset = candidateOffset;
        }
      }
    }

    if (offset === -1) {
      offset = findInt32BE(bytes, trophy.id, 0x40);
    }

    if (offset !== -1) {
      // 1. Read unlock status flags
      const statusOffset = offset + 0x14;
      const statusOffsetAlt = offset + 0x10;

      let flag = 0;
      if (statusOffset < bytes.length) {
        flag = bytes[statusOffset];
      }
      if (flag === 0 && statusOffsetAlt < bytes.length) {
        flag = bytes[statusOffsetAlt];
      }

      if (flag > 0) {
        isUnlocked = true;
        if (flag === 0x02 || flag === 0x11 || flag >= 0x02) {
          isSynced = true;
        }

        // 2. Read timestamp
        const timestampOffset = offset + 0x18;
        if (timestampOffset + 8 <= bytes.length) {
          try {
            const timeT = view.getBigInt64(timestampOffset, false);
            timestamp = decodePs3Timestamp(timeT);
          } catch (e) {
            // ignore
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
                // ignore
              }
            }
          }
        }

        if (!timestamp) {
          timestamp = new Date().toISOString();
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
          const match = upperName.match(/TROP(\d+)\.PNG/i);
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
        const match = name.match(/TROP(\d+)\.PNG/i);
        if (match) {
          images[parseInt(match[1], 10)] = `data:image/png;base64,${uint8ArrayToBase64(bytes)}`;
        }
      }
    }
  }

  if (!tropconfBytes || !tropusrBytes) {
    throw new Error("Faltam arquivos obrigatórios do conjunto PS3 (TROPCONF.SFM e TROPUSR.DAT).");
  }

  const parsedTropConf = parseTropConfClient(tropconfBytes);
  let profile: ParsedProfile = {
    titleId: parsedTropConf.npcommid || "NPWR00000_00",
    accountId: "0000000000000000",
    title: parsedTropConf.title || "Unknown Game",
  };

  if (paramsfoBytes) {
    const sfoProfile = parseParamSfoClient(paramsfoBytes);
    if (sfoProfile.titleId && sfoProfile.titleId !== "UNKNOWN") {
      profile.titleId = sfoProfile.titleId;
    }
    if (sfoProfile.accountId && sfoProfile.accountId !== "UNKNOWN") {
      profile.accountId = sfoProfile.accountId;
    }
    if (sfoProfile.title && sfoProfile.title !== "UNKNOWN" && !profile.title) {
      profile.title = sfoProfile.title;
    }
  }

  if (!profile.title && parsedTropConf.title) {
    profile.title = parsedTropConf.title;
  }

  const parsedTrophies = parseTropUsrClient(tropusrBytes, parsedTropConf.trophies);

  for (const trophy of parsedTrophies) {
    if (images[trophy.id]) {
      trophy.base64Image = images[trophy.id];
    }
  }

  const originalUsrDatBase64 = uint8ArrayToBase64(tropusrBytes);

  return {
    profile,
    trophies: parsedTrophies,
    groups: parsedTropConf.groups || [{ id: "default", title: "Base Game", iconDataUrl: "", numTrophies: parsedTrophies.length }],
    originalUsrDatBase64,
  };
}

/**
 * Client-side extraction of all timestamps from a source DAT
 */
export function extractAllTimestampsFromDATClient(bytes: Uint8Array) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const timestamps = [];
  const layout = detectTrophyTableLayout(bytes);

  for (let id = 0; id <= 128; id++) {
    let offset = -1;
    if (layout) {
      const candidateOffset = layout.start + id * layout.stride;
      if (candidateOffset + 0x20 <= bytes.length) {
        if (view.getInt32(candidateOffset, false) === id) {
          offset = candidateOffset;
        }
      }
    }

    if (offset === -1) {
      offset = findInt32BE(bytes, id, 0x40);
    }

    if (offset !== -1) {
      const statusOffset = offset + 0x14;
      const statusOffsetAlt = offset + 0x10;
      let flag = statusOffset < bytes.length ? bytes[statusOffset] : 0;
      if (flag === 0 && statusOffsetAlt < bytes.length) {
        flag = bytes[statusOffsetAlt];
      }

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
              // ignore
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
          isSynced: flag === 0x02 || flag === 0x11 || flag >= 0x02,
        });
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
  const layout = detectTrophyTableLayout(newBytes);

  for (const trophy of trophies) {
    const isUnlocked = trophy.unlocked ?? trophy.isUnlocked;
    if (!isUnlocked) continue;

    let offset = -1;
    if (layout) {
      const candidateOffset = layout.start + trophy.id * layout.stride;
      if (candidateOffset + 0x20 <= newBytes.length) {
        if (view.getInt32(candidateOffset, false) === trophy.id) {
          offset = candidateOffset;
        }
      }
    }

    if (offset === -1) {
      offset = findInt32BE(newBytes, trophy.id, 0x40);
    }

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
