import { getFileKind } from "./fileKind";

export function sortFileBrowserEntries(entries = [], sortSpec = {}, foldersFirst = true) {
  const direction = sortSpec.direction === "desc" ? -1 : 1;
  const key = sortSpec.key || "name";

  return [...entries].sort((a, b) => {
    if (foldersFirst && a.is_dir !== b.is_dir) return a.is_dir ? -1 : 1;

    let left;
    let right;
    if (key === "size") {
      left = Number(a.size || 0);
      right = Number(b.size || 0);
    } else if (key === "modified") {
      left = Number(a.mtime || 0);
      right = Number(b.mtime || 0);
    } else if (key === "type") {
      left = getFileKind(a);
      right = getFileKind(b);
    } else {
      left = String(a.name || "").toLocaleLowerCase();
      right = String(b.name || "").toLocaleLowerCase();
    }

    if (typeof left === "number" && typeof right === "number") return (left - right) * direction;
    return String(left).localeCompare(String(right), undefined, { numeric: true, sensitivity: "base" }) * direction;
  });
}

export function flattenExpandedFileEntries(entries = [], expandedPaths = [], childrenByPath = {}, sortSpec = {}, foldersFirst = false) {
  const expanded = new Set(expandedPaths);
  const rows = [];

  const append = (items, depth) => {
    for (const entry of sortFileBrowserEntries(items, sortSpec, foldersFirst)) {
      rows.push({ ...entry, treeDepth: depth });
      if (entry.is_dir && expanded.has(entry.path)) append(childrenByPath[entry.path] || [], depth + 1);
    }
  };

  append(entries, 0);
  return rows;
}
