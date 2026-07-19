import { describe, expect, it } from "vitest";
import { healthDuplicateKey, selectedCover, selectedCoverLarge, splitCsv } from "./discUtils";

describe("disc utilities", () => {
  it("splits and trims comma-separated values", () => {
    expect(splitCsv("THX, CAV, , AC3")).toEqual(["THX", "CAV", "AC3"]);
  });

  it("selects covers according to the requested source", () => {
    const disc = {
      lddbCover: "lddb-small.jpg",
      lddbCoverSourceType: "remote",
      tmdb: { poster: "tmdb-small.jpg", posterLarge: "tmdb-large.jpg" },
    };

    expect(selectedCover(disc, "lddb")).toBe("lddb-small.jpg");
    expect(selectedCover(disc, "local")).toBe("tmdb-small.jpg");
    expect(selectedCoverLarge(disc, "tmdb")).toBe("tmdb-large.jpg");
  });

  it("builds stable duplicate keys using the strongest available identifier", () => {
    expect(healthDuplicateKey({ libraryId: "laserdisc", upc: "0-1234-5678" }))
      .toBe("laserdisc:upc:012345678");
    expect(healthDuplicateKey({ libraryId: "laserdisc", reference: "  PILF-1234 " }))
      .toBe("laserdisc:reference:pilf-1234");
    expect(healthDuplicateKey({ libraryId: "wishlist", title: "The Thing!", year: 1982 }))
      .toBe("wishlist:title:the thing :1982");
  });
});
