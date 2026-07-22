import { describe, expect, it } from "vitest";

import misterCompanionClassicPreset from "./presets/misterCompanionClassic.json";
import misterCompanionExPreset from "./presets/misterCompanionEx.json";
import { DEFAULT_THEME, RAW_THEME_PRESETS } from "./themePresets";
import { MACOS_PLATINUM_THEME } from "./specialThemePresets";
import { PLATINUM_COLOR_GROUPS } from "./themeOptions";
import { THEME_PRESETS, themeStyle } from "./themeUtils";

describe("standard theme presets", () => {
  it("uses MiSTer Companion EX as the default theme", () => {
    expect(DEFAULT_THEME).toMatchObject(misterCompanionExPreset.theme);
    expect(DEFAULT_THEME.appStyle).toBe("gnome");
  });

  it("bundles both MiSTer Companion presets and removes LaserVault Classic", () => {
    const rawNames = RAW_THEME_PRESETS.map((preset) => preset.name);
    const hydratedNames = THEME_PRESETS.map((preset) => preset.name);

    expect(rawNames.slice(0, 2)).toEqual(["MiSTer Companion EX", "MiSTer Companion Classic"]);
    expect(hydratedNames).toContain("MiSTer Companion EX");
    expect(hydratedNames).toContain("MiSTer Companion Classic");
    expect(hydratedNames).not.toContain("LaserVault Classic");
    expect(RAW_THEME_PRESETS[1].theme).toEqual(misterCompanionClassicPreset.theme);
  });

  it("publishes configurable Platinum color and bitmap filter tokens", () => {
    const neutral = themeStyle(MACOS_PLATINUM_THEME);
    expect(neutral["--mac9-body-text-color"]).toBe("#202020");
    expect(neutral["--mac9-row-hover-background-color"]).toBe("#50202020");
    expect(neutral["--mac9-row-hover-text-color"]).toBe("#202020");
    expect(neutral["--mac9-selected-column-alternate-background-color"]).toBe("#bbbbbb");
    expect(neutral["--mac9-selected-column-hover-text-color"]).toBe("#202020");
    expect(neutral["--mac9-asset-filter-effective"]).toBe("none");

    const colorized = themeStyle({
      ...MACOS_PLATINUM_THEME,
      mac9AssetColorizeEnabled: true,
      mac9AssetHueRotate: "210deg",
      mac9AssetSaturation: "140%",
      mac9AssetBrightness: "90%",
      mac9AssetContrast: "110%",
    });
    expect(colorized["--mac9-asset-filter-effective"]).toBe("sepia(100%) hue-rotate(210deg) saturate(140%) brightness(90%) contrast(110%)");
  });

  it("exposes each Platinum color control exactly once with a default", () => {
    const keys = PLATINUM_COLOR_GROUPS.flatMap(([, fields]) => fields.map(([key]) => key));
    expect(new Set(keys).size).toBe(keys.length);
    keys.forEach((key) => expect(DEFAULT_THEME, key).toHaveProperty(key));
  });
});
