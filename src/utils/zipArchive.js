/**
 * zipArchive.js
 * Auto-split from the original monolithic main.jsx.
 * Exports: ZIP_TEXT, makeCrcTable, CRC_TABLE, crc32, writeUint16, writeUint32, createStoredZip, parseStoredZip, bytesToDataUrl, dataUrlToBytes, posterMimeFromName, extensionFromMime, safePosterName
 */

export const ZIP_TEXT = new TextEncoder();

/** Builds the 256-entry CRC-32 lookup table used by crc32(). */
export function makeCrcTable() {
  const table = [];
  for (let i = 0; i < 256; i += 1) {
    let c = i;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[i] = c >>> 0;
  }
  return table;
}

export const CRC_TABLE = makeCrcTable();

/** Computes a CRC-32 checksum for a byte array, as required by the ZIP file format. */
export function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

/** Writes a little-endian 16-bit unsigned int into a DataView at the given offset. */
export function writeUint16(view, offset, value) {
  view.setUint16(offset, value, true);
}

/** Writes a little-endian 32-bit unsigned int into a DataView at the given offset. */
export function writeUint32(view, offset, value) {
  view.setUint32(offset, value >>> 0, true);
}

/** Builds an uncompressed ("stored") ZIP archive from a list of {name, bytes} files, with no external dependency. */
export function createStoredZip(files) {
  const localParts = [];
  const centralParts = [];
  let offset = 0;

  for (const file of files) {
    const nameBytes = ZIP_TEXT.encode(file.name);
    const data = file.data;
    const crc = crc32(data);
    const local = new Uint8Array(30 + nameBytes.length);
    const localView = new DataView(local.buffer);
    writeUint32(localView, 0, 0x04034b50);
    writeUint16(localView, 4, 20);
    writeUint16(localView, 6, 0);
    writeUint16(localView, 8, 0);
    writeUint16(localView, 10, 0);
    writeUint16(localView, 12, 0);
    writeUint32(localView, 14, crc);
    writeUint32(localView, 18, data.length);
    writeUint32(localView, 22, data.length);
    writeUint16(localView, 26, nameBytes.length);
    writeUint16(localView, 28, 0);
    local.set(nameBytes, 30);
    localParts.push(local, data);

    const central = new Uint8Array(46 + nameBytes.length);
    const centralView = new DataView(central.buffer);
    writeUint32(centralView, 0, 0x02014b50);
    writeUint16(centralView, 4, 20);
    writeUint16(centralView, 6, 20);
    writeUint16(centralView, 8, 0);
    writeUint16(centralView, 10, 0);
    writeUint16(centralView, 12, 0);
    writeUint16(centralView, 14, 0);
    writeUint32(centralView, 16, crc);
    writeUint32(centralView, 20, data.length);
    writeUint32(centralView, 24, data.length);
    writeUint16(centralView, 28, nameBytes.length);
    writeUint16(centralView, 30, 0);
    writeUint16(centralView, 32, 0);
    writeUint16(centralView, 34, 0);
    writeUint16(centralView, 36, 0);
    writeUint32(centralView, 38, 0);
    writeUint32(centralView, 42, offset);
    central.set(nameBytes, 46);
    centralParts.push(central);
    offset += local.length + data.length;
  }

  const centralSize = centralParts.reduce((sum, part) => sum + part.length, 0);
  const end = new Uint8Array(22);
  const endView = new DataView(end.buffer);
  writeUint32(endView, 0, 0x06054b50);
  writeUint16(endView, 8, files.length);
  writeUint16(endView, 10, files.length);
  writeUint32(endView, 12, centralSize);
  writeUint32(endView, 16, offset);
  writeUint16(endView, 20, 0);
  return new Blob([...localParts, ...centralParts, end], { type: "application/zip" });
}

/** Parses an uncompressed ZIP archive back into a list of {name, bytes} files. */
export function parseStoredZip(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const files = new Map();
  let offset = 0;
  while (offset < bytes.length - 4) {
    const signature = view.getUint32(offset, true);
    if (signature !== 0x04034b50) break;
    const method = view.getUint16(offset + 8, true);
    const compressedSize = view.getUint32(offset + 18, true);
    const uncompressedSize = view.getUint32(offset + 22, true);
    const nameLength = view.getUint16(offset + 26, true);
    const extraLength = view.getUint16(offset + 28, true);
    const nameStart = offset + 30;
    const dataStart = nameStart + nameLength + extraLength;
    const name = new TextDecoder().decode(bytes.slice(nameStart, nameStart + nameLength));
    if (method !== 0 || compressedSize !== uncompressedSize) throw new Error("This backup ZIP uses unsupported compression.");
    files.set(name, bytes.slice(dataStart, dataStart + compressedSize));
    offset = dataStart + compressedSize;
  }
  return files;
}

/** Converts a raw byte array into a base64 data: URL with the given MIME type. */
export function bytesToDataUrl(bytes, mimeType) {
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.slice(i, i + chunkSize));
  }
  return "data:" + mimeType + ";base64," + btoa(binary);
}

/** Decodes a base64 data: URL back into a raw byte array. */
export function dataUrlToBytes(dataUrl) {
  const parts = dataUrl.split(",");
  const mimeType = parts[0].match(/^data:(.*?);/)?.[1] || "application/octet-stream";
  const binary = atob(parts[1] || "");
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return { bytes, mimeType };
}

/** Guesses an image MIME type from a poster file's extension. */
export function posterMimeFromName(name) {
  if (name.endsWith(".png")) return "image/png";
  if (name.endsWith(".webp")) return "image/webp";
  return "image/jpeg";
}

/** Maps an image MIME type back to a file extension for export. */
export function extensionFromMime(mimeType) {
  if (mimeType.includes("png")) return "png";
  if (mimeType.includes("webp")) return "webp";
  return "jpg";
}

/** Builds a filesystem-safe poster filename for a disc, disambiguated by index. */
export function safePosterName(disc, index, ext) {
  const raw = String(index + 1) + "-" + (disc.id || disc.reference || disc.title);
  const base = raw.replace(/[^a-z0-9_-]+/gi, "-").replace(/^-|-$/g, "").slice(0, 80);
  return "posters/" + (base || "poster-" + (index + 1)) + "." + ext;
}
