import { describe, expect, it } from "vitest";

import { getFileKind, MISTER_FILE_KIND_REGISTRY } from "./fileKind";

describe("MiSTer file kinds", () => {
  it.each(Object.entries(MISTER_FILE_KIND_REGISTRY))("maps %s to %s", (extension, kind) => {
    expect(getFileKind({ name: `example${extension}`, path: `/media/fat/example${extension}` })).toBe(kind);
  });

  it("matches extensions without regard to case", () => {
    expect(getFileKind({ name: "CORE.RBF", path: "/media/fat/_Console/CORE.RBF" })).toBe("MiSTer Hardware Core");
  });

  it("distinguishes Markdown documents from Sega .md ROMs using their context", () => {
    expect(getFileKind({ name: "README.md", path: "/media/fat/README.md" })).toBe("Markdown Document");
    expect(getFileKind({ name: "guide.md", path: "/media/fat/docs/guide.md" })).toBe("Markdown Document");
    expect(getFileKind({ name: "Sonic.md", path: "/media/fat/games/Genesis/Sonic.md" })).toBe("Sega Game ROM");
  });

  it("keeps folders and unknown files readable", () => {
    expect(getFileKind({ name: "games", path: "/media/fat/games", is_dir: true })).toBe("folder");
    expect(getFileKind({ name: "unknown.xyz", path: "/media/fat/unknown.xyz", type: "File" })).toBe("file");
  });
});
