import { describe, expect, it } from "vitest";
import { MISTER_APP_CONFIG, misterThemeAssetUrl } from "./appConfig";

describe("misterThemeAssetUrl", () => {
  it("normalizes separators and encodes individual path segments", () => {
    expect(misterThemeAssetUrl("/macos9\\control close.svg"))
      .toBe("mister-vaultkit-media://asset/macos9/control%20close.svg");
  });

  it("returns the asset root for an empty path", () => {
    expect(misterThemeAssetUrl("")).toBe("mister-vaultkit-media://asset/");
  });
});

describe("MISTER_APP_CONFIG", () => {
  it("has unique page identifiers and a valid initial page", () => {
    const pageIds = MISTER_APP_CONFIG.sidebar.flatMap((section) => section.items.map((item) => item.id));

    expect(new Set(pageIds).size).toBe(pageIds.length);
    expect(pageIds).toContain(MISTER_APP_CONFIG.initialPage);
  });
});
