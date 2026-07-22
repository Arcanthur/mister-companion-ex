import { describe, expect, it } from "vitest";

import { flattenExpandedFileEntries, sortFileBrowserEntries } from "./fileBrowserTree";

const folder = (name, path) => ({ name, path, is_dir: true });
const file = (name, path) => ({ name, path, is_dir: false });

describe("Finder-style file tree", () => {
  it("keeps Finder name sorting instead of grouping every folder first", () => {
    const entries = [folder("ColorSync Profiles", "/ColorSync Profiles"), file("Clipboard", "/Clipboard")];
    expect(sortFileBrowserEntries(entries, { key: "name", direction: "asc" }, false).map((entry) => entry.name))
      .toEqual(["Clipboard", "ColorSync Profiles"]);
  });

  it("places expanded descendants directly beneath their folder at the correct depth", () => {
    const entries = [folder("System Folder", "/System Folder"), file("Welcome", "/Welcome")];
    const children = {
      "/System Folder": [folder("Control Panels", "/System Folder/Control Panels"), file("Finder", "/System Folder/Finder")],
      "/System Folder/Control Panels": [file("Appearance", "/System Folder/Control Panels/Appearance")],
    };

    const rows = flattenExpandedFileEntries(
      entries,
      ["/System Folder", "/System Folder/Control Panels"],
      children,
      { key: "name", direction: "asc" },
    );

    expect(rows.map(({ name, treeDepth }) => [name, treeDepth])).toEqual([
      ["System Folder", 0],
      ["Control Panels", 1],
      ["Appearance", 2],
      ["Finder", 1],
      ["Welcome", 0],
    ]);
  });

  it("sorts the Kind column by the displayed MiSTer file kind", () => {
    const entries = [
      file("game.zip", "/media/fat/games/game.zip"),
      file("settings.ini", "/media/fat/config/settings.ini"),
      file("core.rbf", "/media/fat/_Console/core.rbf"),
    ];
    expect(sortFileBrowserEntries(entries, { key: "type", direction: "asc" }, false).map((entry) => entry.name))
      .toEqual(["game.zip", "settings.ini", "core.rbf"]);
  });

  it("optionally groups folders before files at every expanded level", () => {
    const entries = [file("Alpha", "/Alpha"), folder("Zulu", "/Zulu")];
    const children = {
      "/Zulu": [file("Beta", "/Zulu/Beta"), folder("Omega", "/Zulu/Omega")],
    };
    const rows = flattenExpandedFileEntries(entries, ["/Zulu"], children, { key: "name", direction: "asc" }, true);
    expect(rows.map((entry) => entry.path)).toEqual(["/Zulu", "/Zulu/Omega", "/Zulu/Beta", "/Alpha"]);
  });
});
